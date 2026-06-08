import { getPreLaunchListName } from '@/config/preLaunchSurvey';
import { buildPreLaunchSharePointItemData } from '@/services/preLaunchSurveyMapper';
import { mirrorPreLaunchSurveyToSupabase } from '@/services/supabase/mirror.service';

const PRELAUNCH_OPTIONAL_SAVE_FIELDS = new Set([
  'DuracaoInquerito',
  'NomeEntrevistador',
  'DataPreenchimento',
  'StatusInquerito',
  'Duplicado',
  'TemGravacoes',
  'CamposComGravacao',
]);

const escOData = (val) => String(val ?? '').replace(/'/g, "''");

const getProvinceListName = (province) => {
  const listName = getPreLaunchListName(province);
  if (!listName) throw new Error(`Unknown province: "${province}". Cannot determine SharePoint list.`);
  return listName;
};

const getMissingSharePointProperty = (error) => {
  const message = String(error?.message || error || '');
  return message.match(/(?:property|Column) '([^']+)' does not exist/i)?.[1] || '';
};

export const supabaseSyncFailureResult = (error, result = {}) => ({
  success: false,
  message: `Supabase sync failed: ${error?.message || 'unknown error'}`,
  error: error?.message || String(error || 'Supabase sync failed'),
  retryable: true,
  itemId: result.itemId ?? null,
  listName: result.listName ?? null,
  audioUploadResult: result.audioUploadResult ?? null,
});

export async function addPreLaunchItem(list, itemData, listName) {
  let payload = itemData;
  const removedFields = new Set();

  for (;;) {
    try {
      return await list.items.add(payload);
    } catch (error) {
      const missingField = getMissingSharePointProperty(error);
      const canRetry =
        missingField &&
        PRELAUNCH_OPTIONAL_SAVE_FIELDS.has(missingField) &&
        Object.prototype.hasOwnProperty.call(payload, missingField) &&
        !removedFields.has(missingField);

      if (!canRetry) throw error;

      removedFields.add(missingField);
      const { [missingField]: _removed, ...nextPayload } = payload;
      payload = nextPayload;
      console.warn(
        `SharePoint list "${listName}" is missing optional field "${missingField}". Retrying save without it.`
      );
    }
  }
}

function buildSharePointFailureResult(error) {
  console.error('Error saving pre-launch survey response:', error);
  const message = error?.message || String(error || '');
  let errorMessage = 'Erro ao guardar o inquérito. Tente novamente.';
  const permanentFailure =
    message.includes('Unknown province') ||
    message.includes('400');
  if (message.includes('Unknown province')) errorMessage = message;
  else if (message.includes('403')) errorMessage = 'Erro de permissões. Contacte o administrador.';
  else if (message.includes('404')) errorMessage = 'Lista não encontrada. Verifique a configuração.';
  else if (message.includes('400')) errorMessage = 'Dados inválidos. Verifique o preenchimento.';
  return { success: false, message: errorMessage, error: message, details: error, permanentFailure };
}

async function syncToSupabaseFirst({ surveyData, itemData, mirrorToSupabase }) {
  try {
    await mirrorToSupabase({ surveyData, itemData });
    return null;
  } catch (mirrorError) {
    return supabaseSyncFailureResult(mirrorError);
  }
}

