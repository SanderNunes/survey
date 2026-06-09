import { audioService } from '@/services/audioService';
import {
  buildPreLaunchSharePointItemData,
  getPreLaunchSurveyId,
} from '@/services/preLaunchSurveyMapper';
import {
  getSupabaseClient,
  getSupabaseMirrorConfig,
  isSupabaseMirrorEnabled,
} from './client';
import { buildAudioManifestFromRecordings } from '@/utils/syncIntegrity';

export class SupabaseMirrorError extends Error {
  constructor(message, cause) {
    super(message);
    this.name = 'SupabaseMirrorError';
    this.cause = cause;
    this.retryable = true;
  }
}

function isDuplicateError(error) {
  const text = `${error?.code || ''} ${error?.message || ''}`.toLowerCase();
  return error?.code === '23505' || text.includes('duplicate key') || text.includes('already exists');
}

function isStorageConflict(error) {
  const text = `${error?.statusCode || ''} ${error?.status || ''} ${error?.message || ''}`.toLowerCase();
  return text.includes('409') || text.includes('already exists') || text.includes('duplicate');
}

function sanitizeSegment(value, fallback = 'unknown') {
  const cleaned = String(value || fallback)
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
  return cleaned || fallback;
}

export function buildSupabaseAudioPath({ province, surveyId, questionId, hash, mimeType }) {
  const ext = audioService.getFileExtension(mimeType || '') || 'webm';
  const safeProvince = sanitizeSegment(province, 'unknown-province');
  const safeSurveyId = sanitizeSegment(surveyId, 'unknown-survey');
  const safeQuestionId = sanitizeSegment(questionId, 'unknown-question');
  const safeHash = sanitizeSegment(hash || 'nohash', 'nohash').slice(0, 64);
  return `prelaunch/${safeProvince}/${safeSurveyId}/${safeQuestionId}-${safeHash}.${ext}`;
}

async function insertIgnoringDuplicate(client, table, row) {
  const { error } = await client.from(table).insert(row);
  if (!error || isDuplicateError(error)) return;
  throw error;
}

function buildSurveyMirrorUpdate(row) {
  return {
    sharepoint_item_id: row.sharepoint_item_id,
    sharepoint_list_name: row.sharepoint_list_name,
    has_audio: row.has_audio,
    audio_question_ids: row.audio_question_ids,
    status: row.status,
    is_duplicate: row.is_duplicate,
    duplicate_phone: row.duplicate_phone,
    metadata: row.metadata,
    sharepoint_fields: row.sharepoint_fields,
    sharepoint_receipt: row.sharepoint_receipt,
  };
}

async function updateSharePointReceipt(client, row) {
  const { error } = await client
    .from('survey_submissions')
    .update(buildSurveyMirrorUpdate(row))
    .eq('survey_id', row.survey_id);
  if (error) throw error;
}

async function uploadIgnoringConflict(client, bucket, path, blob) {
  const { error } = await client.storage.from(bucket).upload(path, blob, {
    contentType: blob.type || 'application/octet-stream',
    upsert: false,
  });
  if (!error || isStorageConflict(error)) return;
  throw error;
}

function buildSurveyMirrorRow({ surveyData, itemData, sharePoint }) {
  const responses = surveyData?.responses || {};
  const customInputs = surveyData?.customInputs || {};
  const metadata = surveyData?.metadata || {};
  const surveyId = getPreLaunchSurveyId(surveyData);
  const audioQuestionIds = Object.keys(surveyData?.audioRecordings || {})
    .filter((questionId) => !!surveyData.audioRecordings?.[questionId]?.blob);

  return {
    source: 'prelaunch',
    survey_id: surveyId,
    sharepoint_item_id: sharePoint?.itemId ?? null,
    sharepoint_list_name: sharePoint?.listName || null,
    province: responses.province || itemData?.Provincia || '',
    municipality: responses.municipality || itemData?.Municipio || '',
    interviewer_name: metadata.interviewerName || itemData?.NomeEntrevistador || '',
    fingerprint: metadata.fingerprint || surveyData?.fingerprint || itemData?.Fingerprint || '',
    phone_number: responses.phoneNumber || itemData?.NumeroTelefone || '',
    submitted_at: itemData?.DataPreenchimento || metadata.completedAt || new Date().toISOString(),
    has_audio: audioQuestionIds.length > 0,
    audio_question_ids: audioQuestionIds,
    status: sharePoint
      ? (sharePoint.audioUploadResult?.hasFailures ? 'audio_pending' : 'synced_to_sharepoint')
      : 'synced_to_supabase',
    is_duplicate: !!sharePoint?.isDuplicate,
    duplicate_phone: !!itemData?.Duplicado,
    responses,
    custom_inputs: customInputs,
    metadata,
    sharepoint_fields: itemData || {},
    sharepoint_receipt: sharePoint
      ? {
          itemId: sharePoint.itemId ?? null,
          listName: sharePoint.listName || null,
          isDuplicate: !!sharePoint.isDuplicate,
          audioUploadResult: sharePoint.audioUploadResult || null,
        }
      : {},
  };
}

