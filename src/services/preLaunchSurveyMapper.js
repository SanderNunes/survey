function resolveSubmissionDate(surveyData, submittedAt) {
  if (submittedAt instanceof Date && !Number.isNaN(submittedAt.getTime())) {
    return submittedAt;
  }

  const completedAt = surveyData?.metadata?.completedAt;
  if (completedAt) {
    const date = new Date(completedAt);
    if (!Number.isNaN(date.getTime())) return date;
  }

  return new Date();
}

function getAudioQuestionIds(audioRecordings = {}) {
  return Object.entries(audioRecordings)
    .filter(([, recording]) => !!recording?.blob)
    .map(([questionId]) => questionId);
}

function getVoiceValue(surveyData, questionId, submittedDate) {
  const responses = surveyData?.responses || {};
  const text = responses[questionId] || '';
  const hasAudio = surveyData?.audioRecordings?.[questionId];
  if (hasAudio && text.includes('[Gravação de Áudio')) {
    return `Audio recording captured at ${submittedDate.toLocaleString()}`;
  }
  return text.includes('[Gravação de Áudio') ? '' : text;
}

export function buildPreLaunchSharePointItemData(
  surveyData,
  { isDuplicatePhone = false, submittedAt } = {},
) {
  const r = surveyData?.responses || {};
  const ci = surveyData?.customInputs || {};
  const meta = surveyData?.metadata || {};
  const submittedDate = resolveSubmissionDate(surveyData, submittedAt);
  const audioQuestionIds = getAudioQuestionIds(surveyData?.audioRecordings);

  return {
    Title: `${r.province || 'Pre-launch'} Survey - ${submittedDate.toLocaleDateString()}`,

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
    LocalNovasLojas:         getVoiceValue(surveyData, 'newShopLocation', submittedDate),
    FontesConfianca:         r.trustedCommunity || '',
    FontesConfiancaOutro:    ci.trustedCommunity || '',

    // Section 6 — Key Audio Insight
    InsightPrincipal:        getVoiceValue(surveyData, 'mainInsight', submittedDate),

    // Section 7 — Contact
    InteresseDiscussao:      r.interestedInDiscussion || '',
    NomeCliente:             r.nomeCliente || '',
    NumeroTelefone:          r.phoneNumber || '',

    // Audio metadata
    TemGravacoes:       audioQuestionIds.length > 0 ? 'Sim' : 'Nao',
    CamposComGravacao:  audioQuestionIds.join(', '),

    // Duplicate prevention fields
    SurveyId:    meta.surveyId || surveyData?.idempotencyKey || '',
    Fingerprint: meta.fingerprint || surveyData?.fingerprint || '',

    // Metadata
    DuracaoInquerito:    meta.duration || 0,
    NomeEntrevistador:   meta.interviewerName || '',
    DataPreenchimento:   submittedDate.toISOString(),
    StatusInquerito:     'Completo',
    Duplicado:           !!isDuplicatePhone,
  };
}

export function getPreLaunchSurveyId(surveyData) {
  return (
    surveyData?.metadata?.surveyId ||
    surveyData?.idempotencyKey ||
    surveyData?.metadata?.originalOfflineId ||
    ''
  );
}

export function getPreLaunchAudioQuestionIds(audioRecordings = {}) {
  return getAudioQuestionIds(audioRecordings);
}
