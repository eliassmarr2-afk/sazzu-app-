const HASH_WASM_URL = 'https://esm.sh/hash-wasm@4.12.0';

self.addEventListener('message', async (event) => {
  const file = event.data?.file;
  const chunkSize = Number(event.data?.chunk_size_bytes) || 4 * 1024 * 1024;

  try {
    if (!(file instanceof File) || !Number.isFinite(file.size) || file.size <= 0) {
      self.postMessage({ type: 'error', code: 'pci_hash_file_invalid' });
      return;
    }

    const { createSHA256 } = await import(HASH_WASM_URL);
    const hasher = await createSHA256();
    hasher.init();

    let offset = 0;
    while (offset < file.size) {
      const end = Math.min(offset + chunkSize, file.size);
      const buffer = await file.slice(offset, end).arrayBuffer();
      hasher.update(new Uint8Array(buffer));
      offset = end;
      self.postMessage({
        type: 'progress',
        processed_bytes: offset,
        total_bytes: file.size,
      });
    }

    self.postMessage({ type: 'done', sha256: hasher.digest('hex') });
  } catch (error) {
    self.postMessage({
      type: 'error',
      code: 'pci_hash_failed',
      message: error instanceof Error ? error.message : String(error),
    });
  }
});