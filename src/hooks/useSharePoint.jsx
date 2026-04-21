// src/hooks/useSharePoint.js
import { useCallback, useEffect, useState } from "react";
import { useMsal } from "@azure/msal-react";
import { loginRequest } from "@/utils/msal-config";
import { getSP } from "@/utils/pnpjs-config";
import * as XLSX from "xlsx";
import JSZip from "jszip";
import "@pnp/sp/webs";
import "@pnp/sp/lists";
import "@pnp/sp/items";
import "@pnp/sp/attachments";
import "@pnp/sp/fields";
import "@pnp/sp/site-groups";
import "@pnp/sp/site-users";

// Human-readable labels for voice question IDs used in transcription exports
const QUESTION_LABELS = {
  mainInsight:     'Insight principal (áudio)',
  newShopLocation: 'Local para novas lojas (áudio)',
};

/**
 * Ordered list of survey fields for Excel export.
 * key   = SharePoint internal field name
 * label = Human-readable column header
 * Only these fields appear in the export; all SP system fields are excluded.
 */
const EXPORT_COLUMNS = [
  { key: 'Id',                     label: 'ID'                        },
  { key: 'SurveyId',               label: 'Survey ID'                 },
  { key: 'DataPreenchimento',      label: 'Data'                      },
  { key: 'AuthorName',             label: 'Criado por'                },
  // Section 1 — Demographics
  { key: 'Provincia',              label: 'Província'                 },
  { key: 'Municipio',              label: 'Município'                 },
  { key: 'FaixaEtaria',            label: 'Faixa etária'              },
  { key: 'Genero',                 label: 'Género'                    },
  { key: 'Ocupacao',               label: 'Ocupação'                  },
  { key: 'OcupacaoOutro',          label: 'Ocupação (outro)'          },
  // Section 2 — Device
  { key: 'TipoTelefone',           label: 'Tipo de telefone'          },
  { key: 'Suporta4G',              label: 'Suporta 4G'                },
  { key: 'ConfiguracaoSIM',        label: 'Configuração SIM'          },
  // Section 3 — Operator
  { key: 'OperadorAtual',          label: 'Operador atual'            },
  { key: 'SatisfacaoOperador',     label: 'Satisfação operador (1–5)' },
  { key: 'CoberturaDaRede',        label: 'Cobertura da rede (1–5)'   },
  { key: 'OperadorMaisVisivel',    label: 'Operador mais visível'     },
  { key: 'ZonasPiorCobertura',     label: 'Zonas com pior cobertura'  },
  { key: 'ZonasPiorCoberturaOutro',label: 'Zonas (outro)'             },
  // Section 4 — Usage
  { key: 'UsoTelefone',            label: 'Uso principal'             },
  { key: 'FrequenciaRecarga',      label: 'Frequência recarga'        },
  { key: 'ValorRecarga',           label: 'Valor recarga'             },
  { key: 'LocalRecarga',           label: 'Local de recarga'          },
  { key: 'LocalRecargaOutro',      label: 'Local (outro)'             },
  { key: 'RazaoRecarga',           label: 'Razão da recarga'          },
  { key: 'RazaoRecargaOutro',      label: 'Razão (outro)'             },
  { key: 'UsaMobileMoney',         label: 'Usa Mobile Money'          },
  // Section 5 — Preferences
  { key: 'PacotePreferido',        label: 'Pacote preferido'          },
  { key: 'MudariaOperador',        label: 'Mudaria de operador'       },
  { key: 'OfertaDificilAbandonar', label: 'Oferta difícil abandonar'  },
  { key: 'OfertaEspecifica',       label: 'Oferta específica'         },
  { key: 'FontePromocoes',         label: 'Fonte de promoções'        },
  { key: 'FontePromocoesOutro',    label: 'Fonte (outro)'             },
  { key: 'LocalNovasLojas',        label: 'Local novas lojas (áudio)' },
  { key: 'FontesConfianca',        label: 'Fontes de confiança'       },
  { key: 'FontesConfiancaOutro',   label: 'Fontes (outro)'            },
  // Section 6 — Insight
  { key: 'InsightPrincipal',       label: 'Insight principal (áudio)' },
  // Section 7 — Contact
  { key: 'InteresseDiscussao',     label: 'Interesse em discussão'    },
  { key: 'NomeCliente',            label: 'Nome do entrevistado'      },
  { key: 'NumeroTelefone',         label: 'Número de telefone'        },
  { key: 'Duplicado',              label: 'Duplicado'                 },
  // Timing
  { key: 'DuracaoInquerito',       label: 'Duração (segundos)'        },
  // Audio metadata
  { key: 'TemGravacoes',           label: 'Tem gravações'             },
  { key: 'CamposComGravacao',      label: 'Campos com gravação'       },
];

/**
 * Strip SharePoint ExternalClass HTML wrappers and decode HTML entities.
 * SharePoint stores multi-select/note fields wrapped in <div class="ExternalClass...">
 * and encodes characters like &#58; → :
 */
