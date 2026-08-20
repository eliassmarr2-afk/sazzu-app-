const MAX_VIDEO_BYTES = 250 * 1024 * 1024;
const TUS_CHUNK_BYTES = 6 * 1024 * 1024;
const TUS_VERSION = '1.0.0';

export function inferPciVideoMime(file) {
  const reported = String(file?.type ?? '').trim().toLowerCase();
  if (reported === 'video/mp4' || reported === 'video/quicktime') return reported;
  const name = String(file?.name ?? '').trim().toLowerCase();
  if (name.endsWith('.mp4')) return 'video/mp4';
  if (name.endsWith('.mov')) return 'video/quicktime';
  return null;
}

export function validatePciVideoFile(file) {
  if (!(file instanceof File)) return { ok: false, code: 'pci_upload_file_required' };
  const mimeType = inferPciVideoMime(file);
  if (!mimeType) return { ok: false, code: 'pci_video_mime_not_allowed' };
  if (!Number.isFinite(file.size) || file.size <= 0) return { ok: false, code: 'pci_video_size_invalid' };
  if (file.size > MAX_VIDEO_BYTES) return { ok: false, code: 'pci_video_size_invalid' };
  return { ok: true, mimeType };
}

export function formatUploadBytes(bytes) {
  const value = Number(bytes) || 0;
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  if (value < 1024 * 1024 * 1024) return `${(value / (1024 * 1024)).toFixed(1)} MB`;
  return `${(value / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export async function readVideoMetadata(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;

    const cleanup = () => {
      URL.revokeObjectURL(url);
      video.removeAttribute('src');
      video.load();
    };

    const fail = () => {
      cleanup();
      reject(new Error('pci_video_metadata_unavailable'));
    };

    video.addEventListener('loadedmetadata', () => {
      const duration = Number(video.duration);
      const width = Number(video.videoWidth);
      const height = Number(video.videoHeight);
      cleanup();
      if (!Number.isFinite(duration) || duration < 0 || !Number.isInteger(width) || width <= 0 || !Number.isInteger(height) || height <= 0) {
        reject(new Error('pci_video_metadata_unavailable'));
        return;
      }
      resolve({ duration_seconds: duration, width, height });
    }, { once: true });
    video.addEventListener('error', fail, { once: true });
    video.src = url;
  });
}

export function hashVideoFile(file, { onProgress } = {}) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./hash-worker.js', import.meta.url), { type: 'module' });
    const cleanup = () => worker.terminate();

    worker.addEventListener('message', (event) => {
      const message = event.data ?? {};
      if (message.type === 'progress') {
        onProgress?.(Number(message.processed_bytes) || 0, Number(message.total_bytes) || file.size);
        return;
      }
      if (message.type === 'done') {
        cleanup();
        resolve(String(message.sha256 || '').toLowerCase());
        return;
      }
      if (message.type === 'error') {
        cleanup();
        reject(new Error(String(message.code || 'pci_hash_failed')));
      }
    });
    worker.addEventListener('error', () => {
      cleanup();
      reject(new Error('pci_hash_worker_failed'));
    }, { once: true });

    worker.postMessage({ file, chunk_size_bytes: 4 * 1024 * 1024 });
  });
}

function encodeTusMetadata(value) {
  const bytes = new TextEncoder().encode(String(value ?? ''));
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function buildTusMetadata({ bucketName, objectName, contentType }) {
  return [
    ['bucketName', bucketName],
    ['objectName', objectName],
    ['contentType', contentType],
    ['cacheControl', '3600'],
  ].map(([key, value]) => `${key} ${encodeTusMetadata(value)}`).join(',');
}

function tusUploadUrlKey(versionId) {
  return `pci:tus-upload-url:${versionId}`;
}

function loadTusUploadUrl(versionId) {
  try { return localStorage.getItem(tusUploadUrlKey(versionId)) || null; } catch { return null; }
}

function saveTusUploadUrl(versionId, url) {
  try { localStorage.setItem(tusUploadUrlKey(versionId), url); } catch { /* best effort */ }
}

function clearTusUploadUrl(versionId) {
  try { localStorage.removeItem(tusUploadUrlKey(versionId)); } catch { /* best effort */ }
}

function tusHeaders(signatureHeader, signatureToken) {
  return {
    'Tus-Resumable': TUS_VERSION,
    [signatureHeader]: signatureToken,
    'x-upsert': 'false',
  };
}

function tusHttpError(code, response) {
  const error = new Error(code);
  error.http_status = Number(response?.status) || 0;
  return error;
}

async function getExistingTusOffset(uploadUrl, signatureHeader, signatureToken, signal) {
  const response = await fetch(uploadUrl, {
    method: 'HEAD',
    headers: tusHeaders(signatureHeader, signatureToken),
    signal,
  });

  if (response.status === 404 || response.status === 410) return null;
  if (!response.ok) throw tusHttpError('pci_tus_head_failed', response);

  const offset = Number(response.headers.get('Upload-Offset'));
  if (!Number.isFinite(offset) || offset < 0) throw new Error('pci_tus_offset_invalid');
  return offset;
}

async function createTusUpload({ endpoint, file, bucketName, objectName, contentType, signatureHeader, signatureToken, signal }) {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      ...tusHeaders(signatureHeader, signatureToken),
      'Upload-Length': String(file.size),
      'Upload-Metadata': buildTusMetadata({ bucketName, objectName, contentType }),
    },
    signal,
  });

  if (!response.ok) throw tusHttpError('pci_tus_create_failed', response);

  const location = response.headers.get('Location');
  if (!location) throw new Error('pci_tus_location_missing');
  return new URL(location, endpoint).toString();
}

async function patchTusUpload({ uploadUrl, file, startOffset, chunkSize, signatureHeader, signatureToken, signal, onProgress, onStatus }) {
  let offset = startOffset;
  const total = file.size;
  onStatus?.(offset > 0 ? 'resuming' : 'uploading');
  onProgress?.(offset, total);

  while (offset < total) {
    if (signal?.aborted) throw new DOMException('Upload aborted', 'AbortError');

    const end = Math.min(total, offset + chunkSize);
    const body = file.slice(offset, end);
    const response = await fetch(uploadUrl, {
      method: 'PATCH',
      headers: {
        ...tusHeaders(signatureHeader, signatureToken),
        'Upload-Offset': String(offset),
        'Content-Type': 'application/offset+octet-stream',
      },
      body,
      signal,
    });

    if (!response.ok) throw tusHttpError('pci_tus_patch_failed', response);

    const nextOffset = Number(response.headers.get('Upload-Offset'));
    if (!Number.isFinite(nextOffset) || nextOffset <= offset || nextOffset > total) {
      throw new Error('pci_tus_offset_invalid');
    }

    offset = nextOffset;
    onStatus?.('uploading');
    onProgress?.(offset, total);
  }
}

export async function uploadSignedTus(file, reservation, { onProgress, onStatus, signal } = {}) {
  const uploadContext = reservation?.upload ?? {};
  if (uploadContext.protocol !== 'tus') throw new Error('pci_upload_protocol_invalid');

  if (String(uploadContext.endpoint || '').startsWith('demo://')) {
    const total = file.size || 1;
    let uploaded = 0;
    onStatus?.('uploading');
    while (uploaded < total) {
      if (signal?.aborted) throw new DOMException('Upload aborted', 'AbortError');
      await new Promise((resolve) => setTimeout(resolve, 90));
      uploaded = Math.min(total, uploaded + Math.max(Math.ceil(total / 18), 1));
      onProgress?.(uploaded, total);
    }
    onStatus?.('uploaded');
    return { url: 'demo://uploaded' };
  }

  const rawEndpoint = String(uploadContext.endpoint || '').replace(/\/+$/, '');
  const signatureToken = String(uploadContext.signature_token || '');
  const signatureHeader = String(uploadContext.signature_header || 'x-signature');
  const endpoint = signatureToken && !rawEndpoint.endsWith('/sign') ? `${rawEndpoint}/sign` : rawEndpoint;
  const bucketName = String(uploadContext.bucket_name || '');
  const objectName = String(uploadContext.object_name || '');
  const contentType = String(uploadContext.content_type || inferPciVideoMime(file) || '');
  const versionId = String(reservation?.submission_version_id || '');
  const chunkSize = Number(uploadContext.chunk_size_bytes) || TUS_CHUNK_BYTES;

  if (!endpoint || !signatureToken || !bucketName || !objectName || !contentType || !versionId) {
    throw new Error('pci_upload_context_invalid');
  }

  let uploadUrl = loadTusUploadUrl(versionId);
  let offset = null;

  if (uploadUrl) {
    offset = await getExistingTusOffset(uploadUrl, signatureHeader, signatureToken, signal);
    if (offset == null) {
      clearTusUploadUrl(versionId);
      uploadUrl = null;
    } else {
      onStatus?.('resuming');
    }
  }

  if (!uploadUrl) {
    uploadUrl = await createTusUpload({
      endpoint,
      file,
      bucketName,
      objectName,
      contentType,
      signatureHeader,
      signatureToken,
      signal,
    });
    saveTusUploadUrl(versionId, uploadUrl);
    offset = 0;
  }

  await patchTusUpload({
    uploadUrl,
    file,
    startOffset: Number(offset) || 0,
    chunkSize,
    signatureHeader,
    signatureToken,
    signal,
    onProgress,
    onStatus,
  });

  clearTusUploadUrl(versionId);
  onStatus?.('uploaded');
  return { url: uploadUrl };
}

export const PCI_VIDEO_MAX_BYTES = MAX_VIDEO_BYTES;