function parseJsonObject(value) {
  if (!value) return {};
  if (typeof value === 'object') return value;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

async function mirrorAudioFiles({ client, bucket, surveyData, itemData }) {
  const surveyId = getPreLaunchSurveyId(surveyData);
  const province = surveyData?.responses?.province || itemData?.Provincia || '';
  const manifest = await buildAudioManifestFromRecordings(surveyData?.audioRecordings || {});

  for (const entry of manifest) {
    const recording = surveyData.audioRecordings?.[entry.questionId];
    if (!recording?.blob) continue;

    const storagePath = buildSupabaseAudioPath({
      province,
      surveyId,
      questionId: entry.questionId,
      hash: entry.hash,
      mimeType: entry.mimeType,
    });

    await uploadIgnoringConflict(client, bucket, storagePath, recording.blob);
    await insertIgnoringDuplicate(client, 'survey_audio_files', {
      survey_id: surveyId,
      question_id: entry.questionId,
      storage_bucket: bucket,
      storage_path: storagePath,
      mime_type: entry.mimeType,
      size_bytes: entry.sizeBytes,
      content_hash: entry.hash,
      status: 'uploaded',
      uploaded_at: new Date().toISOString(),
    });
  }
}

export async function mirrorPreLaunchSurveyToSupabase({ surveyData, itemData, sharePoint }) {
  if (!isSupabaseMirrorEnabled()) {
    return { success: true, skipped: true };
  }

  const client = getSupabaseClient();
  const { audioBucket } = getSupabaseMirrorConfig();
  const resolvedItemData = itemData || buildPreLaunchSharePointItemData(surveyData);
  const surveyId = getPreLaunchSurveyId(surveyData);

  if (!surveyId) {
    throw new SupabaseMirrorError('Supabase sync requires survey_id.');
  }

  try {
    const surveyRow = buildSurveyMirrorRow({
      surveyData,
      itemData: resolvedItemData,
      sharePoint,
    });
    await insertIgnoringDuplicate(client, 'survey_submissions', surveyRow);
    if (sharePoint) await updateSharePointReceipt(client, surveyRow);
    await mirrorAudioFiles({ client, bucket: audioBucket, surveyData, itemData: resolvedItemData });
    return { success: true };
  } catch (error) {
    throw new SupabaseMirrorError(error?.message || 'Supabase survey sync failed.', error);
  }
}

function buildAuditMirrorRow(log) {
  return {
    log_id: log.logId,
    survey_id: log.surveyId || '',
    surveyor_id: log.surveyorId || '',
    action_type: log.actionType || '',
    action_timestamp: log.timestamp || new Date().toISOString(),
    network_status: log.networkStatus || '',
    sync_status: 'synced_to_sharepoint',
    error_details: log.errorDetails || '',
    app_version: log.appVersion || '',
    region: log.region || '',
    province: log.province || '',
    form_type: log.formType || '',
    retry_count: log.retryCount || 0,
    created_from_offline: log.networkStatus === 'offline',
    device_info: log.deviceInfo || '',
    raw_metadata_json: parseJsonObject(log.metadata),
  };
}

export async function mirrorAuditLogsToSupabase(logs = []) {
  if (!isSupabaseMirrorEnabled() || logs.length === 0) {
    return logs.map((log) => ({ id: log.id, success: true, skipped: true }));
  }

  const client = getSupabaseClient();
  const results = [];

  for (const log of logs) {
    try {
      await insertIgnoringDuplicate(client, 'survey_audit_logs', buildAuditMirrorRow(log));
      results.push({ id: log.id, success: true });
    } catch (error) {
      results.push({ id: log.id, success: false, error: error?.message || 'Supabase audit mirror failed.' });
    }
  }

  return results;
}