export async function savePreLaunchSurveySupabaseFirst({
  surveyData,
  onStepChange,
  sp,
  acquireToken,
  uploadPreLaunchAudio,
  mirrorToSupabase = mirrorPreLaunchSurveyToSupabase,
}) {
  if (!surveyData || typeof surveyData !== 'object') {
    return { success: false, message: 'Invalid survey data' };
  }

  try {
    const r = surveyData.responses || {};
    if (surveyData.idempotencyKey) {
      surveyData.metadata = {
        ...(surveyData.metadata || {}),
        surveyId: surveyData.idempotencyKey,
      };
    }
    const meta = surveyData.metadata || {};
    const listName = surveyData.audioOnly
      ? (surveyData.listName || getProvinceListName(r.province))
      : getProvinceListName(r.province);

    const supabaseItemData = buildPreLaunchSharePointItemData(surveyData);
    const supabaseFailure = await syncToSupabaseFirst({
      surveyData,
      itemData: supabaseItemData,
      mirrorToSupabase,
    });
    if (supabaseFailure) return supabaseFailure;

    if (!sp?.web) {
      return {
        success: false,
        message: 'SharePoint not initialized',
        retryable: true,
        deferred: true,
        reason: 'sharepoint_not_ready',
      };
    }

    const freshToken = await acquireToken({ interactive: false });
    if (!freshToken) {
      return { success: false, message: 'Sessão expirada. Inicie sessão novamente para sincronizar.', authExpired: true };
    }

    if (surveyData.audioOnly) {
      try {
        const res = await uploadPreLaunchAudio(
          listName, surveyData.spItemId, surveyData.audioRecordings || {},
        );
        const fullyOk = res && !res.hasFailures;
        return {
          success: fullyOk,
          audioOnly: true,
          audioUploadResult: res,
          itemId: surveyData.spItemId,
          listName,
          message: fullyOk ? 'Áudio sincronizado.' : 'Áudio ainda por sincronizar.',
        };
      } catch (audioError) {
        return { success: false, audioOnly: true, message: audioError.message, error: audioError.message };
      }
    }

    onStepChange?.('checkingDuplicates');
    if (meta.surveyId) {
      let checkOk = false;
      for (let attempt = 1; attempt <= 3 && !checkOk; attempt++) {
        try {
          const existingById = await sp.web.lists
            .getByTitle(listName)
            .items
            .select('Id', 'SurveyId')
            .filter(`SurveyId eq '${escOData(meta.surveyId)}'`)
            .top(1)();
          checkOk = true;
          if (existingById.length > 0) {
            const existingItemId = existingById[0].Id ?? existingById[0].ID ?? existingById[0].id ?? null;
            if (!existingItemId) {
              return { success: false, message: 'Duplicado encontrado, mas sem recibo do item. Nova tentativa mais tarde.', retryable: true };
            }
            let audioUploadResult = null;
            if (existingItemId && surveyData.audioRecordings && Object.keys(surveyData.audioRecordings).length > 0) {
              try {
                audioUploadResult = await uploadPreLaunchAudio(listName, existingItemId, surveyData.audioRecordings);
              } catch (audioError) {
                audioUploadResult = {
                  total: Object.keys(surveyData.audioRecordings).length,
                  successful: 0,
                  failed: Object.keys(surveyData.audioRecordings).length,
                  error: audioError.message,
                  details: Object.keys(surveyData.audioRecordings).map(questionId => ({
                    questionId,
                    success: false,
                    error: audioError.message,
                  })),
                  hasFailures: true,
                };
              }
            }
            return {
              success: true,
              message: 'Inquérito já existia no servidor; estado verificado.',
              isDuplicate: true,
              itemId: existingItemId,
              listName,
              audioUploadResult,
            };
          }
        } catch (err) {
          console.warn(`SurveyId duplicate check failed (attempt ${attempt}/3):`, err?.message || err);
          if (attempt < 3) await new Promise(r => setTimeout(r, 800 * attempt));
        }
      }
      if (!checkOk) {
        return { success: false, message: 'Não foi possível verificar duplicados. Nova tentativa mais tarde.', retryable: true };
      }
    }

    if (meta.fingerprint) {
      try {
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
        const existingByFingerprint = await sp.web.lists
          .getByTitle(listName)
          .items
          .filter(`Fingerprint eq '${escOData(meta.fingerprint)}' and DataPreenchimento ge '${fiveMinutesAgo}'`)
          .top(1)();
        if (existingByFingerprint.length > 0) {
          return { success: false, message: 'Submissão recente detectada para este dispositivo.', isDuplicate: true };
        }
      } catch (err) {
        console.warn('Fingerprint duplicate check failed (non-blocking):', err?.message || err);
      }
    }

    let isDuplicatePhone = false;
    const phoneToCheck = r.phoneNumber?.trim();
    if (phoneToCheck && /^9\d{8}$/.test(phoneToCheck)) {
      try {
        const existingByPhone = await sp.web.lists
          .getByTitle(listName)
          .items
          .filter(`NumeroTelefone eq '${escOData(phoneToCheck)}'`)
          .top(1)();
        isDuplicatePhone = existingByPhone.length > 0;
      } catch (err) {
        console.warn('Phone duplicate check failed (non-blocking):', err?.message || err);
      }
    }

    const itemData = buildPreLaunchSharePointItemData(surveyData, { isDuplicatePhone });

    onStepChange?.('sendingData');
    const list = sp.web.lists.getByTitle(listName);
    const result = await addPreLaunchItem(list, itemData, listName);

    const itemId = result?.data?.Id ?? result?.data?.ID ?? result?.Id ?? result?.ID ?? result?.id ?? null;
    const createdItem = result?.data || result;

    if (itemId == null) throw new Error('Failed to get item ID from SharePoint response');

    let audioUploadResult = null;
    if (surveyData.audioRecordings && Object.keys(surveyData.audioRecordings).length > 0) {
      onStepChange?.('uploadingAudio');
      try {
        audioUploadResult = await uploadPreLaunchAudio(listName, itemId, surveyData.audioRecordings);
      } catch (audioError) {
        console.error('Error uploading audio recordings:', audioError);
        audioUploadResult = {
          total: Object.keys(surveyData.audioRecordings).length,
          successful: 0,
          failed: Object.keys(surveyData.audioRecordings).length,
          error: audioError.message,
          hasFailures: true,
        };
      }
    }

    let message = 'Inquérito guardado com sucesso!';
    if (audioUploadResult?.hasFailures) {
      message += audioUploadResult.successful > 0
        ? ` (${audioUploadResult.successful} de ${audioUploadResult.total} gravações guardadas)`
        : ' (Erro ao guardar gravações de áudio)';
    } else if (audioUploadResult?.successful > 0) {
      message += ` (${audioUploadResult.successful} gravações de áudio guardadas)`;
    }

    onStepChange?.('done');
    return { success: true, message, itemId, createdItem, audioUploadResult, listName };
  } catch (error) {
    return buildSharePointFailureResult(error);
  }
}