function stripSpHtml(raw) {
  if (raw === null || raw === undefined) return '';
  const str = String(raw);
  if (!str.includes('<')) return str; // fast path: no HTML
  try {
    const doc = new DOMParser().parseFromString(str, 'text/html');
    return (doc.body.textContent || '').trim();
  } catch {
    return str
      .replace(/<[^>]+>/g, '')
      .replace(/&#(\d+);/g, (_, c) => String.fromCharCode(Number(c)))
      .trim();
  }
}

/** Build a clean row object for Excel from a raw SharePoint item. */
function buildExportRow(r, extra = {}) {
  const row = {};
  for (const col of EXPORT_COLUMNS) {
    if (col.key === 'AuthorName') {
      row[col.label] = r.Author?.Title || '';
    } else {
      row[col.label] = stripSpHtml(r[col.key] ?? '');
    }
  }
  // Append any extra columns (e.g. TranscriptMainInsight)
  Object.assign(row, extra);
  return row;
}

/** Convert an array of raw SP items to a formatted XLSX worksheet. */
function buildExcelWorksheet(items, extraFn = () => ({})) {
  const rows = items.map(r => buildExportRow(r, extraFn(r)));
  const ws   = XLSX.utils.json_to_sheet(rows);
  // Auto-width based on longest value per column
  const colWidths = EXPORT_COLUMNS.map((c, i) => {
    const maxLen = rows.reduce((m, row) => {
      const v = row[c.label];
      return Math.max(m, v ? String(v).length : 0);
    }, c.label.length);
    return { wch: Math.min(maxLen + 2, 60) }; // cap at 60 chars
  });
  ws['!cols'] = colWidths;
  return ws;
}
import "@pnp/sp/files";

/**
 * Custom hook for interacting with SharePoint for the Africell Survey.
 */
export const useSharePoint = () => {
  const { instance, accounts } = useMsal();
  const isAuthenticated = accounts.length > 0;
  const [sp, setSP] = useState(null);
  const [tokenSP, setTokenSP] = useState(null);

  /**
   * Acquire access token silently or fallback to interactive if needed.
   * If both attempts fail, fires a global 'auth:session-expired' event so
   * the UI can show a warning and prompt the user to log in again.
   */
  const acquireToken = useCallback(async () => {
    if (!isAuthenticated) return null;
    try {
      const response = await instance.acquireTokenSilent({
        ...loginRequest,
        account: accounts[0],
        scopes: ["https://africellcloud.sharepoint.com/.default"],
      });
      setTokenSP(response.accessToken);
      return response.accessToken;
    } catch (error) {
      console.error("Silent token acquisition failed:", error);
      try {
        const response = await instance.acquireTokenPopup(loginRequest);
        return response.accessToken;
      } catch (popupError) {
        console.error("Interactive token acquisition failed:", popupError);
        // Both silent and popup failed — notify the UI
        window.dispatchEvent(new CustomEvent('auth:session-expired'));
        return null;
      }
    }
  }, [instance, accounts, isAuthenticated]);

  useEffect(() => {
    const setupToken = async () => {
      if (!tokenSP) {
        const accessToken = await acquireToken();
        setTokenSP(accessToken);
      }
    };
    setupToken();
  }, [tokenSP, acquireToken]);

  useEffect(() => {
    const setupPnP = async () => {
      if (!sp && tokenSP) {
        const spGet = getSP(tokenSP);
        setSP(spGet);
      }
    };
    setupPnP();
  }, [sp, tokenSP]);

  /**
   * Upload audio recordings as attachments to a survey response item
   */
  const uploadAudioRecordings = useCallback(
    async (itemId, audioRecordings) => {
      if (!sp?.web || !itemId || !audioRecordings) {
        return;
      }

      try {
        const list = sp.web.lists.getByTitle("Huila_CustumerExp_Survey");
        const item = list.items.getById(itemId);
        const uploadResults = [];

        for (const [questionId, recording] of Object.entries(audioRecordings)) {
          if (recording && recording.blob) {
            try {
              const arrayBuffer = await recording.blob.arrayBuffer();
              const timestamp = new Date().getTime();
              const randomSuffix = Math.random().toString(36).substring(2, 8);
              const fileName = `${questionId}_${timestamp}_${randomSuffix}.wav`;

              let uploadResult = null;
              let attempts = 0;
              const maxAttempts = 3;

              while (attempts < maxAttempts && !uploadResult) {
                attempts++;
                try {
                  if (attempts > 1) {
                    await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
                  }
                  uploadResult = await item.attachmentFiles.add(fileName, arrayBuffer);
                  uploadResults.push({ questionId, success: true, fileName, attempts, size: arrayBuffer.byteLength });
                  break;
                } catch (uploadError) {
                  if (attempts >= maxAttempts) {
                    uploadResults.push({ questionId, success: false, error: uploadError.message, attempts, size: arrayBuffer.byteLength });
                  }
                }
              }
            } catch (conversionError) {
              console.error(`Error converting audio blob for ${questionId}:`, conversionError);
              uploadResults.push({ questionId, success: false, error: 'Failed to convert audio file', attempts: 0 });
            }
          } else {
            uploadResults.push({ questionId, success: false, error: 'No valid audio recording found', attempts: 0 });
          }

          await new Promise(resolve => setTimeout(resolve, 500));
        }

        const successful = uploadResults.filter(r => r.success);
        const failed = uploadResults.filter(r => !r.success);

        return {
          total: uploadResults.length,
          successful: successful.length,
          failed: failed.length,
          details: uploadResults,
          hasFailures: failed.length > 0
        };
      } catch (error) {
        console.error('Error in uploadAudioRecordings:', error);
        throw error;
      }
    },
    [sp]
  );

  /**
   * Save a completed survey response to SharePoint
   */
  const saveSurveyResponse = useCallback(
    async (surveyData, onStepChange) => {
      if (!sp?.web) {
        console.error('SharePoint context not available');
        return { success: false, message: 'SharePoint not initialized' };
      }

      try {
        onStepChange?.('checkingDuplicates');
        const getVoiceQuestionValue = (questionId) => {
          const textResponse = surveyData.responses?.[questionId] || '';
          const hasAudio = surveyData.audioRecordings?.[questionId];
          if (hasAudio && textResponse.includes('[Audio Recording')) {
            return `Audio recording captured at ${new Date().toLocaleString()}`;
          } else if (textResponse && !textResponse.includes('[Audio Recording')) {
            return textResponse;
          }
          return '';
        };

        const itemData = {
          // Demographic Section
          Title: `Survey Response - ${new Date().toLocaleDateString()}`,
          Bairro: surveyData.responses?.bairro || '',
          Idade: surveyData.responses?.idade || '',
          Genero: surveyData.responses?.genero || '',
          Ocupacao: surveyData.responses?.ocupacao || '',
          OcupacaoOutro: surveyData.customInputs?.ocupacao || '',
          OperadoraPrincipal: surveyData.responses?.operadora || '',
          MultipleSim: surveyData.responses?.multipleSim || '',
          MultipleSimRazao: surveyData.customInputs?.multipleSim || '',

          // Africell User Section
          SatisfacaoAfricell: surveyData.responses?.satisfacao || '',
          ServicoMaisUsado: surveyData.responses?.servicoMaisUsado || '',
          GastoMensal: surveyData.responses?.gastoMensal || '',
          RazaoEscolhaAfricell: getVoiceQuestionValue('razaoEscolha'),
          MelhoriasAfricell: getVoiceQuestionValue('melhorias'),
          RecomendariaAfricell: surveyData.responses?.recomendacao || '',
          RecomendacaoJustificacao: surveyData.customInputs?.recomendacao || '',
          UsarMaisServicos: surveyData.responses?.usarMais || '',
          UsarMaisOutro: surveyData.customInputs?.usarMais || '',

          // Non-Africell User Section
          OperadoraAtual: surveyData.responses?.operadoraAtual || '',
          RazaoOperadoraAtual: getVoiceQuestionValue('razaoOperadoraAtual'),
          QualidadeSinal: getVoiceQuestionValue('qualidadeSinal'),
          ExperimentouAfricell: surveyData.responses?.experimentouAfricell || '',
          ExperimentouAfricellRazao: surveyData.customInputs?.experimentouAfricell || '',
          OpiniaoAfricell: surveyData.responses?.opiniao || '',
          JustificacaoOpiniao: getVoiceQuestionValue('justificacaoOpiniao'),
          MudariaAfricell: getVoiceQuestionValue('mudaria'),
          ServicosDesejados: surveyData.responses?.servicosDesejados || '',
          ServicosDesejadosOutro: surveyData.customInputs?.servicosDesejados || '',
          interesseGrupoFocal: surveyData.responses?.interesseGrupoFocal || '',
          dadosContactoGrupoFocal: (() => {
            if (surveyData.focusGroupContact?.name && surveyData.focusGroupContact?.phone) {
              return `${surveyData.focusGroupContact.name} | ${surveyData.focusGroupContact.phone}`;
            }
            if (surveyData.responses?.interesseGrupoFocal === 'Sim' && surveyData.customInputs?.interesseGrupoFocal) {
              return surveyData.customInputs.interesseGrupoFocal;
            }
            return '';
          })(),

          // Metadata
          DataPreenchimento: new Date().toISOString(),
          TipoUsuario: surveyData.responses?.operadora === 'Africell' ? 'Usuario Africell' : 'Nao Usuario Africell',
          StatusInquerito: 'Completo'
        };

        if (surveyData.audioRecordings && Object.keys(surveyData.audioRecordings).length > 0) {
          itemData.TemGravacoes = 'Sim';
          itemData.CamposComGravacao = Object.keys(surveyData.audioRecordings).join(', ');
        } else {
          itemData.TemGravacoes = 'Nao';
        }

        onStepChange?.('sendingData');
        const result = await sp.web.lists
          .getByTitle("Huila_CustumerExp_Survey")
          .items.add(itemData);

        let itemId = null;
        let createdItem = null;

        if (result?.data) {
          itemId = result.data.Id ?? result.data.ID ?? null;
          createdItem = result.data;
        } else if (result && typeof result === 'object') {
          itemId = result.Id ?? result.ID ?? result.id ?? null;
          createdItem = result;
        }

        if (itemId == null) {
          throw new Error('Failed to get item ID from SharePoint response');
        }

        let audioUploadResult = null;
        if (surveyData.audioRecordings && Object.keys(surveyData.audioRecordings).length > 0) {
          onStepChange?.('uploadingAudio');
          try {
            audioUploadResult = await uploadAudioRecordings(itemId, surveyData.audioRecordings);
          } catch (audioError) {
            console.error('Error uploading audio recordings:', audioError);
            audioUploadResult = {
              total: Object.keys(surveyData.audioRecordings).length,
              successful: 0,
              failed: Object.keys(surveyData.audioRecordings).length,
              error: audioError.message,
              hasFailures: true
            };
          }
        }

        let message = 'Inquérito guardado com sucesso!';
        if (audioUploadResult?.hasFailures) {
          if (audioUploadResult.successful > 0) {
            message += ` (${audioUploadResult.successful} de ${audioUploadResult.total} gravações guardadas)`;
          } else {
            message += ' (Erro ao guardar gravações de áudio)';
          }
        } else if (audioUploadResult?.successful > 0) {
          message += ` (${audioUploadResult.successful} gravações de áudio guardadas)`;
        }

        onStepChange?.('done');
        return { success: true, message, itemId, createdItem, audioUploadResult };

      } catch (error) {
        console.error('Error saving survey response:', error);

        let errorMessage = 'Erro ao guardar o inquérito. Tente novamente.';
        if (error.message.includes('Unauthorized') || error.message.includes('403')) {
          errorMessage = 'Erro de permissões. Contacte o administrador.';
        } else if (error.message.includes('Not Found') || error.message.includes('404')) {
          errorMessage = 'Lista não encontrada. Verifique a configuração.';
        } else if (error.message.includes('Bad Request') || error.message.includes('400')) {
          errorMessage = 'Dados inválidos. Verifique o preenchimento.';
        }

        return { success: false, message: errorMessage, error: error.message, details: error };
      }
    },
    [sp, uploadAudioRecordings]
  );

  /**
   * Resolve the SharePoint list name from the selected province.
   * Cabinda → Cabinda_PreLaunch_Survey
   * Bié     → Bie_PreLaunch_Survey
   * Zaire   → Zaire_PreLaunch_Survey
   */
  const getProvinceListName = (province) => {
    const map = {
      'Cabinda': 'Cabinda_PreLaunch_Survey',
      'Bié':     'Bie_PreLaunch_Survey',
      'Zaire':   'Zaire_PreLaunch_Survey',
    };
    const listName = map[province];
    if (!listName) throw new Error(`Unknown province: "${province}". Cannot determine SharePoint list.`);
    return listName;
  };

  /**
   * Upload audio recordings as attachments to a pre-launch survey item.
   * listName is resolved from the province before calling this function.
   */
  const uploadPreLaunchAudio = useCallback(
    async (listName, itemId, audioRecordings) => {
      if (!sp?.web || !listName || !itemId || !audioRecordings) return;
      try {
        const item = sp.web.lists.getByTitle(listName).items.getById(itemId);
        const uploadResults = [];

        for (const [questionId, recording] of Object.entries(audioRecordings)) {
          if (recording?.blob) {
            try {
              const arrayBuffer = await recording.blob.arrayBuffer();
              const fileName = `${questionId}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.wav`;
              let uploadResult = null;
              let attempts = 0;
              while (attempts < 3 && !uploadResult) {
                attempts++;
                try {
                  if (attempts > 1) await new Promise(r => setTimeout(r, 1000 * attempts));
                  uploadResult = await item.attachmentFiles.add(fileName, arrayBuffer);
                  uploadResults.push({ questionId, success: true, fileName, attempts, size: arrayBuffer.byteLength });
                  break;
                } catch (err) {
                  if (attempts >= 3) uploadResults.push({ questionId, success: false, error: err.message, attempts, size: arrayBuffer.byteLength });
                }
              }
            } catch {
              uploadResults.push({ questionId, success: false, error: 'Failed to convert audio file', attempts: 0 });
            }
          } else {
            uploadResults.push({ questionId, success: false, error: 'No valid audio recording found', attempts: 0 });
          }
          await new Promise(r => setTimeout(r, 500));
        }

        const successful = uploadResults.filter(r => r.success);
        const failed = uploadResults.filter(r => !r.success);
        return { total: uploadResults.length, successful: successful.length, failed: failed.length, details: uploadResults, hasFailures: failed.length > 0 };
      } catch (error) {
        console.error('Error in uploadPreLaunchAudio:', error);
        throw error;
      }
    },
    [sp]
  );

  /** Escape single-quotes in OData string literals to prevent injection. */
  const escOData = (val) => String(val ?? '').replace(/'/g, "''");

  /**
   * Save a pre-launch survey response to the correct province list.
   * Duplicate prevention: checks SurveyId (exact) and Fingerprint+time (device).
   */
  const saveCabindaSurveyResponse = useCallback(
    async (surveyData, onStepChange) => {
      if (!sp?.web) {
        return { success: false, message: 'SharePoint not initialized' };
      }
      if (!surveyData || typeof surveyData !== 'object') {
        return { success: false, message: 'Invalid survey data' };
      }

      try {
        const r = surveyData.responses || {};
        const ci = surveyData.customInputs || {};
        const meta = surveyData.metadata || {};

        // Resolve the list from the selected province
        const listName = getProvinceListName(r.province);

        const getVoice = (id) => {
          const text = r[id] || '';
          const hasAudio = surveyData.audioRecordings?.[id];
          if (hasAudio && text.includes('[Gravação de Áudio')) return `Audio recording captured at ${new Date().toLocaleString()}`;
          return text.includes('[Gravação de Áudio') ? '' : text;
        };

        // ── Server-side duplicate prevention ──────────────────────────────

        onStepChange?.('checkingDuplicates');
        // 1. Exact match by SurveyId
        if (meta.surveyId) {
          const existingById = await sp.web.lists
            .getByTitle(listName)
            .items
            .filter(`SurveyId eq '${escOData(meta.surveyId)}'`)
            .top(1)();
          if (existingById.length > 0) {
            return { success: false, message: 'Inquérito duplicado detectado.', isDuplicate: true };
          }
        }

        // 2. Same device fingerprint within last 5 minutes
        if (meta.fingerprint) {
          const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
          const existingByFingerprint = await sp.web.lists
            .getByTitle(listName)
            .items
            .filter(`Fingerprint eq '${escOData(meta.fingerprint)}' and DataPreenchimento ge '${fiveMinutesAgo}'`)
            .top(1)();
          if (existingByFingerprint.length > 0) {
            return { success: false, message: 'Submissão recente detectada para este dispositivo.', isDuplicate: true };
          }
        }

        // 3. Phone number duplicate check — save anyway, but flag it
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
          } catch (_) {
            // non-critical — don't block save if check fails
          }
        }

        // ── Build item data ────────────────────────────────────────────────

        const itemData = {
          Title: `${r.province} Survey - ${new Date().toLocaleDateString()}`,

          // Section 1 — Demographics
          Provincia:               r.province || '',
          Municipio:               r.municipality || '',
          FaixaEtaria:             r.ageGroup || '',
          Genero:                  r.gender || '',
          Ocupacao:                r.occupation || '',
          OcupacaoOutro:           ci.occupation || '',

          // Section 2 — Device & Connectivity
          TipoTelefone:            r.phoneType || '',
          Suporta4G:               r.supports4G || '',
          ConfiguracaoSIM:         r.simConfig || '',

          // Section 3 — Operator & Network Perception
          OperadorAtual:           r.currentOperator || '',
          SatisfacaoOperador:      r.operatorSatisfaction || '',
          CoberturaDaRede:         r.networkCoverage || '',
          OperadorMaisVisivel:     r.mostVisibleOperator || '',
          ZonasPiorCobertura:      r.worstCoverageAreas || '',
          ZonasPiorCoberturaOutro: ci.worstCoverageAreas || '',

          // Section 4 — Usage, Recharge & Spend
          UsoTelefone:             r.primaryPhoneUse || '',
          FrequenciaRecarga:       r.rechargeFrequency || '',
          ValorRecarga:            r.rechargeAmount || '',
          LocalRecarga:            r.rechargeLocation || '',
          LocalRecargaOutro:       ci.rechargeLocation || '',
          RazaoRecarga:            r.rechargeReason || '',
          RazaoRecargaOutro:       ci.rechargeReason || '',
          UsaMobileMoney:          r.usesMobileMoney || '',

          // Section 5 — Preferences, Switching & Offers
          PacotePreferido:         r.preferredBundle || '',
          MudariaOperador:         r.wouldSwitch || '',
          OfertaDificilAbandonar:  r.hardToGiveUp || '',
          OfertaEspecifica:        ci.hardToGiveUp || '',
          FontePromocoes:          r.promotionSource || '',
          FontePromocoesOutro:     ci.promotionSource || '',
          LocalNovasLojas:         getVoice('newShopLocation'),
          FontesConfianca:         r.trustedCommunity || '',
          FontesConfiancaOutro:    ci.trustedCommunity || '',

          // Section 6 — Key Audio Insight
          InsightPrincipal:        getVoice('mainInsight'),

          // Section 7 — Contact
          InteresseDiscussao:      r.interestedInDiscussion || '',
          NomeCliente:             r.nomeCliente || '',
          NumeroTelefone:          r.phoneNumber || '',

          // Audio metadata
          TemGravacoes:       surveyData.audioRecordings && Object.keys(surveyData.audioRecordings).length > 0 ? 'Sim' : 'Nao',
          CamposComGravacao:  surveyData.audioRecordings ? Object.keys(surveyData.audioRecordings).join(', ') : '',

          // Duplicate prevention fields
          SurveyId:    meta.surveyId || '',
          Fingerprint: meta.fingerprint || '',

          // Metadata
          DuracaoInquerito:  meta.duration || 0,
          DataPreenchimento: new Date().toISOString(),
          StatusInquerito:   'Completo',
          Duplicado:         isDuplicatePhone ? 'Sim' : 'Não',
        };

        // ── Insert ─────────────────────────────────────────────────────────

        onStepChange?.('sendingData');
        const result = await sp.web.lists.getByTitle(listName).items.add(itemData);

        const itemId = result?.data?.Id ?? result?.data?.ID ?? result?.Id ?? result?.ID ?? result?.id ?? null;
        const createdItem = result?.data || result;

        if (itemId == null) throw new Error('Failed to get item ID from SharePoint response');

        // ── Upload audio attachments ────────────────────────────────────────

        let audioUploadResult = null;
        if (surveyData.audioRecordings && Object.keys(surveyData.audioRecordings).length > 0) {
          onStepChange?.('uploadingAudio');
          try {
            audioUploadResult = await uploadPreLaunchAudio(listName, itemId, surveyData.audioRecordings);
          } catch (audioError) {
            console.error('Error uploading audio recordings:', audioError);
            audioUploadResult = { total: Object.keys(surveyData.audioRecordings).length, successful: 0, failed: Object.keys(surveyData.audioRecordings).length, error: audioError.message, hasFailures: true };
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
        console.error('Error saving pre-launch survey response:', error);
        let errorMessage = 'Erro ao guardar o inquérito. Tente novamente.';
        if (error.message.includes('Unknown province'))       errorMessage = error.message;
        else if (error.message.includes('403'))               errorMessage = 'Erro de permissões. Contacte o administrador.';
        else if (error.message.includes('404'))               errorMessage = 'Lista não encontrada. Verifique a configuração.';
        else if (error.message.includes('400'))               errorMessage = 'Dados inválidos. Verifique o preenchimento.';
        return { success: false, message: errorMessage, error: error.message, details: error };
      }
    },
    [sp, uploadPreLaunchAudio]
  );

  /**
   * Extract a short, readable message from a raw SharePoint/PnP error string.
   * Input example: "Error making HttpClient request in queryable [403] ::> {"odata.error":...}"
   * Output example: "Acesso negado (403) — o utilizador não tem permissão para criar listas neste site."
   */
  const parseSpError = (raw = '') => {
    // Try to extract HTTP status code
    const statusMatch = raw.match(/\[(\d{3})\]/);
    const status = statusMatch ? parseInt(statusMatch[1], 10) : null;

    // Try to extract the odata error message value
    let odataMsg = '';
    const jsonStart = raw.indexOf('{');
    if (jsonStart !== -1) {
      try {
        const parsed = JSON.parse(raw.slice(jsonStart));
        odataMsg = parsed?.['odata.error']?.message?.value || '';
      } catch { /* ignore */ }
    }

    if (status === 403) return `Acesso negado (403) — o utilizador não tem permissão para criar listas neste site.`;
    if (status === 404) return `Site não encontrado (404) — verifique o URL do SharePoint.`;
    if (status === 401) return `Não autenticado (401) — faça login novamente.`;
    if (odataMsg)       return `Erro ${status ?? ''}: ${odataMsg}`.trim();
    return raw.length > 120 ? raw.slice(0, 120) + '…' : raw;
  };

  /**
   * Create all three pre-launch survey lists (Cabinda, Bié, Zaire) with the
   * full column schema. Safe to run more than once — existing lists and fields
   * are skipped rather than overwritten.
   */
  const createPreLaunchLists = useCallback(async () => {
    if (!sp?.web) return { success: false, message: 'SharePoint not initialized' };

    const listNames = [
      'Cabinda_PreLaunch_Survey',
      'Bie_PreLaunch_Survey',
      'Zaire_PreLaunch_Survey',
    ];

    // Column schema — [internalName, type, extraProps]
    // type: 'text' | 'note' | 'number' | 'datetime'
    const columns = [
      // ── Section 1: Demographics ────────────────────────────────────────
      ['Provincia',               'text'    ],
      ['Municipio',               'text'    ],
      ['FaixaEtaria',             'text'    ],
      ['Genero',                  'text'    ],
      ['Ocupacao',                'text'    ],
      ['OcupacaoOutro',           'text'    ],
      // ── Section 2: Device & Connectivity ──────────────────────────────
      ['TipoTelefone',            'text'    ],
      ['Suporta4G',               'text'    ],
      ['ConfiguracaoSIM',         'text'    ],
      // ── Section 3: Operator & Network Perception ───────────────────────
      ['OperadorAtual',           'text'    ],
      ['SatisfacaoOperador',      'number', { MinimumValue: 1, MaximumValue: 5 }],
      ['CoberturaDaRede',         'number', { MinimumValue: 1, MaximumValue: 5 }],
      ['OperadorMaisVisivel',     'text'    ],
      ['ZonasPiorCobertura',      'note'    ],
      ['ZonasPiorCoberturaOutro', 'text'    ],
      // ── Section 4: Usage, Recharge & Spend ────────────────────────────
      ['UsoTelefone',             'text'    ],
      ['FrequenciaRecarga',       'text'    ],
      ['ValorRecarga',            'text'    ],
      ['LocalRecarga',            'note'    ],
      ['LocalRecargaOutro',       'text'    ],
      ['RazaoRecarga',            'text'    ],
      ['RazaoRecargaOutro',       'text'    ],
      ['UsaMobileMoney',          'text'    ],
      // ── Section 5: Preferences, Switching & Offers ────────────────────
      ['PacotePreferido',         'text'    ],
      ['MudariaOperador',         'text'    ],
      ['OfertaDificilAbandonar',  'text'    ],
      ['OfertaEspecifica',        'note'    ],
      ['FontePromocoes',          'note'    ],
      ['FontePromocoesOutro',     'text'    ],
      ['LocalNovasLojas',         'note'    ],
      ['FontesConfianca',         'note'    ],
      ['FontesConfiancaOutro',    'text'    ],
      // ── Section 6: Key Audio Insight ──────────────────────────────────
      ['InsightPrincipal',        'note'    ],
      // ── Section 7: Contact ────────────────────────────────────────────
      ['InteresseDiscussao',      'text'    ],
      ['NomeCliente',             'text'    ],
      ['NumeroTelefone',          'text'    ],
      ['Duplicado',               'text'    ],
      // ── Audio metadata ────────────────────────────────────────────────
      ['TemGravacoes',            'text'    ],
      ['CamposComGravacao',       'note'    ],
      // ── Duplicate prevention ──────────────────────────────────────────
      ['SurveyId',                'text'    ],
      ['Fingerprint',             'text'    ],
      // ── Metadata ──────────────────────────────────────────────────────
      ['DuracaoInquerito',        'number'  ],
      ['DataPreenchimento',       'datetime'],
      ['StatusInquerito',         'text'    ],
    ];

    const report = [];

    for (const listName of listNames) {
      const listReport = { listName, created: false, skipped: false, fields: [], errors: [] };

      // ── 1. Create the list (skip if it already exists) ─────────────────
      try {
        await sp.web.lists.add(listName, `Africell pre-launch survey responses — ${listName}`, 100);
        listReport.created = true;
      } catch (err) {
        if (err.message?.includes('already exists') || err.message?.includes('já existe') || err.status === 409) {
          listReport.skipped = true;
        } else {
          listReport.errors.push(parseSpError(err.message));
          report.push(listReport);
          continue; // skip field creation if list couldn't be created
        }
      }

      const list = sp.web.lists.getByTitle(listName);

      // ── 2. Fetch existing field names to skip duplicates ───────────────
      let existingFields = new Set();
      try {
        const fields = await list.fields.filter("Hidden eq false")();
        existingFields = new Set(fields.map(f => f.InternalName));
      } catch (err) {
        listReport.errors.push(`Não foi possível ler os campos existentes: ${parseSpError(err.message)}`);
      }

      // ── 3. Add each column ─────────────────────────────────────────────
      for (const [name, type, props = {}] of columns) {
        if (existingFields.has(name)) {
          listReport.fields.push({ name, status: 'skipped' });
          continue;
        }

        try {
          switch (type) {
            case 'text':
              await list.fields.addText(name, { MaxLength: 255, ...props });
              break;
            case 'note':
              await list.fields.addMultilineText(name, { NumberOfLines: 6, RichText: false, ...props });
              break;
            case 'number':
              await list.fields.addNumber(name, props);
              break;
            case 'datetime':
              await list.fields.addDateTime(name, props);
              break;
          }
          listReport.fields.push({ name, status: 'created' });
        } catch (err) {
          const clean = parseSpError(err.message);
          listReport.fields.push({ name, status: 'error', error: clean });
          listReport.errors.push(`Campo "${name}": ${clean}`);
        }
      }

      report.push(listReport);
    }

    const allSucceeded = report.every(r => r.errors.length === 0);
    const summary = report.map(r => {
      const created = r.fields.filter(f => f.status === 'created').length;
      const skipped = r.fields.filter(f => f.status === 'skipped').length;
      const errors  = r.fields.filter(f => f.status === 'error').length;

      let listStatus;
      if (r.created)       listStatus = 'lista criada';
      else if (r.skipped)  listStatus = 'lista ja existia';
      else                 listStatus = 'ERRO ao criar lista';

      const fieldSummary = (r.created || r.skipped)
        ? ` | campos — ${created} adicionados, ${skipped} ja existiam, ${errors} falharam`
        : ` | ${r.errors[0] || ''}`;

      return `${r.listName}: ${listStatus}${fieldSummary}`;
    });

    return {
      success: allSucceeded,
      message: allSucceeded ? 'All lists ready.' : 'Completed with some errors — check details.',
      summary,
      report,
    };
  }, [sp]);

  // ── Admin panel helpers ──────────────────────────────────────────────────

  /**
   * Returns true if the signed-in user has site-owner level access.
   *
   * Three-stage fallback (each stage is tried only if the previous throws):
   *   1. Associated Owner Group membership — most accurate, but requires
   *      ManagePermissions; throws 403 for some OAuth token configurations.
   *   2. IsSiteAdmin flag on the current user object — works for site
   *      collection admins without needing group-read permissions.
   *   3. User's own group list — checks whether the user belongs to any
   *      group whose title contains "Owner"; readable by any authenticated user.
   */
  const checkIsOwner = useCallback(async () => {
    if (!sp?.web) return false;

    // Stage 1 — Associated Owner Group
    try {
      const [currentUser, ownerUsers] = await Promise.all([
        sp.web.currentUser(),
        sp.web.associatedOwnerGroup.users(),
      ]);
      return ownerUsers.some(u => u.Id === currentUser.Id);
    } catch { /* 403 — fall through */ }

    // Stage 2 — IsSiteAdmin
    try {
      const user = await sp.web.currentUser();
      if (user.IsSiteAdmin === true) return true;
    } catch { /* fall through */ }

    // Stage 3 — own group membership
    try {
      const groups = await sp.web.currentUser.groups();
      return groups.some(g => g.Title?.toLowerCase().includes('owner'));
    } catch {
      return false;
    }
  }, [sp]);

  /**
   * Fetch items from a province list, ordered newest first.
   */
  const getProvinceRecords = useCallback(
    async (province, { top = 200, skip = 0, filter = '' } = {}) => {
      if (!sp?.web) return [];
      const listName = getProvinceListName(province);
      let q = sp.web.lists.getByTitle(listName).items
        .select('*', 'Author/Title', 'Author/EMail')
        .expand('Author')
        .orderBy('DataPreenchimento', false)
        .top(top)
        .skip(skip);
      if (filter) q = q.filter(filter);
      return await q();
    },
    [sp]
  );

  /**
   * Count all items in a province list (up to 5 000).
   */
  const getProvinceCount = useCallback(
    async (province) => {
      if (!sp?.web) return 0;
      const listName = getProvinceListName(province);
      const items = await sp.web.lists.getByTitle(listName).items.select('Id').top(5000)();
      return items.length;
    },
    [sp]
  );

  /**
   * Fetch submission counts for Cabinda and Zaire from SharePoint in parallel.
   * Returns { Cabinda: number, Zaire: number, total: number }
   */
  const getSurveyTargetCounts = useCallback(
    async () => {
      if (!sp?.web) return null;
      try {
        const [cabinda, zaire] = await Promise.all([
          getProvinceCount('Cabinda'),
          getProvinceCount('Zaire'),
        ]);
        return { Cabinda: cabinda, Zaire: zaire, total: cabinda + zaire };
      } catch (err) {
        console.warn('Failed to fetch survey target counts:', err.message);
        return null;
      }
    },
    [sp, getProvinceCount]
  );

  /**
   * Fetch detailed stats for the preliminary report.
   * Returns { municipalities: { [name]: number }, genders: { Masculino: n, Feminino: n },
   *           ages: { [range]: number }, total: number }
   */
  const getSurveyDetailedStats = useCallback(
    async () => {
      if (!sp?.web) return null;
      try {
        const [cabindaItems, zaireItems] = await Promise.all([
          sp.web.lists.getByTitle('Cabinda_PreLaunch_Survey').items
            .select('Municipio', 'Genero', 'FaixaEtaria').top(5000)(),
          sp.web.lists.getByTitle('Zaire_PreLaunch_Survey').items
            .select('Municipio', 'Genero', 'FaixaEtaria').top(5000)(),
        ]);

        const aggregate = (items) => {
          const municipalities = {};
          const genders = { 'Masculino': 0, 'Feminino': 0 };
          const ages = {};
          for (const item of items) {
            const mun = item.Municipio || 'Desconhecido';
            municipalities[mun] = (municipalities[mun] || 0) + 1;
            const gen = item.Genero;
            if (gen === 'Masculino' || gen === 'Feminino') genders[gen]++;
            const age = item.FaixaEtaria;
            if (age) ages[age] = (ages[age] || 0) + 1;
          }
          return { municipalities, genders, ages, total: items.length };
        };

        const cabinda = aggregate(cabindaItems);
        const zaire = aggregate(zaireItems);

        const allMunicipalities = { ...cabinda.municipalities };
        for (const [k, v] of Object.entries(zaire.municipalities)) {
          allMunicipalities[k] = (allMunicipalities[k] || 0) + v;
        }
        const allGenders = {
          'Masculino': (cabinda.genders['Masculino'] || 0) + (zaire.genders['Masculino'] || 0),
          'Feminino':  (cabinda.genders['Feminino']  || 0) + (zaire.genders['Feminino']  || 0),
        };
        const allAges = { ...cabinda.ages };
        for (const [k, v] of Object.entries(zaire.ages)) {
          allAges[k] = (allAges[k] || 0) + v;
        }

        return {
          municipalities: allMunicipalities,
          genders: allGenders,
          ages: allAges,
          total: cabinda.total + zaire.total,
        };
      } catch (err) {
        console.warn('Failed to fetch detailed survey stats:', err.message);
        return null;
      }
    },
    [sp]
  );

  /**
   * Permanently delete one item from a province list.
   */
  const deleteProvinceRecord = useCallback(
    async (province, itemId) => {
      if (!sp?.web) return { success: false };
      const listName = getProvinceListName(province);
      await sp.web.lists.getByTitle(listName).items.getById(itemId).delete();
      return { success: true };
    },
    [sp]
  );

  /**
   * Update fields on a province list item (used to write transcripts back).
   */
  const updateProvinceRecord = useCallback(
    async (province, itemId, fields) => {
      if (!sp?.web) throw new Error('SharePoint not initialized');
      const listName = getProvinceListName(province);
      await sp.web.lists.getByTitle(listName).items.getById(itemId).update(fields);
    },
    [sp]
  );

  /**
   * List attachments for a province list item.
   * Each returned object has: FileName, ServerRelativeUrl.
   */
  const getItemAttachments = useCallback(
    async (province, itemId) => {
      if (!sp?.web) return [];
      const listName = getProvinceListName(province);
      return await sp.web.lists.getByTitle(listName).items.getById(itemId).attachmentFiles();
    },
    [sp]
  );

  /**
   * Download an attachment as an ArrayBuffer (for ZIP bundling).
   */
  const downloadAttachment = useCallback(
    async (serverRelativeUrl) => {
      if (!sp?.web) return null;
      return await sp.web.getFileByServerRelativePath(serverRelativeUrl).getBuffer();
    },
    [sp]
  );

  /**
   * Build a transcript-ready ZIP package for one province containing:
   *  - survey_data.xlsx  (all records + TranscriptMainInsight / TranscriptNewShopLocation columns)
   *  - audio_manifest.csv  (one row per audio file: ItemId, SurveyId, QuestionId, AudioFile, …)
   *  - audio/{itemId}_{questionId}.wav  (deterministic filename, no random suffix)
   *
   * @param {string}   province   — 'Cabinda' | 'Bié' | 'Zaire'
   * @param {Function} onProgress — optional callback({ current, total })
   */
  const exportProvincePackage = useCallback(
    async (province, onProgress) => {
      if (!sp?.web) throw new Error('SharePoint não inicializado');

      // 1. Fetch all records
      const records = await getProvinceRecords(province, { top: 5000 });
      const withAudio = records.filter(r => r.TemGravacoes === 'Sim');

      const zip = new JSZip();
      const manifestRows = [];

      // 2. Download audio, rename to deterministic filenames, build manifest
      for (let i = 0; i < withAudio.length; i++) {
        const item = withAudio[i];
        onProgress?.({ current: i + 1, total: withAudio.length });

        const questionIds = (item.CamposComGravacao || '')
          .split(',').map(s => s.trim()).filter(Boolean);

        let atts = [];
        try {
          atts = await getItemAttachments(province, item.Id);
        } catch { /* item may have no attachments */ }

        for (const qId of questionIds) {
          const att = atts.find(a => a.FileName.startsWith(qId + '_'));
          if (!att) continue;

          let buf;
          try {
            buf = await downloadAttachment(att.ServerRelativeUrl);
          } catch { continue; }

          const audioFileName = `${item.Id}_${qId}.wav`;
          zip.file(`audio/${audioFileName}`, buf);

          manifestRows.push({
            ItemId:           item.Id,
            SurveyId:         item.SurveyId || '',
            Province:         item.Provincia || province,
            Municipality:     item.Municipio || '',
            Date:             item.DataPreenchimento
              ? new Date(item.DataPreenchimento).toLocaleDateString('pt-AO')
              : '',
            QuestionId:       qId,
            QuestionLabel:    QUESTION_LABELS[qId] || qId,
            AudioFile:        audioFileName,
            TranscriptStatus: 'pending',
          });
        }
      }

      // 3. Build Excel with clean columns + transcript reference columns
      const ws = buildExcelWorksheet(records, r => ({
        'Transcrição — Insight':      r.CamposComGravacao?.includes('mainInsight')     ? `${r.Id}_mainInsight.wav`     : '',
        'Transcrição — Novas lojas':  r.CamposComGravacao?.includes('newShopLocation') ? `${r.Id}_newShopLocation.wav` : '',
      }));
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, province);
      const xlsxBuffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
      zip.file('survey_data.xlsx', xlsxBuffer);

      // 4. Build manifest CSV (empty manifest if no audio)
      if (manifestRows.length > 0) {
        const csvHeader = Object.keys(manifestRows[0]).join(',');
        const csvBody   = manifestRows
          .map(r => Object.values(r).map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
          .join('\n');
        zip.file('audio_manifest.csv', csvHeader + '\n' + csvBody);
      } else {
        zip.file('audio_manifest.csv', 'ItemId,SurveyId,Province,Municipality,Date,QuestionId,QuestionLabel,AudioFile,TranscriptStatus\n');
      }

      // 5. Trigger download
      const blob = await zip.generateAsync({ type: 'blob' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `${province}_transcript_export_${Date.now()}.zip`;
      a.click();
      URL.revokeObjectURL(url);

      return { totalRecords: records.length, audioFiles: manifestRows.length };
    },
    [sp, getProvinceRecords, getItemAttachments, downloadAttachment]
  );

  /**
   * Test the SharePoint connection and survey list access
   */
  const testSharePointConnection = useCallback(
    async () => {
      if (!sp?.web) {
        return { success: false, message: 'SharePoint not initialized' };
      }
      try {
        const web = await sp.web.get();
        const list = await sp.web.lists.getByTitle("Huila_CustumerExp_Survey").get();
        const fields = await sp.web.lists.getByTitle("Huila_CustumerExp_Survey").fields
          .filter("Hidden eq false and ReadOnlyField eq false")();
        return { success: true, message: 'SharePoint connection successful', webTitle: web.Title, listTitle: list.Title, fieldsCount: fields.length };
      } catch (error) {
        console.error('SharePoint connection test failed:', error);
        return { success: false, message: 'SharePoint connection failed', error: error.message };
      }
    },
    [sp]
  );

  return {
    sp,
    isSharePointReady: !!sp?.web,
    // Huila survey
    saveSurveyResponse,
    uploadAudioRecordings,
    // Cabinda / Bié / Zaire pre-launch survey
    saveCabindaSurveyResponse,
    uploadPreLaunchAudio,
    // List setup (run once)
    createPreLaunchLists,
    // Admin panel
    checkIsOwner,
    getProvinceRecords,
    getProvinceCount,
    deleteProvinceRecord,
    updateProvinceRecord,
    getItemAttachments,
    downloadAttachment,
    exportProvincePackage,
    buildExcelWorksheet,
    getSurveyTargetCounts,
    getSurveyDetailedStats,
    // Debug
    testSharePointConnection,
  };
};
