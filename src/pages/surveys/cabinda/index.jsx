import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronRight, ChevronLeft, Check, CheckCircle, Mic, Square, Play, Pause, Trash2, Save, Loader2, Wifi, WifiOff, User, AlertTriangle, RefreshCw } from 'lucide-react';
import { useSharePoint } from '@/hooks/useSharePoint';
import { useOfflineQueue, StorageError } from '@/hooks/useOfflineQueue';
import { audioService } from '@/services/audioService';
import { db } from '@/db/offlineDB';
import { assemblyClient } from '@/config/assemblyai';
import { useTranslation } from 'react-i18next';

const INTERVIEWER_NAME_KEY = 'cabinda_interviewer_name';

const AGE_ORDER = ['18–24', '25–34', '35–44', '45–54', '55+'];

const formatDuration = (s) => {
  if (!s || s <= 0) return null;
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${m}min ${sec}seg`;
  if (m > 0) return `${m} min ${sec} seg`;
  return `${sec} seg`;
};

const PreliminaryReport = ({ stats, loading, targets, total, duration }) => {
  return (
    <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold text-orange-800">Relatório Preliminar</p>
        {loading && <Loader2 className="w-3 h-3 text-orange-500 animate-spin" />}
      </div>
      {duration && (
        <p className="text-xs text-orange-700 mb-2">⏱ Duração do inquérito: <span className="font-medium">{formatDuration(duration)}</span></p>
      )}
      {stats ? (
        <div className="space-y-2">
          {Object.entries(targets).map(([mun, target]) => {
            const done = stats.municipalities?.[mun] || 0;
            const remaining = Math.max(0, target - done);
            const pct = Math.min(100, Math.round((done / target) * 100));
            return (
              <div key={mun}>
                <div className="flex justify-between text-xs text-orange-700 mb-1">
                  <span className="font-medium">{mun}</span>
                  <span>{done}/{target} ({remaining} em falta)</span>
                </div>
                <div className="w-full bg-orange-200 rounded-full h-1.5">
                  <div className="bg-orange-500 h-1.5 rounded-full transition-all duration-300" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
          <div className="pt-2 border-t border-orange-200 flex justify-between text-xs font-semibold text-orange-800">
            <span>Total</span>
            <span>{stats.total}/{total} — {Math.max(0, total - stats.total)} em falta</span>
          </div>
          {stats.genders && (
            <div className="pt-2 border-t border-orange-200 text-xs text-orange-700">
              <span className="font-medium">Género: </span>
              ♂ {stats.genders['Masculino'] || 0} Masculino &nbsp;/&nbsp; ♀ {stats.genders['Feminino'] || 0} Feminino
            </div>
          )}
          {stats.ages && Object.keys(stats.ages).length > 0 && (
            <div className="text-xs text-orange-700">
              <span className="font-medium">Faixa etária: </span>
              {AGE_ORDER.filter(a => stats.ages[a]).map(a => `${a}: ${stats.ages[a]}`).join(' | ')}
            </div>
          )}
        </div>
      ) : (
        !loading && <p className="text-xs text-orange-600">Não foi possível obter os dados do servidor.</p>
      )}
    </div>
  );
};

const CabindaSurvey = () => {
  const { t } = useTranslation();
  const [currentStep, setCurrentStep] = useState(0);
  const [currentSection, setCurrentSection] = useState('demographics');
  const [responses, setResponses] = useState({});
  const [customInputs, setCustomInputs] = useState({});
  const [audioRecordings, setAudioRecordings] = useState({});
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStep, setSaveStep] = useState(null);
  const [saveResult, setSaveResult] = useState(null);
  const [showSaveDialog, setShowSaveDialog] = useState(false);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioRef = useRef(null);
  const timerRef = useRef(null);
  const syncTimerRef = useRef(null);
  const isSavingRef = useRef(false);
  const isMountedRef = useRef(true);

  const [transcribingFor, setTranscribingFor] = useState(null); // questionId being transcribed after upload

  const { saveCabindaSurveyResponse, getSurveyDetailedStats, isSharePointReady, currentUserName } = useSharePoint();

  // Offline-first queue: handles IndexedDB storage, quota checks, retry + sync
  const { isOnline, pendingCount, storageInfo, syncProgress, saveSurvey, triggerSync } = useOfflineQueue(saveCabindaSurveyResponse);
  const [detailedStats, setDetailedStats] = useState(null);
  const [detailedStatsLoading, setDetailedStatsLoading] = useState(false);
  const [surveyStartTime, setSurveyStartTime] = useState(null);
  const [surveyDuration, setSurveyDuration] = useState(null);
  const [localTextValues, setLocalTextValues] = useState({});
  const [interviewerName, setInterviewerName] = useState('');
  const [showInterviewerModal, setShowInterviewerModal] = useState(false);
  const [interviewerNameDraft, setInterviewerNameDraft] = useState('');



  // Show interviewer name confirmation on first load / each new survey
  useEffect(() => {
    const stored = localStorage.getItem(INTERVIEWER_NAME_KEY);
    if (stored) {
      setInterviewerName(stored);
      setInterviewerNameDraft(stored);
    } else {
      const fallback = currentUserName || '';
      setInterviewerNameDraft(fallback);
    }
    setShowInterviewerModal(true);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const confirmInterviewerName = useCallback(() => {
    const name = interviewerNameDraft.trim();
    setInterviewerName(name);
    localStorage.setItem(INTERVIEWER_NAME_KEY, name);
    setShowInterviewerModal(false);
  }, [interviewerNameDraft]);

  // Fetch SP stats on mount (when SP is ready)
  useEffect(() => {
    if (isSharePointReady) fetchDetailedStats();
  }, [isSharePointReady]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Survey data ──────────────────────────────────────────────────────────

  const municipalitiesMap = {
    'Cabinda': ['Cabinda'],
    'Zaire':   ["M'banza Congo", 'Soyo'],
  };

  const surveyData = {
    provinces:          ['Cabinda', 'Zaire'],
    ageGroups:          ['18–24', '25–34', '35–44', '45–54', '55+'],
    genders:            ['Masculino', 'Feminino'],
    occupations:        ['Estudante', 'Empregado - Privado', 'Empregado - Público', 'Trabalhador(a) por conta própria', 'Desempregado(a)', 'Outro (especificar)'],
    phoneTypes:         ['Smartphone', 'Feature Phone (Básico)'],
    yesNoDontKnow:      ['Sim', 'Não', 'Não sei'],
    simConfigs:         ['SIM único', 'Dual SIM'],
    operators:          ['Unitel', 'Movicel', 'Ambos'],
    visibilityOptions:  ['Unitel', 'Movicel', 'Ambos por igual', 'Nenhum'],
    coverageAreas:      ['Centro da cidade', 'Estradas principais', 'Zonas rurais', 'Mercados', 'Zonas fronteiriças', 'Outro (especificar)'],
    primaryUse:         ['Chamadas', 'Dados', 'SMS', 'Todos por igual'],
    rechargeFrequency:  ['Diariamente', 'De vez em quando', 'Semanalmente', 'Quinzenalmente', 'Mensalmente'],
    rechargeAmounts:    ['<200 Kz', '200–500 Kz', '500–1.000 Kz', '1.000–2.500 Kz', '2.500–5.000 Kz', '5.000+ Kz'],
    rechargeLocations:  ['Vendedores de rua (Agentes)', 'Lojas', 'Quiosques', 'EMIS', 'E-banking', 'Outro (especificar)'],
    rechargeReasons:    ['Conveniência', 'Proximidade', 'Confiança', 'Única opção disponível', 'Outro (especificar)'],
    bundleTypes:        ['Apenas dados', 'Apenas voz', 'Misto (voz + dados)', 'Redes sociais', 'Noturno/fim de semana', 'Pré-pago sem pacote'],
    promotionSources:   ['Mercados', 'Lojas/Quiosques', 'Redes sociais', 'Amigos/Família', 'Escola/Universidade', 'Igreja/Comunidade', 'TV/Rádio', 'Vizinhos/Conhecidos', 'Outro (especificar)'],
    trustedSources:     ['Escolas/Universidades', 'Igrejas', 'Líderes comunitários', 'Mercados locais', 'Lojas de bairro', 'Outro (especificar)'],
  };

  // ─── Section & question definitions ───────────────────────────────────────

  const sections = {
    demographics: {
      title: 'Secção 1: Triagem e Dados Demográficos',
      questions: [
        { id: 'province',     text: 'Província / Região',   type: 'dropdown', options: surveyData.provinces },
        { id: 'municipality', text: 'Município',             type: 'cascade',  dependsOn: 'province', optionsMap: municipalitiesMap },
        { id: 'ageGroup',     text: 'Faixa Etária',          type: 'dropdown', options: surveyData.ageGroups },
        { id: 'gender',       text: 'Género',                type: 'dropdown', options: surveyData.genders },
        { id: 'occupation',   text: 'Ocupação',              type: 'dropdown', options: surveyData.occupations, hasOther: true },
      ],
    },
    deviceConnectivity: {
      title: 'Secção 2: Perfil de Dispositivo e Conectividade',
      questions: [
        { id: 'phoneType',   text: 'Tipo de Telefone',           type: 'dropdown', options: surveyData.phoneTypes },
        { id: 'supports4G',  text: 'O seu telefone suporta 4G/LTE?', type: 'dropdown', options: surveyData.yesNoDontKnow },
        { id: 'simConfig',   text: 'Configuração SIM',           type: 'dropdown', options: surveyData.simConfigs },
      ],
    },
    operatorPerception: {
      title: 'Secção 3: Operador Atual e Perceção de Rede',
      questions: [
        { id: 'currentOperator',     text: 'Operador(es) móvel(is) atual(is)',                               type: 'dropdown', options: surveyData.operators },
        { id: 'operatorSatisfaction',text: 'Satisfação geral com o operador atual (1–5)',                    type: 'likert',   scale: 5, lowLabel: 'Muito Insatisfeito', highLabel: 'Muito Satisfeito' },
        { id: 'networkCoverage',     text: 'Como avalia a cobertura de rede na sua zona? (1–5)',             type: 'likert',   scale: 5, lowLabel: 'Muito Fraco',        highLabel: 'Muito Bom' },
        { id: 'mostVisibleOperator', text: 'Qual operador tem mais publicidade/marca visível na sua zona?',  type: 'dropdown', options: surveyData.visibilityOptions },
        { id: 'worstCoverageAreas',  text: 'Quais zonas ou percursos na sua área têm pior cobertura móvel?', type: 'multiple', options: surveyData.coverageAreas, hasOther: true },
      ],
    },
    usageRecharge: {
      title: 'Secção 4: Utilização, Recargas e Gastos',
      questions: [
        { id: 'primaryPhoneUse',    text: 'O que utiliza mais no telemóvel?',               type: 'dropdown', options: surveyData.primaryUse },
        { id: 'rechargeFrequency',  text: 'Com que frequência compra saldo?',               type: 'dropdown', options: surveyData.rechargeFrequency },
        { id: 'rechargeAmount',     text: 'Valor típico de recarga (Kz)',                   type: 'dropdown', options: surveyData.rechargeAmounts },
        { id: 'rechargeLocation',   text: 'Onde costuma comprar saldo?',                    type: 'multiple', options: surveyData.rechargeLocations, hasOther: true },
        { id: 'rechargeReason',     text: 'Por que escolheste este local ou plataforma?',    type: 'dropdown', options: surveyData.rechargeReasons, hasOther: true },
        { id: 'usesMobileMoney',    text: 'Usa Mobile Money?',                              type: 'yesno' },
      ],
    },
    preferences: {
      title: 'Secção 5: Preferências, Mudança e Ofertas',
      questions: [
        { id: 'preferredBundle',    text: 'Que tipo de pacote prefere?',                                                                                           type: 'dropdown', options: surveyData.bundleTypes },
        { id: 'wouldSwitch',        text: 'Mudaria para um novo operador com preços 20% mais baixos e mesma cobertura?',                                           type: 'yesnomaybe' },
        { id: 'hardToGiveUp',       text: 'Existe alguma oferta do seu operador atual que seria difícil abandonar?',                                               type: 'yesno', followUp: 'Se sim, especifique a oferta' },
        { id: 'promotionSource',    text: 'Onde costuma ver promoções ou ouvir sobre ofertas?',                                                                    type: 'multiple', options: surveyData.promotionSources, hasOther: true },
        { id: 'newShopLocation',    text: '🎤 Onde deveriam existir novas lojas de telecomunicações, e porquê?',                                                   type: 'voice' },
        { id: 'trustedCommunity',   text: 'Quem são as pessoas ou locais do seu bairro que costuma ouvir antes de comprar alguma coisa?',    type: 'multiple', options: surveyData.trustedSources, hasOther: true },
      ],
    },
    keyInsight: {
      title: 'Secção 6: Gravação de Áudio — Insight Principal',
      questions: [
        {
          id: 'mainInsight',
          text: 'Em 30–60 segundos, diga-nos: Qual é o maior problema com a sua rede atual? O que o faria mudar para um novo operador? Qual plano/pacote utiliza com a Unitel?',
          type: 'voice',
        },
      ],
    },
    contact: {
      title: 'Secção 7: Dados de Contacto',
      questions: [
        { id: 'interestedInDiscussion', text: 'Interesse em participar numa discussão remunerada sobre telecomunicações na sua área?', type: 'yesno' },
        { id: 'nomeCliente',            text: 'Nome',                                                                                   type: 'text', inputType: 'text', placeholder: 'O seu nome' },
        { id: 'phoneNumber',            text: 'Número de telefone',                                                                    type: 'text', inputType: 'tel',  placeholder: '9XXXXXXXX' },
      ],
    },
  };

  const sectionOrder = ['demographics', 'deviceConnectivity', 'operatorPerception', 'usageRecharge', 'preferences', 'keyInsight', 'contact'];

  // ─── Duplicate prevention ──────────────────────────────────────────────────

  const generateSurveyId = () => crypto.randomUUID();

  const generateFingerprint = () => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillText('Survey fingerprint', 2, 2);
    const fingerprint = {
      screen: `${screen.width}x${screen.height}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      language: navigator.language,
      canvas: canvas.toDataURL(),
      userAgent: navigator.userAgent.substring(0, 50),
    };
    return btoa(JSON.stringify(fingerprint)).substring(0, 20);
  };

  const checkForDuplicates = (newSurveyData) => {
    let existingSurveys = [];
    try {
      existingSurveys = JSON.parse(localStorage.getItem('offline-cabinda-surveys') || '[]');
    } catch {
      existingSurveys = [];
    }
    const duplicateByResponses = existingSurveys.find(
      survey => JSON.stringify(survey.responses) === JSON.stringify(newSurveyData.responses)
    );
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    const recentDuplicate = existingSurveys.find(
      survey => new Date(survey.timestamp).getTime() > fiveMinutesAgo
    );
    return {
      hasExactDuplicate: !!duplicateByResponses,
      hasRecentSubmission: !!recentDuplicate,
      duplicateId: duplicateByResponses?.id || recentDuplicate?.id,
    };
  };

  const convertBlobToBase64 = (blob) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('FileReader failed to encode audio'));
      reader.readAsDataURL(blob);
    });

  // ─── Offline save ──────────────────────────────────────────────────────────

  const saveOffline = async (surveyDataToSave) => {
    try {
      const surveyId = generateSurveyId();
      const fingerprint = generateFingerprint();
      const timestamp = new Date().toISOString();

      const duplicateCheck = checkForDuplicates(surveyDataToSave);
      if (duplicateCheck.hasExactDuplicate) {
        return { success: false, message: 'Este inquérito já foi submetido anteriormente.', isDuplicate: true, duplicateId: duplicateCheck.duplicateId };
      }
      if (duplicateCheck.hasRecentSubmission) {
        const confirmed = window.confirm('Detectámos uma submissão recente. Tem certeza que deseja submeter outro inquérito?');
        if (!confirmed) return { success: false, message: 'Submissão cancelada pelo utilizador.', wasCancelled: true };
      }

      const audioData = {};
      for (const [key, recording] of Object.entries(audioRecordings)) {
        if (recording?.blob) audioData[key] = await convertBlobToBase64(recording.blob);
      }

      const offlineData = {
        ...surveyDataToSave,
        id: surveyId,
        timestamp,
        fingerprint,
        status: 'pending',
        audioData,
        metadata: { ...surveyDataToSave.metadata, submissionMethod: 'offline', deviceInfo: { userAgent: navigator.userAgent, screen: `${screen.width}x${screen.height}`, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone } },
      };

      let existing = [];
      try {
        existing = JSON.parse(localStorage.getItem('offline-cabinda-surveys') || '[]');
      } catch {
        existing = [];
      }
      try {
        const updated = [...existing, offlineData];
        localStorage.setItem('offline-cabinda-surveys', JSON.stringify(updated));
        setPendingSurveys(updated);
      } catch (e) {
        if (e.name === 'QuotaExceededError') {
          return { success: false, message: 'Armazenamento local cheio. Liberte espaço e tente novamente.' };
        }
        throw e;
      }

      return { success: true, message: 'Inquérito guardado localmente. Será sincronizado quando houver conexão.', itemId: `OFFLINE_${surveyId}`, surveyId };
    } catch (error) {
      return { success: false, message: 'Erro ao guardar offline.', error: error.message };
    }
  };

  // ─── SharePoint save ───────────────────────────────────────────────────────

  const saveToSharePoint = useCallback(async (_surveyDataToSave) => {
    const surveyId = generateSurveyId();
    const fingerprint = generateFingerprint();
    const duration = surveyStartTime ? Math.round((Date.now() - surveyStartTime) / 1000) : 0;

    const formattedData = {
      responses: responses,
      customInputs: customInputs,
      audioRecordings: audioRecordings,
      metadata: {
        section: currentSection,
        completedAt: new Date().toISOString(),
        surveyId,
        fingerprint,
        duration,
        interviewerName: interviewerName || currentUserName || '',
        submissionMethod: 'online',
        deviceInfo: { userAgent: navigator.userAgent, screen: `${screen.width}x${screen.height}`, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone },
      },
    };

    if (responses.interestedInDiscussion === 'Sim' && responses.phoneNumber) {
      formattedData.contactInfo = { name: responses.nomeCliente, phone: responses.phoneNumber };
    }

    const result = await saveCabindaSurveyResponse(formattedData, setSaveStep);
    if (!result.success) throw new Error(result.message || 'SharePoint save failed');

    if (duration > 0) setSurveyDuration(duration);
    return {
      success: true,
      message: result.message || 'Inquérito enviado com sucesso para SharePoint!',
      itemId: result.itemId || `SP_${surveyId}`,
      surveyId,
    };
  }, [responses, customInputs, audioRecordings, currentSection, surveyStartTime, interviewerName, currentUserName, saveCabindaSurveyResponse]);


  // ─── Submission targets ────────────────────────────────────────────────────

  const MUNICIPALITY_TARGETS = { 'Cabinda': 600, "M'banza Congo": 100, 'Soyo': 300 };
  const TOTAL_TARGET = 1000;

  const fetchDetailedStats = useCallback(async () => {
    if (!getSurveyDetailedStats) return;
    setDetailedStatsLoading(true);
    try {
      const stats = await getSurveyDetailedStats();
      if (stats) setDetailedStats(stats);
    } finally {
      setDetailedStatsLoading(false);
    }
  }, [getSurveyDetailedStats]);

  // ─── Reset ─────────────────────────────────────────────────────────────────

  const startNewSurvey = () => {
    setResponses({});
    setCustomInputs({});
    setAudioRecordings({});
    setCurrentStep(0);
    setCurrentSection('demographics');
    setShowSaveDialog(false);
    setSaveResult(null);
    setIsSaving(false);
    setSurveyStartTime(null);
    setSurveyDuration(null);
    setLocalTextValues({});
    // Re-confirm interviewer identity for each new survey
    const stored = localStorage.getItem(INTERVIEWER_NAME_KEY) || currentUserName || '';
    setInterviewerNameDraft(stored);
    setShowInterviewerModal(true);
  };

  // ─── Main save ─────────────────────────────────────────────────────────────

  const proceedSave = useCallback(async () => {
    setIsSaving(true);
    setSaveResult(null);

    const duration    = surveyStartTime ? Math.round((Date.now() - surveyStartTime) / 1000) : 0;
    const fingerprint = generateFingerprint();

    const surveyPayload = {
      responses,
      customInputs,
      fingerprint,
      metadata: {
        section:            currentSection,
        completedAt:        new Date().toISOString(),
        fingerprint,
        duration,
        interviewerName:    interviewerName || currentUserName || '',
        submissionMethod:   isOnline ? 'online' : 'offline',
        deviceInfo: {
          userAgent: navigator.userAgent,
          screen:    `${screen.width}x${screen.height}`,
          timezone:  Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
      },
    };

    if (responses.interestedInDiscussion === 'Sim' && responses.phoneNumber) {
      surveyPayload.contactInfo = { name: responses.nomeCliente, phone: responses.phoneNumber };
    }

    try {
      let result;
      if (isOnline) {
        try {
          // Happy path: try direct SharePoint save first
          result = await saveToSharePoint(surveyPayload);
          if (duration > 0) setSurveyDuration(duration);
        } catch {
          // Network failed mid-save → queue to IndexedDB for retry
          await saveSurvey({ surveyData: surveyPayload, audioRecordings, province: 'cabinda' });
          result = { success: true, message: 'Falhou envio direto. Guardado para sincronização automática.', itemId: null };
        }
      } else {
        // Offline: persist to IndexedDB queue (no Base64, no localStorage)
        await saveSurvey({ surveyData: surveyPayload, audioRecordings, province: 'cabinda' });
        result = { success: true, message: 'Inquérito guardado localmente. Será sincronizado quando houver conexão.', itemId: null };
      }

      setSaveResult(result);
      if (result.success) fetchDetailedStats();
    } catch (error) {
      if (error instanceof StorageError) {
        setSaveResult({ success: false, message: error.message });
      } else {
        setSaveResult({ success: false, message: t('cabinda.validation.unexpected'), error: error.message });
      }
    } finally {
      setIsSaving(false);
      setSaveStep(null);
      isSavingRef.current = false;
    }
  }, [responses, customInputs, currentSection, isOnline, saveToSharePoint, saveSurvey, interviewerName, currentUserName, surveyStartTime, audioRecordings, t]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSaveSurvey = useCallback(async () => {
    if (isSavingRef.current) return;
    isSavingRef.current = true;
    if (Object.keys(responses).length === 0) {
      isSavingRef.current = false;
      setSaveResult({ success: false, message: t('cabinda.validation.noAnswers') });
      return;
    }
    await proceedSave();
  }, [responses, proceedSave, t]);


  // ─── Audio recording ───────────────────────────────────────────────────────

  const startRecording = async (questionId) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorderOptions = audioService.getRecorderOptions(); // WebM/Opus @ 32 kbps
      const mediaRecorder   = new MediaRecorder(stream, recorderOptions);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => audioChunksRef.current.push(e.data);
      mediaRecorder.onstop = async () => {
        const mimeType = audioService.resolveMimeType(recorderOptions, mediaRecorder);
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        const audioUrl  = URL.createObjectURL(audioBlob);
        stream.getTracks().forEach(track => track.stop());

        // Save recording immediately with placeholder response
        setAudioRecordings(prev => ({ ...prev, [questionId]: { blob: audioBlob, url: audioUrl, transcript: '' } }));
        handleResponse(questionId, `[Gravação de Áudio - ${new Date().toLocaleTimeString()}]`);

        // Upload to AssemblyAI for transcription (non-blocking, non-fatal)
        if (isOnline && import.meta.env.VITE_ASSEMBLYAI_API_KEY) {
          setTranscribingFor(questionId);
          try {
            const result = await assemblyClient.transcripts.transcribe({
              audio: audioBlob,
              language_code: 'pt',
            });
            if (!isMountedRef.current) return;
            const transcript = result.text || '';
            if (transcript) {
              setAudioRecordings(prev =>
                prev[questionId] ? { ...prev, [questionId]: { ...prev[questionId], transcript } } : prev
              );
              handleResponse(questionId, transcript);
            }
          } catch (err) {
            console.warn('Transcription upload failed:', err.message);
          } finally {
            if (isMountedRef.current) setTranscribingFor(null);
          }
        }
      };

      const MAX_RECORDING_SECONDS = 120;
      mediaRecorder.start();
      setIsRecording(questionId);
      setRecordingTime(0);
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => {
          if (prev + 1 >= MAX_RECORDING_SECONDS) {
            clearInterval(timerRef.current);
            if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
              mediaRecorderRef.current.stop();
              setIsRecording(false);
            }
          }
          return prev + 1;
        });
      }, 1000);
    } catch {
      alert(t('cabinda.recording.micError'));
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const playAudio = (questionId) => {
    const recording = audioRecordings[questionId];
    if (recording && audioRef.current) {
      audioRef.current.src = recording.url;
      audioRef.current.play().catch((err) => console.warn('Audio playback blocked:', err));
      setIsPlaying(questionId);
      audioRef.current.onended = () => setIsPlaying(false);
    }
  };

  const deleteAudio = (questionId) => {
    setAudioRecordings(prev => {
      const updated = { ...prev };
      if (updated[questionId]) { URL.revokeObjectURL(updated[questionId].url); delete updated[questionId]; }
      return updated;
    });
    setResponses(prev => ({ ...prev, [questionId]: '' }));
  };

  const formatTime = (seconds) => `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, '0')}`;

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  // ─── Response handling ─────────────────────────────────────────────────────

  const handleResponse = (questionId, value, customValue = '') => {
    if (!surveyStartTime) setSurveyStartTime(Date.now());
    setResponses(prev => ({ ...prev, [questionId]: value }));
    if (customValue !== undefined && customValue !== '') {
      setCustomInputs(prev => ({ ...prev, [questionId]: customValue }));
    }
    // Clear municipality when province changes
    if (questionId === 'province') {
      setResponses(prev => ({ ...prev, province: value, municipality: '' }));
    }
  };

  // ─── Navigation ────────────────────────────────────────────────────────────

  const getCurrentQuestion = () => sections[currentSection].questions[currentStep];

  const nextStep = () => {
    if (isRecording) stopRecording();
    const question = getCurrentQuestion();

    // If respondent answers "Não" to discussion interest, skip name/phone and go straight to save
    if (question.id === 'interestedInDiscussion' && responses['interestedInDiscussion'] === 'Não') {
      setShowSaveDialog(true);
      return;
    }

    const sectionQuestions = sections[currentSection].questions;
    if (currentStep < sectionQuestions.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      const idx = sectionOrder.indexOf(currentSection);
      if (idx < sectionOrder.length - 1) {
        setCurrentSection(sectionOrder[idx + 1]);
        setCurrentStep(0);
      } else {
        setShowSaveDialog(true);
      }
    }
  };

  const prevStep = () => {
    if (isRecording) stopRecording();
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    } else {
      const idx = sectionOrder.indexOf(currentSection);
      if (idx > 0) {
        const prevSection = sectionOrder[idx - 1];
        setCurrentSection(prevSection);
        setCurrentStep(sections[prevSection].questions.length - 1);
      }
    }
  };

  const isStepComplete = () => {
    const question = getCurrentQuestion();
    if (question.optional) return true;

    const value = responses[question.id] || '';
    const customValue = customInputs[question.id] || '';

    if (question.type === 'text') {
      if (responses['interestedInDiscussion'] === 'Sim') {
        if (question.id === 'nomeCliente') return !!value.trim();
        if (question.id === 'phoneNumber') return /^9\d{8}$/.test(value.trim());
      }
      return true; // all other text fields are optional
    }
    if (!value) return false;

    if (question.type === 'voice') return !!(audioRecordings[question.id] || value.trim() || isRecording === question.id);

    if (question.type === 'multiple') {
      const selected = value ? value.split(',') : [];
      if (selected.length === 0) return false;
      if (question.hasOther && selected.includes('Outro (especificar)')) return !!customValue.trim();
      return true;
    }

    if (question.hasOther && value === 'Outro (especificar)') return !!customValue.trim();
    if (question.type === 'yesno' && value === 'Sim' && question.followUp) return !!customValue.trim();

    return true;
  };

  // ─── Question renderers ────────────────────────────────────────────────────

  const renderQuestion = (question) => {
    const currentValue = responses[question.id] || '';
    const customValue = customInputs[question.id] || '';

    switch (question.type) {
      case 'dropdown':
        return (
          <div className="space-y-4">
            <select
              value={currentValue}
              onChange={(e) => handleResponse(question.id, e.target.value)}
              className="w-full p-3 sm:p-4 border-2 border-gray-300 rounded-lg focus:border-primary focus:outline-none text-base text-black"
            >
              <option value="">{t('cabinda.form.selectOption')}</option>
              {question.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
            {question.hasOther && currentValue === 'Outro (especificar)' && (
              <input
                type="text"
                placeholder={t('cabinda.form.specifyOther')}
                value={customValue}
                onChange={(e) => handleResponse(question.id, currentValue, e.target.value)}
                className="w-full p-3 sm:p-4 border-2 border-gray-300 rounded-lg focus:border-primary focus:outline-none text-base text-black"
              />
            )}
          </div>
        );

      case 'cascade': {
        const parentValue = responses[question.dependsOn] || '';
        const options = question.optionsMap?.[parentValue] || [];
        return (
          <div className="space-y-3">
            {!parentValue && (
              <p className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-lg p-3">
                {t('cabinda.form.selectProvince')}
              </p>
            )}
            <select
              value={currentValue}
              onChange={(e) => handleResponse(question.id, e.target.value)}
              disabled={!parentValue}
              className="w-full p-3 sm:p-4 border-2 border-gray-300 rounded-lg focus:border-primary focus:outline-none text-base text-black disabled:opacity-50 disabled:bg-gray-100"
            >
              <option value="">{t('cabinda.form.selectMunicipality')}</option>
              {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          </div>
        );
      }

      case 'likert':
        return (
          <div className="space-y-4">
            <div className="flex justify-between text-xs sm:text-sm text-gray-600 mb-3 px-2">
              <span>{question.lowLabel || 'Muito Insatisfeito'}</span>
              <span>{question.highLabel || 'Muito Satisfeito'}</span>
            </div>
            <div className="flex justify-between px-2">
              {[1, 2, 3, 4, 5].map(value => (
                <label key={value} className="flex flex-col items-center cursor-pointer p-2">
                  <input
                    type="radio"
                    name={question.id}
                    value={value}
                    checked={currentValue === value}
                    onChange={(e) => handleResponse(question.id, parseInt(e.target.value, 10))}
                    className="mb-2 scale-125 sm:scale-150 accent-primary"
                  />
                  <span className="text-base sm:text-lg font-bold">{value}</span>
                </label>
              ))}
            </div>
          </div>
        );

      case 'yesno':
        return (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              {[{ val: 'Sim', label: t('ui.yes') }, { val: 'Não', label: t('ui.no') }].map(({ val, label }) => (
                <label key={val} className="flex items-center cursor-pointer p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                  <input
                    type="radio"
                    name={question.id}
                    value={val}
                    checked={currentValue === val}
                    onChange={(e) => handleResponse(question.id, e.target.value)}
                    className="mr-3 scale-125 accent-primary"
                  />
                  <span className="text-base sm:text-lg">{label}</span>
                </label>
              ))}
            </div>
            {currentValue === 'Sim' && question.followUp && (
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">{question.followUp}</label>
                <textarea
                  placeholder={question.followUp}
                  value={customValue}
                  onChange={(e) => handleResponse(question.id, currentValue, e.target.value)}
                  className="w-full p-3 sm:p-4 border-2 border-gray-300 rounded-lg focus:border-primary focus:outline-none h-20 sm:h-24 text-base text-black"
                />
              </div>
            )}
          </div>
        );

      case 'yesnomaybe':
        return (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              {[{ val: 'Sim', label: t('ui.yes') }, { val: 'Talvez', label: t('ui.maybe') }, { val: 'Não', label: t('ui.no') }].map(({ val, label }) => (
                <label key={val} className="flex items-center cursor-pointer p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                  <input
                    type="radio"
                    name={question.id}
                    value={val}
                    checked={currentValue === val}
                    onChange={(e) => handleResponse(question.id, e.target.value)}
                    className="mr-3 scale-125 accent-primary"
                  />
                  <span className="text-base sm:text-lg">{label}</span>
                </label>
              ))}
            </div>
          </div>
        );

      case 'multiple': {
        const selectedValues = currentValue ? currentValue.split(',') : [];
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              {question.options.map(option => (
                <label key={option} className="flex items-center cursor-pointer p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                  <input
                    type="checkbox"
                    checked={selectedValues.includes(option)}
                    onChange={(e) => {
                      const newValues = e.target.checked
                        ? [...selectedValues, option]
                        : selectedValues.filter(v => v !== option);
                      handleResponse(question.id, newValues.join(','));
                    }}
                    className="mr-3 scale-125 accent-primary"
                  />
                  <span className="text-sm sm:text-base">{option}</span>
                </label>
              ))}
            </div>
            {question.hasOther && selectedValues.includes('Outro (especificar)') && (
              <input
                type="text"
                placeholder="Por favor, especifique"
                value={customValue}
                onChange={(e) => handleResponse(question.id, currentValue, e.target.value)}
                className="w-full p-3 sm:p-4 border-2 border-gray-300 rounded-lg focus:border-primary focus:outline-none text-base text-black"
              />
            )}
          </div>
        );
      }

      case 'voice': {
        const hasRecording = audioRecordings[question.id];
        const isCurrentlyRecording = isRecording === question.id;
        const isCurrentlyPlaying = isPlaying === question.id;
        return (
          <div className="space-y-4">
            <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-4 sm:p-6">
              <div className="flex flex-col items-center space-y-3 sm:space-y-4">
                {!hasRecording ? (
                  <>
                    <div className="text-center">
                      <p className="text-gray-600 mb-2 text-sm sm:text-base">{t('cabinda.recording.instruction')}</p>
                      <p className="text-xs sm:text-sm text-gray-500">{t('cabinda.recording.subInstruction')}</p>
                    </div>
                    {!isCurrentlyRecording ? (
                      <button
                        onClick={() => startRecording(question.id)}
                        disabled={isRecording && isRecording !== question.id}
                        className="flex items-center px-4 py-2 sm:px-6 sm:py-3 bg-primary text-white rounded-full hover:bg-primaryDark transition-colors shadow-lg disabled:opacity-50"
                      >
                        <Mic className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                        <span className="text-sm sm:text-base">
                          {isRecording && isRecording !== question.id ? t('cabinda.recording.otherRecording') : t('cabinda.recording.start')}
                        </span>
                      </button>
                    ) : (
                      <div className="text-center">
                        <div className="flex items-center justify-center mb-1 sm:mb-2">
                          <div className="w-3 h-3 sm:w-4 sm:h-4 bg-primary rounded-full animate-pulse mr-2"></div>
                          <span className="text-primary font-medium text-sm sm:text-base">{t('cabinda.recording.inProgress')} {formatTime(recordingTime)} / 2:00</span>
                        </div>
                        {recordingTime >= 110 && (
                          <p className="text-xs text-amber-600 font-medium mb-2 sm:mb-3">{120 - recordingTime} segundos restantes</p>
                        )}
                        <button onClick={stopRecording} className="flex items-center px-4 py-2 sm:px-6 sm:py-3 bg-gray-600 text-white rounded-full hover:bg-gray-700 transition-colors">
                          <Square className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                          <span className="text-sm sm:text-base">{t('cabinda.recording.stop')}</span>
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="w-full">
                    <div className="flex flex-col sm:flex-row items-center sm:justify-between bg-green-50 border border-green-200 rounded-lg p-3 sm:p-4 mb-3 sm:mb-4 gap-2 sm:gap-0">
                      <div className="flex items-center">
                        <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                        <span className="text-green-700 font-medium text-sm sm:text-base">{t('cabinda.recording.done')}</span>
                      </div>
                      {transcribingFor === question.id && (
                        <div className="flex items-center gap-2 text-xs text-blue-600 bg-blue-50 rounded px-2 py-1">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          <span>A transcrever…</span>
                        </div>
                      )}
                      {!transcribingFor && audioRecordings[question.id]?.transcript && (
                        <p className="text-xs text-gray-600 leading-relaxed bg-white rounded px-2 py-1 max-w-xs sm:max-w-sm italic">
                          {audioRecordings[question.id].transcript}
                        </p>
                      )}
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => playAudio(question.id)}
                          disabled={isCurrentlyPlaying}
                          className="flex items-center px-2 py-1 sm:px-3 sm:py-2 bg-primary text-white rounded hover:bg-primaryDark transition-colors disabled:opacity-50"
                        >
                          {isCurrentlyPlaying ? <Pause className="w-3 h-3 sm:w-4 sm:h-4" /> : <Play className="w-3 h-3 sm:w-4 sm:h-4" />}
                        </button>
                        <button onClick={() => deleteAudio(question.id)} className="flex items-center px-2 py-1 sm:px-3 sm:py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors">
                          <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                        </button>
                      </div>
                    </div>
                    <button
                      onClick={() => startRecording(question.id)}
                      disabled={isRecording && isRecording !== question.id}
                      className="w-full flex items-center justify-center px-3 py-2 sm:px-4 sm:py-2 border border-gray-300 text-gray-600 rounded hover:bg-gray-50 transition-colors disabled:opacity-50"
                    >
                      <Mic className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                      <span className="text-sm sm:text-base">
                        {isRecording && isRecording !== question.id ? t('cabinda.recording.otherRecording') : t('cabinda.recording.reRecord')}
                      </span>
                    </button>
                  </div>
                )}
              </div>
            </div>
            <div className="border-t pt-4">
              <p className="text-xs sm:text-sm text-gray-600 mb-2">{t('cabinda.recording.orWrite')}</p>
              <textarea
                placeholder={question.placeholder || t('cabinda.recording.writePlaceholder')}
                value={localTextValues[question.id] ?? (currentValue.includes('[Gravação de Áudio') ? '' : currentValue)}
                onChange={(e) => {
                  setLocalTextValues(prev => ({ ...prev, [question.id]: e.target.value }));
                  handleResponse(question.id, e.target.value);
                }}
                className="w-full p-3 sm:p-4 border-2 border-gray-300 rounded-lg focus:border-primary focus:outline-none h-20 sm:h-24 text-base text-black"
              />
            </div>
          </div>
        );
      }

      case 'text': {
        const isPhone = question.id === 'phoneNumber';
        const phoneInvalid = isPhone && currentValue.trim().length > 0 && !/^9\d{8}$/.test(currentValue.trim());
        return (
          <div className="space-y-3">
            <input
              type={question.inputType || 'text'}
              inputMode={isPhone ? 'numeric' : undefined}
              maxLength={isPhone ? 9 : undefined}
              placeholder={question.placeholder || t('cabinda.form.textPlaceholder')}
              value={currentValue}
              onChange={(e) => handleResponse(question.id, e.target.value)}
              className={`w-full p-3 sm:p-4 border-2 rounded-lg focus:outline-none text-base text-black ${phoneInvalid ? 'border-red-400 focus:border-red-500' : 'border-gray-300 focus:border-primary'}`}
            />
            {phoneInvalid && (
              <p className="text-xs text-red-500">O número deve começar com 9 e ter 9 dígitos</p>
            )}
            {question.optional && (
              <p className="text-xs text-gray-400 text-center">{t('ui.optional')}</p>
            )}
          </div>
        );
      }

      default:
        return null;
    }
  };

  // ─── Derived state ─────────────────────────────────────────────────────────

  const currentQuestion = getCurrentQuestion();
  if (!currentQuestion) return null;
  const currentSectionData = sections[currentSection];
  const totalSteps = currentSectionData.questions.length;
  const isLastStep = currentStep === totalSteps - 1;
  const isLastSection = currentSection === 'contact' && isLastStep;
  const isFirstStep = currentStep === 0 && currentSection === 'demographics';

  // Global progress across all sections
  const totalAllQuestions = sectionOrder.reduce((sum, sec) => sum + sections[sec].questions.length, 0);
  const questionsBeforeCurrentSection = sectionOrder
    .slice(0, sectionOrder.indexOf(currentSection))
    .reduce((sum, sec) => sum + sections[sec].questions.length, 0);
  const currentGlobalStep = questionsBeforeCurrentSection + currentStep + 1;

  // ─── Save step constants ───────────────────────────────────────────────────

  const SAVE_STEPS_ALL = ['checkingDuplicates', 'sendingData', 'uploadingAudio', 'done'];
  const SAVE_STEPS_LABELS = {
    checkingDuplicates: 'A verificar duplicados…',
    sendingData:        'A enviar dados…',
    uploadingAudio:     'A carregar áudio…',
    done:               'Concluído!',
  };
  const SAVE_STEPS_SHORT = {
    checkingDuplicates: 'Duplicados',
    sendingData:        'Envio',
    uploadingAudio:     'Áudio',
    done:               'Concluído',
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 py-4 px-3 sm:py-8 sm:px-4">
      {/* Connection status badge */}
      <div className={`fixed bottom-4 right-4 z-40 px-3 py-2 rounded-full shadow-lg transition-all duration-300 ${isOnline ? 'bg-green-500 text-white' : 'bg-red-500 text-white'} ${(pendingCount > 0 || syncProgress.isActive) ? 'animate-pulse' : ''}`}>
        <div className="flex items-center gap-2 text-xs sm:text-sm">
          {isOnline ? <Wifi className="w-3 h-3 sm:w-4 sm:h-4" /> : <WifiOff className="w-3 h-3 sm:w-4 sm:h-4" />}
          <span className="hidden sm:inline">{isOnline ? t('ui.online') : t('ui.offline')}</span>
          {(pendingCount > 0 || syncProgress.isActive) && (
            <span className="px-2 py-1 bg-white bg-opacity-20 rounded-full text-xs">
              {syncProgress.isActive ? `${syncProgress.current}/${syncProgress.total}` : pendingCount}
            </span>
          )}
        </div>
      </div>

      <div className="max-w-lg mx-auto sm:max-w-2xl">
        <div className="bg-white rounded-xl shadow-lg p-4 sm:p-8">

          {/* Header */}
          <div className="mb-6 sm:mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-primaryDark text-center sm:text-left">
                {t('cabinda.title')}
              </h1>
              <div className="text-sm font-semibold text-primary text-center sm:text-right">
                {currentGlobalStep} de {totalAllQuestions}
              </div>
            </div>

            {/* Global progress bar */}
            <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
              <div
                className="bg-primary h-2 rounded-full transition-all duration-300"
                style={{ width: `${(currentGlobalStep / totalAllQuestions) * 100}%` }}
              />
            </div>

            {/* Section steps indicator */}
            <div className="flex justify-between mb-3">
              {sectionOrder.map((sec, idx) => {
                const currentIdx = sectionOrder.indexOf(currentSection);
                const isDone = idx < currentIdx;
                const isCurrent = idx === currentIdx;
                return (
                  <div
                    key={sec}
                    className={`h-1.5 flex-1 mx-0.5 rounded-full transition-colors duration-300 ${isDone ? 'bg-green-400' : isCurrent ? 'bg-primary' : 'bg-gray-200'}`}
                  />
                );
              })}
            </div>

            <div className="flex justify-center">
              <span className="inline-block bg-primary text-white text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full">
                {currentSectionData.title}
              </span>
            </div>
          </div>

          {/* Question */}
          <div className="mb-6 sm:mb-8">
            <h3 className="text-lg sm:text-xl font-semibold text-gray-800 mb-4 sm:mb-6 text-center px-2">
              {currentQuestion.text}
            </h3>
            <div className="max-w-md mx-auto">
              {renderQuestion(currentQuestion)}
            </div>
          </div>

          {/* Navigation */}
          <div className="flex flex-col sm:flex-row justify-between gap-3 sm:gap-0">
            <button
              onClick={prevStep}
              disabled={isFirstStep}
              className="flex items-center justify-center px-4 py-3 sm:px-6 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors order-2 sm:order-1"
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              {t('ui.previous')}
            </button>

            <button
              onClick={nextStep}
              disabled={!isStepComplete()}
              className="flex items-center justify-center px-4 py-3 sm:px-6 bg-primary text-white rounded-lg hover:bg-primaryDark disabled:opacity-50 disabled:cursor-not-allowed transition-colors order-1 sm:order-2"
            >
              {isLastSection ? (
                <><Check className="w-4 h-4 mr-2" />{t('ui.finish')}</>
              ) : (
                <>{t('ui.next')}<ChevronRight className="w-4 h-4 ml-2" /></>
              )}
            </button>
          </div>

          {/* Recording warning */}
          {isRecording && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center text-yellow-800">
                <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse mr-2"></div>
                <p className="text-sm font-medium">{t('cabinda.recording.warning')}</p>
              </div>
            </div>
          )}
        </div>

        {/* Success banner */}
        {saveResult?.success && !showSaveDialog && (
          <div className="mt-4 space-y-3">
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-800">{t('cabinda.result.success')}</p>
                  <p className="text-xs text-green-600">ID: {saveResult.itemId}</p>
                </div>
                <button onClick={startNewSurvey} className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 text-sm">
                  {t('ui.newSurvey')}
                </button>
              </div>
            </div>
            <PreliminaryReport stats={detailedStats} loading={detailedStatsLoading} targets={MUNICIPALITY_TARGETS} total={TOTAL_TARGET} duration={surveyDuration} />
          </div>
        )}

        {/* Storage warning banner */}
        {storageInfo?.isWarning && (
          <div className={`mt-4 px-4 py-3 rounded-lg flex items-start gap-2 text-sm ${
            storageInfo.isCritical
              ? 'bg-red-50 border border-red-200 text-red-800'
              : 'bg-amber-50 border border-amber-200 text-amber-800'
          }`}>
            <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium">
                {storageInfo.isCritical
                  ? 'Armazenamento crítico!'
                  : `Armazenamento ${Math.round(storageInfo.usageRatio * 100)}% usado`}
              </p>
              <p className="text-xs mt-0.5">
                {storageInfo.isCritical
                  ? 'Sincronize os inquéritos pendentes antes de continuar.'
                  : `${storageInfo.usageMB} MB de ${storageInfo.quotaMB} MB utilizados`}
              </p>
            </div>
          </div>
        )}

        {/* Offline mode banner */}
        {!isOnline && (
          <div className="mt-4 px-4 py-3 bg-orange-50 border border-orange-200 rounded-lg flex items-center gap-2 text-sm text-orange-800">
            <WifiOff className="w-4 h-4 flex-shrink-0" />
            <span>
              Modo offline
              {pendingCount > 0 && ` — ${pendingCount} inquérito${pendingCount > 1 ? 's' : ''} pendente${pendingCount > 1 ? 's' : ''}`}
            </span>
          </div>
        )}

        {/* Auto-sync progress */}
        {(pendingCount > 0 || syncProgress.isActive) && (
          <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-2">
                {syncProgress.isActive
                  ? <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                  : <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                }
                <p className="text-sm font-medium text-blue-800">
                  {syncProgress.isActive
                    ? `${t('cabinda.pending.syncing')}${syncProgress.current} de ${syncProgress.total}`
                    : `${pendingCount} inquérito${pendingCount > 1 ? 's' : ''} pendente${pendingCount > 1 ? 's' : ''}`
                  }
                </p>
              </div>
              {!syncProgress.isActive && isOnline && (
                <button
                  onClick={triggerSync}
                  className="flex items-center gap-1 text-xs text-blue-600 font-medium border border-blue-300 px-2 py-1 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  <RefreshCw className="w-3 h-3" />
                  Tentar agora
                </button>
              )}
            </div>

            {/* Progress bar (while syncing) */}
            {syncProgress.isActive && syncProgress.total > 0 && (
              <div className="px-4 pb-3">
                <div className="flex justify-between text-xs text-blue-500 mb-1">
                  <span>{Math.round((syncProgress.current / syncProgress.total) * 100)}{t('cabinda.pending.progress')}</span>
                </div>
                <div className="w-full bg-blue-200 rounded-full h-1.5">
                  <div className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
                    style={{ width: `${(syncProgress.current / syncProgress.total) * 100}%` }} />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Interviewer name confirmation modal */}
        {showInterviewerModal && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full space-y-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <User className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">Confirmar entrevistador</h3>
                  <p className="text-xs text-gray-400 mt-0.5">Verifique o seu nome antes de iniciar</p>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nome do entrevistador
                </label>
                <input
                  type="text"
                  value={interviewerNameDraft}
                  onChange={e => setInterviewerNameDraft(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && interviewerNameDraft.trim() && confirmInterviewerName()}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 bg-gray-50"
                  placeholder="O seu nome completo"
                  autoFocus
                />
              </div>

              <button
                onClick={confirmInterviewerName}
                disabled={!interviewerNameDraft.trim()}
                className="w-full py-2.5 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                Confirmar e iniciar
              </button>
            </div>
          </div>
        )}

        {/* Save dialog */}
        {showSaveDialog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
              <h3 className="text-lg font-semibold mb-4">{t('cabinda.saveDialog.title')}</h3>

              {!saveResult ? (
                <>
                  <p className="text-gray-600 mb-4">{t('cabinda.saveDialog.question')}</p>
                  <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                    <h4 className="text-sm font-medium text-gray-800 mb-3">{t('cabinda.saveDialog.summary')}</h4>
                    <div className="space-y-2 text-sm text-gray-600">
                      <p>{t('cabinda.saveDialog.province')}{responses.province || '—'}</p>
                      <p>{t('cabinda.saveDialog.municipality')}{responses.municipality || '—'}</p>
                      <p>{t('cabinda.saveDialog.operator')}{responses.currentOperator || '—'}</p>
                      <p>{t('cabinda.saveDialog.responses')}{Object.keys(responses).length}</p>
                      <p>{t('cabinda.saveDialog.recordings')}{Object.keys(audioRecordings).length}</p>
                      {surveyStartTime && (
                        <p>Duração: {formatDuration(Math.round((Date.now() - surveyStartTime) / 1000))}</p>
                      )}
                      <p>{t('cabinda.saveDialog.status')}{isOnline ? t('cabinda.saveDialog.statusOnline') : t('cabinda.saveDialog.statusOffline')}</p>
                      {responses.interestedInDiscussion === 'Sim' && <p>{t('cabinda.saveDialog.focusGroup')}</p>}
                    </div>
                  </div>
                  {/* Step progress indicator — shown while saving */}
                  {isSaving && (() => {
                    const steps = Object.keys(audioRecordings).length > 0
                      ? SAVE_STEPS_ALL
                      : SAVE_STEPS_ALL.filter(s => s !== 'uploadingAudio');
                    const activeIdx = steps.indexOf(saveStep);
                    return (
                      <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-2 mb-3">
                          <Loader2 className="w-4 h-4 text-primary animate-spin flex-shrink-0" />
                          <span className="text-sm font-medium text-gray-700">
                            {SAVE_STEPS_LABELS[saveStep] ?? t('ui.saving')}
                          </span>
                        </div>
                        <div className="flex gap-0.5 mb-2">
                          {steps.map((step, idx) => (
                            <div key={step} className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${idx < activeIdx ? 'bg-green-400' : idx === activeIdx ? 'bg-primary' : 'bg-gray-200'}`} />
                          ))}
                        </div>
                        <div className="flex">
                          {steps.map((step, idx) => (
                            <div key={step} className="flex flex-col items-center gap-0.5 flex-1">
                              {idx < activeIdx
                                ? <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                                : idx === activeIdx
                                  ? <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />
                                  : <div className="w-3.5 h-3.5 rounded-full border border-gray-300" />
                              }
                              <span className={`text-xs ${idx === activeIdx ? 'text-primary font-medium' : idx < activeIdx ? 'text-green-600' : 'text-gray-400'}`}>
                                {SAVE_STEPS_SHORT[step]}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}

                  <div className="flex gap-3">
                    <button onClick={() => setShowSaveDialog(false)} disabled={isSaving} className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 disabled:opacity-50">
                      {t('ui.cancel')}
                    </button>
                    <button onClick={handleSaveSurvey} disabled={isSaving} className="flex-1 flex items-center justify-center px-4 py-2 bg-primary text-white rounded hover:bg-primaryDark disabled:opacity-50">
                      {isSaving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{t('ui.saving')}</> : <><Save className="w-4 h-4 mr-2" />{t('ui.save')}</>}
                    </button>
                  </div>
                </>
              ) : (
                <div>
                  <div className={`p-4 rounded-lg mb-4 ${saveResult.success ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-700'}`}>
                    <p className="font-medium">{saveResult.success ? t('cabinda.result.success') : t('cabinda.result.error')}</p>
                    <p className="text-sm mt-1">{saveResult.message}</p>
                    {saveResult.itemId && <p className="text-xs mt-1">ID: {saveResult.itemId}</p>}
                    {saveResult.isDuplicate && <p className="text-xs mt-1 font-medium">{t('cabinda.result.duplicate')}</p>}
                  </div>

                  {saveResult.success && (
                    <div className="mb-4">
                      <PreliminaryReport stats={detailedStats} loading={detailedStatsLoading} targets={MUNICIPALITY_TARGETS} total={TOTAL_TARGET} duration={surveyDuration} />
                    </div>
                  )}
                  {saveResult.success ? (
                    <div className="flex gap-3">
                      <button onClick={() => setShowSaveDialog(false)} className="flex-1 px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600">{t('ui.close')}</button>
                      <button onClick={startNewSurvey} className="flex-1 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600">{t('ui.newSurvey')}</button>
                    </div>
                  ) : (
                    <div className="flex gap-3">
                      <button onClick={() => setShowSaveDialog(false)} className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50">{t('ui.close')}</button>
                      {!saveResult.isDuplicate && !saveResult.wasCancelled && (
                        <button onClick={handleSaveSurvey} className="flex-1 px-4 py-2 bg-primary text-white rounded hover:bg-primaryDark">{t('ui.retry')}</button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        <audio ref={audioRef} style={{ display: 'none' }} />
      </div>

      <style>{`
        .accent-primary { accent-color: #f97316; }
        .bg-primary { background-color: #f97316; }
        .text-primary { color: #f97316; }
        .text-primaryDark { color: #ea580c; }
        .border-primary { border-color: #f97316; }
        .hover\\:bg-primary:hover { background-color: #f97316; }
        .hover\\:bg-primaryDark:hover { background-color: #ea580c; }
      `}</style>
    </div>
  );
};

export default CabindaSurvey;
