class AudioService {
  getSupportedMimeType() {
    return [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/mp4',
    ].find(t => MediaRecorder.isTypeSupported(t)) || '';
  }

  getRecorderOptions() {
    const mimeType = this.getSupportedMimeType();
    return {
      ...(mimeType ? { mimeType } : {}),
      audioBitsPerSecond: 32000, // 32 kbps — clear speech, ~4 KB/s (vs ~170 KB/s WAV)
    };
  }

  // Returns the actual mimeType that will be used (from options or recorder fallback)
  resolveMimeType(options, mediaRecorder) {
    return options.mimeType || mediaRecorder.mimeType || 'audio/webm';
  }

  getFileExtension(mimeType) {
    if (!mimeType) return 'webm';
    if (mimeType.includes('ogg')) return 'ogg';
    if (mimeType.includes('mp4')) return 'm4a';
    return 'webm';
  }

  // Estimate compressed audio size in bytes (32 kbps Opus ≈ 4000 B/s)
  estimateSizeBytes(durationSeconds) {
    return durationSeconds * 4000;
  }
}

export const audioService = new AudioService();
