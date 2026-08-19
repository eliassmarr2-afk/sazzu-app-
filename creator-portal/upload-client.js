const TUS_CLIENT_URL = 'https://esm.sh/tus-js-client@4.3.1';
const MAX_VIDEO_BYTES = 250 * 1024 * 1024;
const TUS_CHUNK_BYTES = 6 * 1024 * 1024;

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

  const endpoint = String(uploadContext.endpoint || '');
  const signatureToken = String(uploadContext.signature_token || '');
  const signatureHeader = String(uploadContext.signature_header || 'x-signature');
  const bucketName = String(uploadContext.bucket_name || '');
  const objectName = String(uploadContext.object_name || '');
  const contentType = String(uploadContext.content_type || inferPciVideoMime(file) || '');
  const versionId = String(reservation?.submission_version_id || '');

  if (!endpoint || !signatureToken || !bucketName || !objectName || !contentType || !versionId) {
    throw new Error('pci_upload_context_invalid');
  }

  const tus = await import(TUS_CLIENT_URL);

  return new Promise((resolve, reject) => {
    const upload = new tus.Upload(file, {
      endpoint,
      retryDelays: [0, 3000, 5000, 10000, 20000],
      headers: {
        [signatureHeader]: signatureToken,
        'x-upsert': 'false',
      },
      metadata: {
        bucketName,
        objectName,
        contentType,
        cacheControl: '3600',
      },
      uploadDataDuringCreation: true,
      removeFingerprintOnSuccess: true,
      chunkSize: Number(uploadContext.chunk_size_bytes) || TUS_CHUNK_BYTES,
      fingerprint: async () => `pci:${versionId}:${file.name}:${file.size}:${file.lastModified}`,
      onError(error) {
        onStatus?.('error');
        reject(error instanceof Error ? error : new Error('pci_tus_upload_failed'));
      },
      onProgress(bytesUploaded, bytesTotal) {
        onStatus?.('uploading');
        onProgress?.(bytesUploaded, bytesTotal);
      },
      onSuccess() {
        onStatus?.('uploaded');
        resolve({ url: upload.url || null });
      },
    });

    const abort = () => {
      upload.abort(false).finally(() => reject(new DOMException('Upload aborted', 'AbortError')));
    };
    signal?.addEventListener('abort', abort, { once: true });

    upload.findPreviousUploads()
      .then((previousUploads) => {
        if (signal?.aborted) return;
        if (previousUploads.length) {
          upload.resumeFromPreviousUpload(previousUploads[0]);
          onStatus?.('resuming');
        }
        upload.start();
      })
      .catch((error) => reject(error instanceof Error ? error : new Error('pci_tus_resume_lookup_failed')));
  });
}

export const PCI_VIDEO_MAX_BYTES = MAX_VIDEO_BYTES;