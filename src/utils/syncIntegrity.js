export const SYNC_SCHEMA_VERSION = 2;

const textEncoder = new TextEncoder();

function normalizeForHash(value) {
  if (value === undefined) return null;
  if (value === null || typeof value !== 'object') return value;
  if (value instanceof Blob) {
    return {
      __blob: true,
      size: value.size,
      type: value.type,
    };
  }
  if (Array.isArray(value)) return value.map(normalizeForHash);

  return Object.keys(value)
    .sort()
    .reduce((acc, key) => {
      acc[key] = normalizeForHash(value[key]);
      return acc;
    }, {});
}

export function stableStringify(value) {
  return JSON.stringify(normalizeForHash(value));
}

function fallbackHashHex(input) {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < input.length; i++) {
    const ch = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return `${(h2 >>> 0).toString(16).padStart(8, '0')}${(h1 >>> 0).toString(16).padStart(8, '0')}`;
}

function bufferToHex(buffer) {
  return [...new Uint8Array(buffer)]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function hashText(value) {
  const input = String(value ?? '');
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) return fallbackHashHex(input);
  const digest = await subtle.digest('SHA-256', textEncoder.encode(input));
  return bufferToHex(digest);
}

export async function hashBlob(blob) {
  if (!blob) return '';
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) return fallbackHashHex(`${blob.type}:${blob.size}:${await blob.text()}`);
  const digest = await subtle.digest('SHA-256', await blob.arrayBuffer());
  return bufferToHex(digest);
}

export async function buildPayloadChecksum(surveyData) {
  return hashText(stableStringify(surveyData || {}));
}

export async function buildAudioManifestFromRecordings(audioRecordings = {}) {
  const entries = [];
  for (const [questionId, recording] of Object.entries(audioRecordings)) {
    const blob = recording?.blob;
    if (!blob) continue;
    entries.push({
      questionId,
      mimeType: blob.type || '',
      sizeBytes: blob.size || 0,
      hash: await hashBlob(blob),
      status: 'pending',
    });
  }
  return entries.sort((a, b) => a.questionId.localeCompare(b.questionId));
}

export async function buildAudioManifestFromBlobs(blobs = []) {
  const entries = [];
  for (const row of blobs) {
    if (!row?.blob) continue;
    entries.push({
      questionId: row.questionId,
      mimeType: row.mimeType || row.blob.type || '',
      sizeBytes: row.sizeBytes || row.blob.size || 0,
      hash: row.hash || await hashBlob(row.blob),
      status: row.status || 'pending',
    });
  }
  return entries.sort((a, b) => String(a.questionId).localeCompare(String(b.questionId)));
}

export function filterAudioManifest(audioManifest = [], questionIds = new Set()) {
  return (audioManifest || []).filter((entry) => questionIds.has(entry.questionId));
}

export function getSubmissionMetadata(survey, overrides = {}) {
  const data = survey?.data || {};
  const responses = data.responses || {};
  const metadata = data.metadata || {};
  return {
    surveyId: survey?.surveyId || metadata.surveyId || '',
    surveyorId: metadata.interviewerName || '',
    province: survey?.province || responses.province || '',
    municipality: responses.municipality || '',
    createdAt: survey?.createdAt || metadata.completedAt || new Date().toISOString(),
    syncStatus: overrides.syncStatus || (survey?.status === 'synced' ? 'synced' : 'local'),
    syncedAt: overrides.syncedAt ?? survey?.syncedAt ?? null,
    spItemId: overrides.spItemId ?? survey?.spItemId ?? null,
    listName: overrides.listName ?? survey?.listName ?? null,
    payloadChecksum: survey?.payloadChecksum || '',
  };
}
