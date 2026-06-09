export const AUDIO_FILE_STATUS = {
  ignored: 'ignored',
  present: 'present',
  missing: 'missing',
  unverified: 'unverified',
};

export const AUDIO_QUESTION_IDS = ['mainInsight', 'newShopLocation'];

const normalize = (value) => String(value ?? '').trim();

const stripHtml = (value) =>
  normalize(value)
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/\s+/g, ' ')
    .trim();

export function hasClaimedAudio(record) {
  const value = normalize(record?.TemGravacoes).toLowerCase();
  return value === 'sim' || value === 'yes' || value === 'true';
}

export function parseAudioQuestionIds(value) {
  return stripHtml(value)
    .split(/[,\n;]/)
    .map(part => part.trim())
    .filter(Boolean);
}

export function getAudioRecordKey(record) {
  const province = normalize(record?._province || record?.Provincia);
  const id = normalize(record?.Id ?? record?.ID ?? record?.id);
  return `${province}:${id}`;
}

export function audioFileMatchesQuestion(fileName, questionId) {
  const name = normalize(fileName).toLowerCase();
  const question = normalize(questionId).toLowerCase();
  if (!name || !question) return false;

  return (
    name === question ||
    name.startsWith(`${question}_`) ||
    name.startsWith(`${question}.`) ||
    name.includes(`_${question}_`) ||
    name.includes(`_${question}.`)
  );
}

export function getRecognizedAudioQuestionIds(attachments = [], questionIds = AUDIO_QUESTION_IDS) {
  return questionIds.filter(questionId =>
    attachments.some(att => audioFileMatchesQuestion(att?.FileName || att?.fileName || att?.name, questionId))
  );
}

export function getSurveyAudioFileStatus(record, { attachments = [], error = null } = {}) {
  if (!hasClaimedAudio(record)) {
    return { status: AUDIO_FILE_STATUS.ignored, expectedCount: 0, presentCount: 0, missingQuestionIds: [] };
  }

  if (error) {
    return { status: AUDIO_FILE_STATUS.unverified, expectedCount: 0, presentCount: 0, missingQuestionIds: [] };
  }

  const safeAttachments = Array.isArray(attachments) ? attachments : [];
  const expectedQuestionIds = parseAudioQuestionIds(record?.CamposComGravacao);

  if (expectedQuestionIds.length === 0) {
    const recognized = getRecognizedAudioQuestionIds(safeAttachments);
    return {
      status: recognized.length > 0 ? AUDIO_FILE_STATUS.present : AUDIO_FILE_STATUS.missing,
      expectedCount: recognized.length,
      presentCount: recognized.length,
      missingQuestionIds: recognized.length > 0 ? [] : AUDIO_QUESTION_IDS,
    };
  }

  const presentQuestionIds = expectedQuestionIds.filter(questionId =>
    safeAttachments.some(att => audioFileMatchesQuestion(att?.FileName || att?.fileName || att?.name, questionId))
  );
  const missingQuestionIds = expectedQuestionIds.filter(questionId => !presentQuestionIds.includes(questionId));

  return {
    status: missingQuestionIds.length > 0 ? AUDIO_FILE_STATUS.missing : AUDIO_FILE_STATUS.present,
    expectedCount: expectedQuestionIds.length,
    presentCount: presentQuestionIds.length,
    missingQuestionIds,
  };
}

export function summarizeAudioFileStatuses(records = [], statusByKey = {}) {
  return records.reduce((summary, record) => {
    if (!hasClaimedAudio(record)) return summary;

    summary.total += 1;
    const status = statusByKey[getAudioRecordKey(record)]?.status;
    if (status === AUDIO_FILE_STATUS.present) summary.present += 1;
    else if (status === AUDIO_FILE_STATUS.missing) summary.missing += 1;
    else if (status === AUDIO_FILE_STATUS.unverified) summary.unverified += 1;
    else summary.pending += 1;
    return summary;
  }, { total: 0, present: 0, missing: 0, unverified: 0, pending: 0 });
}
