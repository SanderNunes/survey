import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronRight, ChevronLeft, Check, CheckCircle, Mic, Square, Play, Pause, Trash2, Save, Loader2, Wifi, WifiOff } from 'lucide-react';
import { useSharePoint } from '@/hooks/useSharePoint';
import { assemblyClient } from '@/config/assemblyai';
import { useTranslation } from 'react-i18next';

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
  const [syncProgress, setSyncProgress] = useState({ isActive: false, current: 0, total: 0, step: null });

  // Offline functionality
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingSurveys, setPendingSurveys] = useState([]);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioRef = useRef(null);
  const timerRef = useRef(null);

  const [transcribingFor, setTranscribingFor] = useState(null); // questionId being transcribed after upload

  const { saveCabindaSurveyResponse, getSurveyTargetCounts } = useSharePoint();
  const [targetCounts, setTargetCounts] = useState(null);
  const [targetCountsLoading, setTargetCountsLoading] = useState(false);

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    let pending = [];
    try {
      pending = JSON.parse(localStorage.getItem('offline-cabinda-surveys') || '[]');
    } catch (e) {
      console.error('Corrupted offline surveys cache — resetting:', e);
      localStorage.removeItem('offline-cabinda-surveys');
    }
    setPendingSurveys(pending);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);


  // Fetch SP counts on mount (when SP is ready)
  useEffect(() => {
    if (getSurveyTargetCounts) fetchTargetCounts();
  }, [getSurveyTargetCounts]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Survey data ──────────────────────────────────────────────────────────

  const municipalitiesMap = {
    'Cabinda': ['Cabinda', 'Cacongo', 'Belize', 'Buco-Zau'],
    'Bié':     ['Andulo', 'Camacupa', 'Catabola', 'Chinguar', 'Cuemba', 'Cunhinga', 'Kuito', 'Nharea'],
    'Zaire':   ["M'banza Congo", "N'zeto", 'Soyo'],
  };

  const surveyData = {
    provinces:          ['Cabinda', 'Bié', 'Zaire'],
    ageGroups:          ['18–24', '25–34', '35–44', '45–54', '55+'],
    genders:            ['Masculino', 'Feminino'],
    occupations:        ['Estudante', 'Empregado(a)', 'Trabalhador(a) por conta própria', 'Desempregado(a)', 'Outro (especificar)'],
    phoneTypes:         ['Smartphone', 'Feature Phone (Básico)'],
    yesNoDontKnow:      ['Sim', 'Não', 'Não sei'],
    simConfigs:         ['SIM único', 'Dual SIM'],
    operators:          ['Unitel', 'Movicel', 'Ambos'],
    visibilityOptions:  ['Unitel', 'Movicel', 'Ambos por igual', 'Nenhum'],
    coverageAreas:      ['Centro da cidade', 'Estradas principais', 'Zonas rurais', 'Mercados', 'Zonas fronteiriças', 'Outro (especificar)'],
    primaryUse:         ['Chamadas', 'Dados', 'SMS', 'Ambos por igual'],
    rechargeFrequency:  ['Diariamente', 'De poucos em poucos dias', 'Semanalmente', 'Quinzenalmente', 'Mensalmente'],
    rechargeAmounts:    ['<200 Kz', '200–500 Kz', '500–1.000 Kz', '1.000–2.500 Kz', '2.500–5.000 Kz', '5.000+ Kz'],
    rechargeLocations:  ['Vendedores de rua (Agentes)', 'Lojas', 'Quiosques', 'EMIS', 'E-banking', 'Outro (especificar)'],
    rechargeReasons:    ['Conveniência', 'Proximidade', 'Confiança', 'Única opção disponível', 'Outro (especificar)'],
    bundleTypes:        ['Apenas dados', 'Apenas voz', 'Misto (voz + dados)', 'Redes sociais', 'Noturno/fim de semana', 'Pré-pago sem pacote'],
    promotionSources:   ['Mercados', 'Lojas/Quiosques', 'Redes sociais', 'Amigos/Família', 'Escola/Universidade', 'Igreja/Comunidade', 'Outro (especificar)'],
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
        { id: 'trustedCommunity',   text: 'Existem negócios locais, escolas, igrejas ou figuras da comunidade em quem confia para recomendações de produtos?',    type: 'multiple', options: surveyData.trustedSources, hasOther: true },
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
      title: 'Secção 7: Dados de Contacto (Opcional)',
      questions: [
        { id: 'interestedInDiscussion', text: 'Interesse em participar numa discussão remunerada sobre telecomunicações na sua área?', type: 'yesno' },
        { id: 'nomeCliente',            text: 'Nome',                                                                                   type: 'text', placeholder: 'O seu nome', optional: true },
        { id: 'phoneNumber',            text: 'Número de telefone',                                                                    type: 'text', placeholder: 'Necessário para ser contactado para a discussão remunerada' },
      ],
    },
  };

  const sectionOrder = ['demographics', 'deviceConnectivity', 'operatorPerception', 'usageRecharge', 'preferences', 'keyInsight', 'contact'];

  // ─── Duplicate prevention ──────────────────────────────────────────────────

  const generateSurveyId = () => {
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    const userAgent = navigator.userAgent.substring(0, 10);
    return `${timestamp}-${randomStr}-${btoa(userAgent).substring(0, 6)}`;
  };

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
    const existingSurveys = JSON.parse(localStorage.getItem('offline-cabinda-surveys') || '[]');
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
    new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
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

      const existing = JSON.parse(localStorage.getItem('offline-cabinda-surveys') || '[]');
      const updated = [...existing, offlineData];
      localStorage.setItem('offline-cabinda-surveys', JSON.stringify(updated));
      setPendingSurveys(updated);

      return { success: true, message: 'Inquérito guardado localmente. Será sincronizado quando houver conexão.', itemId: `OFFLINE_${surveyId}`, surveyId };
    } catch (error) {
      return { success: false, message: 'Erro ao guardar offline.', error: error.message };
    }
  };

  // ─── SharePoint save ───────────────────────────────────────────────────────

  const saveToSharePoint = useCallback(async (surveyDataToSave) => {
    const surveyId = generateSurveyId();
    const fingerprint = generateFingerprint();

    const formattedData = {
      responses: responses,
      customInputs: customInputs,
      audioRecordings: audioRecordings,
      metadata: {
        section: currentSection,
        completedAt: new Date().toISOString(),
        surveyId,
        fingerprint,
        submissionMethod: 'online',
        deviceInfo: { userAgent: navigator.userAgent, screen: `${screen.width}x${screen.height}`, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone },
      },
    };

    if (responses.interestedInDiscussion === 'Sim' && responses.phoneNumber) {
      formattedData.contactInfo = { name: responses.nomeCliente, phone: responses.phoneNumber };
    }

    const result = await saveCabindaSurveyResponse(formattedData, setSaveStep);
    if (!result.success) throw new Error(result.message || 'SharePoint save failed');

    return {
      success: true,
      message: result.message || 'Inquérito enviado com sucesso para SharePoint!',
      itemId: result.itemId || `SP_${surveyId}`,
      surveyId,
    };
  }, [responses, customInputs, audioRecordings, currentSection, saveCabindaSurveyResponse]);

  // ─── Sync pending ──────────────────────────────────────────────────────────

  const syncPendingSurveys = useCallback(async () => {
    if (!isOnline || pendingSurveys.length === 0) return;
    if (!saveCabindaSurveyResponse) return; // SP not ready yet

    setSyncProgress({ isActive: true, current: 0, total: pendingSurveys.length });
    try {
      const syncResults = [];
      const processedFingerprints = new Set();

      for (let i = 0; i < pendingSurveys.length; i++) {
        const survey = pendingSurveys[i];
        setSyncProgress({ isActive: true, current: i + 1, total: pendingSurveys.length });

        if (survey.fingerprint && processedFingerprints.has(survey.fingerprint)) {
          syncResults.push({ surveyId: survey.id, success: false, skipped: true });
          continue;
        }
        if (survey.fingerprint) processedFingerprints.add(survey.fingerprint);

        try {
          const audioRecordingsToSync = {};
          if (survey.audioData) {
            for (const [key, base64Data] of Object.entries(survey.audioData)) {
              try {
                // Decode base64 directly — fetch() on data URLs is unreliable cross-browser
                const [header, b64] = base64Data.split(',');
                const mimeMatch = header.match(/:(.*?);/);
                const mimeType = mimeMatch ? mimeMatch[1] : 'audio/wav';
                const binary = atob(b64);
                const bytes = new Uint8Array(binary.length);
                for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
                const blob = new Blob([bytes], { type: mimeType });
                audioRecordingsToSync[key] = { blob, url: URL.createObjectURL(blob) };
              } catch { /* skip failed audio conversion */ }
            }
          }

          const formattedData = {
            responses: survey.responses || {},
            customInputs: survey.customInputs || {},
            audioRecordings: audioRecordingsToSync,
            metadata: { ...survey.metadata, syncedAt: new Date().toISOString(), originalOfflineId: survey.id, fingerprint: survey.fingerprint },
          };

          if (survey.responses?.interestedInDiscussion === 'Sim' && survey.responses?.phoneNumber) {
            formattedData.contactInfo = { phone: survey.responses.phoneNumber };
          }

          const syncTimeout = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Sync timeout after 30s')), 30000)
          );
          const result = await Promise.race([
            saveCabindaSurveyResponse(formattedData, (step) => setSyncProgress(p => ({ ...p, step }))),
            syncTimeout,
          ]);
          Object.values(audioRecordingsToSync).forEach(r => { if (r.url) URL.revokeObjectURL(r.url); });

          if (result.success || result.isDuplicate) {
            syncResults.push({ surveyId: survey.id, success: true, sharePointId: result.itemId, wasDuplicate: !!result.isDuplicate });
          } else {
            throw new Error(result.message || 'SharePoint save failed');
          }
        } catch (syncError) {
          syncResults.push({ surveyId: survey.id, success: false, error: syncError.message });
        }
      }

      const successfulSyncs = syncResults.filter(r => r.success);
      const skippedSyncs = syncResults.filter(r => r.skipped);
      const failedSyncs = syncResults.filter(r => !r.success && !r.skipped);

      const toRemove = [...successfulSyncs, ...skippedSyncs];

      // Mark failed surveys with sync_failed status so the UI distinguishes them from unprocessed pending
      const updatedPending = pendingSurveys.map(s => {
        const failed = failedSyncs.find(f => f.surveyId === s.id);
        if (failed) return { ...s, status: 'sync_failed', lastSyncError: failed.error };
        return s;
      });

      if (toRemove.length > 0) {
        const remainingPending = updatedPending.filter(s => !toRemove.some(sync => sync.surveyId === s.id));
        localStorage.setItem('offline-cabinda-surveys', JSON.stringify(remainingPending));
        setPendingSurveys(remainingPending);

        const synced = successfulSyncs.filter(r => !r.wasDuplicate).length;
        const dupes = successfulSyncs.filter(r => r.wasDuplicate).length + skippedSyncs.length;
        let message = synced > 0 ? `${synced} inquérito${synced > 1 ? 's' : ''} sincronizado${synced > 1 ? 's' : ''} com sucesso!` : '';
        if (dupes > 0) message += `${message ? ' ' : ''}${dupes} duplicado${dupes > 1 ? 's' : ''} removido${dupes > 1 ? 's' : ''}.`;
        if (failedSyncs.length > 0) message += ` ${failedSyncs.length} falharam.`;
        setSaveResult({ success: true, message: message || 'Sincronização concluída.' });
      } else if (failedSyncs.length > 0) {
        // All surveys failed — update state so UI shows sync_failed badges
        localStorage.setItem('offline-cabinda-surveys', JSON.stringify(updatedPending));
        setPendingSurveys(updatedPending);
        setSaveResult({ success: false, message: `${failedSyncs.length} inquérito${failedSyncs.length > 1 ? 's' : ''} não sincronizado${failedSyncs.length > 1 ? 's' : ''}. Tente novamente.` });
      }

      setTimeout(() => setSyncProgress({ isActive: false, current: 0, total: 0, step: null }), 2000);
    } catch (error) {
      setSaveResult({ success: false, message: 'Erro durante a sincronização. Tente novamente.', error: error.message });
      setSyncProgress({ isActive: false, current: 0, total: 0, step: null });
    }
  }, [isOnline, pendingSurveys, saveCabindaSurveyResponse]);

  // Auto-sync when back online — placed after syncPendingSurveys declaration
  useEffect(() => {
    if (isOnline && pendingSurveys.length > 0 && saveCabindaSurveyResponse) {
      const timer = setTimeout(() => { syncPendingSurveys(); }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isOnline, pendingSurveys.length, saveCabindaSurveyResponse, syncPendingSurveys]);

  // ─── Submission targets ────────────────────────────────────────────────────

  const SURVEY_TARGETS = { 'Cabinda': 600, 'Zaire': 400 };
  const TOTAL_TARGET = 1000;

  const fetchTargetCounts = useCallback(async () => {
    if (!getSurveyTargetCounts) return;
    setTargetCountsLoading(true);
    try {
      const counts = await getSurveyTargetCounts();
      if (counts) setTargetCounts(counts);
    } finally {
      setTargetCountsLoading(false);
    }
  }, [getSurveyTargetCounts]);

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
  };

  // ─── Main save ─────────────────────────────────────────────────────────────

  const handleSaveSurvey = useCallback(async () => {
    if (Object.keys(responses).length === 0) {
      setSaveResult({ success: false, message: t('cabinda.validation.noAnswers') });
      return;
    }

    setIsSaving(true);
    setSaveResult(null);

    try {
      const surveyDataToSave = {
        responses,
        customInputs,
        metadata: { section: currentSection, completedAt: new Date().toISOString() },
      };

      let result;
      if (isOnline) {
        try {
          result = await saveToSharePoint(surveyDataToSave);
        } catch {
          result = await saveOffline(surveyDataToSave);
        }
      } else {
        result = await saveOffline(surveyDataToSave);
      }

      setSaveResult(result);
      if (result.success) {
        // Refresh SP counts so the preliminary report reflects the new submission
        fetchTargetCounts();
      }
    } catch (error) {
      setSaveResult({ success: false, message: t('cabinda.validation.unexpected'), error: error.message });
    } finally {
      setIsSaving(false);
      setSaveStep(null);
    }
  }, [responses, customInputs, currentSection, isOnline, saveToSharePoint, t]);

  // ─── Audio recording ───────────────────────────────────────────────────────

  const startRecording = async (questionId) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => audioChunksRef.current.push(e.data);
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
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
            setTranscribingFor(null);
          }
        }
      };

      mediaRecorder.start();
      setIsRecording(questionId);
      setRecordingTime(0);
      timerRef.current = setInterval(() => setRecordingTime(prev => prev + 1), 1000);
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
      audioRef.current.play();
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

  // ─── Response handling ─────────────────────────────────────────────────────

  const handleResponse = (questionId, value, customValue = '') => {
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
      // Phone number is required when respondent said "Sim" to discussion
      if (question.id === 'phoneNumber' && responses['interestedInDiscussion'] === 'Sim') {
        return !!value.trim();
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
              className="w-full p-3 sm:p-4 border-2 border-gray-300 rounded-lg focus:border-primary focus:outline-none text-base"
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
                className="w-full p-3 sm:p-4 border-2 border-gray-300 rounded-lg focus:border-primary focus:outline-none text-base"
              />
            )}
          </div>
        );

      case 'cascade': {
        const parentValue = responses[question.dependsOn] || '';
        const options = question.optionsMap[parentValue] || [];
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
              className="w-full p-3 sm:p-4 border-2 border-gray-300 rounded-lg focus:border-primary focus:outline-none text-base disabled:opacity-50 disabled:bg-gray-100"
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
                    checked={currentValue === value.toString()}
                    onChange={(e) => handleResponse(question.id, e.target.value)}
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
                  className="w-full p-3 sm:p-4 border-2 border-gray-300 rounded-lg focus:border-primary focus:outline-none h-20 sm:h-24 text-base"
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
                className="w-full p-3 sm:p-4 border-2 border-gray-300 rounded-lg focus:border-primary focus:outline-none text-base"
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
                        <div className="flex items-center justify-center mb-3 sm:mb-4">
                          <div className="w-3 h-3 sm:w-4 sm:h-4 bg-primary rounded-full animate-pulse mr-2"></div>
                          <span className="text-primary font-medium text-sm sm:text-base">{t('cabinda.recording.inProgress')} {formatTime(recordingTime)}</span>
                        </div>
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
                value={currentValue.includes('[Gravação de Áudio') ? '' : currentValue}
                onChange={(e) => handleResponse(question.id, e.target.value)}
                className="w-full p-3 sm:p-4 border-2 border-gray-300 rounded-lg focus:border-primary focus:outline-none h-20 sm:h-24 text-base"
              />
            </div>
          </div>
        );
      }

      case 'text':
        return (
          <div className="space-y-3">
            <input
              type="tel"
              placeholder={question.placeholder || t('cabinda.form.textPlaceholder')}
              value={currentValue}
              onChange={(e) => handleResponse(question.id, e.target.value)}
              className="w-full p-3 sm:p-4 border-2 border-gray-300 rounded-lg focus:border-primary focus:outline-none text-base"
            />
            {question.optional && (
              <p className="text-xs text-gray-400 text-center">{t('ui.optional')}</p>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  // ─── Derived state ─────────────────────────────────────────────────────────

  const currentQuestion = getCurrentQuestion();
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
      <div className={`fixed bottom-4 right-4 z-40 px-3 py-2 rounded-full shadow-lg transition-all duration-300 ${isOnline ? 'bg-green-500 text-white' : 'bg-red-500 text-white'} ${(pendingSurveys.length > 0 || syncProgress.isActive) ? 'animate-pulse' : ''}`}>
        <div className="flex items-center gap-2 text-xs sm:text-sm">
          {isOnline ? <Wifi className="w-3 h-3 sm:w-4 sm:h-4" /> : <WifiOff className="w-3 h-3 sm:w-4 sm:h-4" />}
          <span className="hidden sm:inline">{isOnline ? t('ui.online') : t('ui.offline')}</span>
          {(pendingSurveys.length > 0 || syncProgress.isActive) && (
            <span className="px-2 py-1 bg-white bg-opacity-20 rounded-full text-xs">
              {syncProgress.isActive ? `${syncProgress.current}/${syncProgress.total}` : pendingSurveys.length}
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

            <h2 className="text-sm sm:text-base font-semibold text-primary uppercase tracking-wide text-center">
              {currentSectionData.title}
            </h2>
          </div>

          {/* Question */}
          <div className="mb-6 sm:mb-8">
            <h3 className="text-lg sm:text-xl font-medium text-gray-800 mb-4 sm:mb-6 text-center px-2">
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
            <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-orange-800">Relatório Preliminar</p>
                {targetCountsLoading && <Loader2 className="w-3 h-3 text-orange-500 animate-spin" />}
              </div>
              {targetCounts ? (
                <div className="space-y-2">
                  {Object.entries(SURVEY_TARGETS).map(([province, target]) => {
                    const done = targetCounts[province] || 0;
                    const remaining = Math.max(0, target - done);
                    const pct = Math.min(100, Math.round((done / target) * 100));
                    return (
                      <div key={province}>
                        <div className="flex justify-between text-xs text-orange-700 mb-1">
                          <span className="font-medium">{province}</span>
                          <span>{done}/{target} ({remaining} em falta)</span>
                        </div>
                        <div className="w-full bg-orange-200 rounded-full h-1.5">
                          <div className="bg-orange-500 h-1.5 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                  <div className="pt-2 border-t border-orange-200 flex justify-between text-xs font-semibold text-orange-800">
                    <span>Total</span>
                    <span>{targetCounts.total}/{TOTAL_TARGET} — {Math.max(0, TOTAL_TARGET - targetCounts.total)} inquéritos em falta</span>
                  </div>
                </div>
              ) : (
                !targetCountsLoading && <p className="text-xs text-orange-600">Não foi possível obter os dados do servidor.</p>
              )}
            </div>
          </div>
        )}

        {/* Auto-sync progress */}
        {isOnline && (pendingSurveys.length > 0 || syncProgress.isActive) && (
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
                    : `${pendingSurveys.length} inquérito${pendingSurveys.length > 1 ? 's' : ''} pendente${pendingSurveys.length > 1 ? 's' : ''}`
                  }
                </p>
              </div>
              <p className="text-xs text-blue-500">{t('cabinda.pending.syncStarted')}</p>
            </div>

            {/* Progress bar (while syncing) */}
            {syncProgress.isActive && (
              <div className="px-4 pb-3">
                <div className="flex justify-between text-xs text-blue-500 mb-1">
                  <span>{Math.round((syncProgress.current / syncProgress.total) * 100)}{t('cabinda.pending.progress')}</span>
                  {syncProgress.step && (
                    <span className="text-blue-600 font-medium">{SAVE_STEPS_LABELS[syncProgress.step]}</span>
                  )}
                </div>
                <div className="w-full bg-blue-200 rounded-full h-1.5">
                  <div className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
                    style={{ width: `${(syncProgress.current / syncProgress.total) * 100}%` }} />
                </div>
                {syncProgress.step && (() => {
                  const activeIdx = SAVE_STEPS_ALL.indexOf(syncProgress.step);
                  return (
                    <div className="flex gap-0.5 mt-2">
                      {SAVE_STEPS_ALL.map((step, idx) => (
                        <div key={step} className={`h-1 flex-1 rounded-full transition-colors duration-300 ${idx < activeIdx ? 'bg-blue-400' : idx === activeIdx ? 'bg-blue-600' : 'bg-blue-200'}`} />
                      ))}
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Pending survey list */}
            {!syncProgress.isActive && pendingSurveys.length > 0 && (
              <div className="border-t border-blue-200 divide-y divide-blue-100">
                {pendingSurveys.map((survey, idx) => {
                  const r = survey.responses || {};
                  const date = survey.timestamp
                    ? new Date(survey.timestamp).toLocaleString('pt-AO', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                    : '—';
                  const answeredCount = Object.values(r).filter(v => v !== '' && v !== null && v !== undefined).length;
                  return (
                    <div key={survey.id || idx} className="px-4 py-3 flex items-start justify-between gap-3">
                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
                            #{idx + 1}
                          </span>
                          <span className="text-xs font-medium text-blue-800 truncate">
                            {r.province || '—'} · {r.municipality || '—'}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-blue-600">
                          <span>Operador: <span className="font-medium">{r.currentOperator || '—'}</span></span>
                          <span>Género: <span className="font-medium">{r.gender || '—'}</span></span>
                          <span>Faixa: <span className="font-medium">{r.ageGroup || '—'}</span></span>
                          <span>Respostas: <span className="font-medium">{answeredCount}</span></span>
                          {Object.keys(survey.audioRecordings || {}).length > 0 && (
                            <span>Áudio: <span className="font-medium">{Object.keys(survey.audioRecordings).length} gravação(ões)</span></span>
                          )}
                        </div>
                        <p className="text-xs text-blue-400">{t('cabinda.pending.savedAt')}{date}</p>
                      </div>
                      <span className={`flex-shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${survey.status === 'sync_failed' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                        {survey.status === 'sync_failed' ? 'Falhou' : t('cabinda.pending.status')}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
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

                  {/* Preliminary report — target progress from SharePoint */}
                  {saveResult.success && (
                    <div className="mb-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-sm font-semibold text-orange-800">Relatório Preliminar</p>
                        {targetCountsLoading && <Loader2 className="w-3 h-3 text-orange-500 animate-spin" />}
                      </div>
                      {targetCounts ? (
                        <div className="space-y-2">
                          {Object.entries(SURVEY_TARGETS).map(([province, target]) => {
                            const done = targetCounts[province] || 0;
                            const remaining = Math.max(0, target - done);
                            const pct = Math.min(100, Math.round((done / target) * 100));
                            return (
                              <div key={province}>
                                <div className="flex justify-between text-xs text-orange-700 mb-1">
                                  <span className="font-medium">{province}</span>
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
                            <span>{targetCounts.total}/{TOTAL_TARGET} — {Math.max(0, TOTAL_TARGET - targetCounts.total)} inquéritos em falta</span>
                          </div>
                        </div>
                      ) : (
                        !targetCountsLoading && <p className="text-xs text-orange-600">Não foi possível obter os dados do servidor.</p>
                      )}
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
