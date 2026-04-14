import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronRight, ChevronLeft, Check, Mic, Square, Play, Pause, Trash2, Save, Loader2, Wifi, WifiOff } from 'lucide-react';
import { useSharePoint } from '@/hooks/useSharePoint';

const AfricellSurvey = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [currentSection, setCurrentSection] = useState('demographic');
  const [responses, setResponses] = useState({});
  const [customInputs, setCustomInputs] = useState({});
  const [audioRecordings, setAudioRecordings] = useState({});
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [saveResult, setSaveResult] = useState(null);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  
  // Offline functionality
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingSurveys, setPendingSurveys] = useState([]);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioRef = useRef(null);
  const timerRef = useRef(null);

  // Get SharePoint functions
  const { saveSurveyResponse } = useSharePoint();

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Load pending surveys from localStorage
    const pending = JSON.parse(localStorage.getItem('offline-surveys') || '[]');
    setPendingSurveys(pending);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Auto-sync when coming back online with progress tracking
  useEffect(() => {
    if (isOnline && pendingSurveys.length > 0) {
      const timer = setTimeout(() => {
        syncPendingSurveys();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isOnline, pendingSurveys.length]);

  // Add sync progress state
  const [syncProgress, setSyncProgress] = useState({ isActive: false, current: 0, total: 0 });

  // Survey data
  const surveyData = {
    bairros: ['Lubango', 'Matala', 'Chibia', 'Caluquembe', 'Quipungo'],
    idades: ['18–24', '25–34', '35–44', '45+'],
    generos: ['Masculino', 'Feminino'],
    ocupacoes: [
      'Estudante', 'Desempregado(a)', 'Doméstico(a) / Dona de Casa', 'Comércio / Negócios / Empresário(a)',
      'Educação / Professor(a) / Académico(a)', 'Funcionário(a) Público(a) / Governo',
      'Profissional de Saúde (Médico(a), Enfermeiro(a), etc.)', 'Reformado(a) / Aposentado(a)',
      'Agricultura / Pecuária', 'Gestão Administrativa / Administração-Privado', 'Outro (especificar)'
    ],
    operadoras: ['Africell', 'Unitel', 'Movicel', 'Outros'],
    servicosAfricell: ['Voz', 'Dados', 'SMS', 'Afrimoney'],
    gastosMensais: [
      'Menos de 1.000 Kz', '1.001 – 3.000 Kz', '3.001 – 5.000 Kz',
      '5.001 – 10.000 Kz', '10.001 – 20.000 Kz', 'Mais de 20.000 Kz'
    ],
    melhorias: [
      'Pacotes/Planos mais baratos', 'Melhor cobertura', 'Mais lojas na Huíla',
      'Melhor atendimento ao cliente', 'Novos serviços como Afrimoney', 'Outro (especificar)'
    ],
    operadorasAtuais: ['Unitel', 'Movicel', 'Outros'],
    classificacoes: ['Muito positivo', 'Positivo', 'Neutro', 'Negativo', 'Muito negativo'],
    servicosDesejados: [
      'Planos/Pacotes para estudantes', 'Planos/Pacotes ilimitados', 'Planos noturnos',
      'Pacotes de entretenimento', 'Ofertas de fidelidade', 'Pacotes de streaming'
    ]
  };

  // Section definitions
  const sections = {
    demographic: {
      title: 'Secção 1: Dados Demográficos',
      questions: [
        { id: 'bairro', text: 'Bairro/Zona', type: 'dropdown', options: surveyData.bairros },
        { id: 'idade', text: 'Faixa etária', type: 'dropdown', options: surveyData.idades },
        { id: 'genero', text: 'Género', type: 'dropdown', options: surveyData.generos },
        { id: 'ocupacao', text: 'Ocupação', type: 'dropdown', options: surveyData.ocupacoes, hasOther: true },
        { id: 'operadora', text: 'Qual é a sua principal operadora de telemóvel?', type: 'dropdown', options: surveyData.operadoras },
        { id: 'multipleSim', text: 'Utiliza mais do que um cartão SIM?', type: 'yesno', followUp: 'Se sim, porquê?' }
      ]
    },
    africellUser: {
      title: 'Secção 2A: Utilizadores Africell',
      questions: [
        { id: 'satisfacao', text: 'Numa escala de 1 a 5 (sendo 1 muito satisfeito e 5 muito insatisfeito), qual é o seu nível de satisfação com a Africell?', type: 'likert', scale: 5 },
        { id: 'servicoMaisUsado', text: 'O que é que mais utiliza no serviço Africell?', type: 'dropdown', options: surveyData.servicosAfricell },
        { id: 'gastoMensal', text: 'Quanto costuma gastar por mês com serviços da Africell?', type: 'dropdown', options: surveyData.gastosMensais },
        { id: 'razaoEscolha', text: 'Por que escolheu a Africell em vez da concorrência?', type: 'voice' },
        { id: 'melhorias', text: 'Que aspectos dos serviços da Africell poderiam ser melhorados para atender melhor às suas necessidades?', type: 'voice' },
        { id: 'recomendacao', text: 'Recomendaria a Africell a amigos/familiares?', type: 'yesnomaybe', followUp: 'Justificação' },
        { id: 'usarMais', text: 'Quais das seguintes opções o faria usar mais os serviços da Africell?', type: 'multiple', options: surveyData.melhorias, hasOther: true }
      ]
    },
    nonAfricellUser: {
      title: 'Secção 2B: Não Utilizadores Africell',
      questions: [
        { id: 'operadoraAtual', text: 'Qual é a sua actual operadora?', type: 'dropdown', options: surveyData.operadorasAtuais },
        { id: 'razaoOperadoraAtual', text: 'Por que é que escolheu essa operadora em vez da Africell?', type: 'voice' },
        { id: 'qualidadeSinal', text: 'Como avalia a qualidade do sinal da sua principal operadora na Huíla?', type: 'voice' },
        { id: 'experimentouAfricell', text: 'Já alguma vez experimentou os produtos e serviços da Africell?', type: 'yesno', followUp: 'Se sim, o que o levou a parar?' },
        { id: 'opiniao', text: 'No geral, como classificaria a sua opinião sobre a Africell?', type: 'dropdown', options: surveyData.classificacoes },
        { id: 'justificacaoOpiniao', text: 'Porque é que escolheu essa classificação?', type: 'voice' },
        { id: 'mudaria', text: 'Mudaria para a Africell?', type: 'voice', placeholder: 'Se sim, o que é que o faria mudar?' },
        { id: 'servicosDesejados', text: 'Quais dos serviços abaixo gostaria que uma nova operadora oferecesse?', type: 'multiple', options: surveyData.servicosDesejados, hasOther: true }
      ]
    },
    focusGroup: {
      title: 'Secção 3: Grupo Focal',
      questions: [
        { 
          id: 'interesseGrupoFocal', 
          text: 'Estaria interessado(a) em participar numa discussão de grupo focal por um prémio de 30.000 Kz?', 
          type: 'yesno', 
          followUp: 'Se sim, por favor forneça o seu nome e contacto' 
        }
      ]
    }
  };

  // DUPLICATE PREVENTION FUNCTIONS
  
  // Generate unique survey ID
  const generateSurveyId = () => {
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    const userAgent = navigator.userAgent.substring(0, 10);
    return `${timestamp}-${randomStr}-${btoa(userAgent).substring(0, 6)}`;
  };

  // Generate device fingerprint
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
      userAgent: navigator.userAgent.substring(0, 50)
    };
    
    return btoa(JSON.stringify(fingerprint)).substring(0, 20);
  };

  // Check for duplicate submissions
  const checkForDuplicates = (newSurveyData) => {
    const existingSurveys = JSON.parse(localStorage.getItem('offline-surveys') || '[]');
    
    // Check for exact response matches
    const duplicateByResponses = existingSurveys.find(survey => {
      return JSON.stringify(survey.responses) === JSON.stringify(newSurveyData.responses);
    });
    
    // Check for recent submissions (within last 5 minutes)
    const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
    const recentDuplicate = existingSurveys.find(survey => {
      const surveyTime = new Date(survey.timestamp).getTime();
      return surveyTime > fiveMinutesAgo;
    });
    
    return {
      hasExactDuplicate: !!duplicateByResponses,
      hasRecentSubmission: !!recentDuplicate,
      duplicateId: duplicateByResponses?.id || recentDuplicate?.id
    };
  };

  // Convert audio blob to base64 for storage
  const convertBlobToBase64 = (blob) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    });
  };

  // Enhanced save survey offline with duplicate prevention
  const saveOffline = async (surveyData) => {
    try {
      // Generate unique identifiers
      const surveyId = generateSurveyId();
      const fingerprint = generateFingerprint();
      const timestamp = new Date().toISOString();
      
      // Check for duplicates
      const duplicateCheck = checkForDuplicates(surveyData);
      
      if (duplicateCheck.hasExactDuplicate) {
        return {
          success: false,
          message: 'Este inquérito já foi submetido anteriormente.',
          isDuplicate: true,
          duplicateId: duplicateCheck.duplicateId
        };
      }
      
      if (duplicateCheck.hasRecentSubmission) {
        // Ask user for confirmation
        const confirm = window.confirm(
          'Detectámos uma submissão recente. Tem certeza que deseja submeter outro inquérito?'
        );
        
        if (!confirm) {
          return {
            success: false,
            message: 'Submissão cancelada pelo utilizador.',
            wasCancelled: true
          };
        }
      }
      
      // Convert audio recordings to base64
      const audioData = {};
      for (const [key, recording] of Object.entries(audioRecordings)) {
        if (recording?.blob) {
          audioData[key] = await convertBlobToBase64(recording.blob);
        }
      }

      const offlineData = {
        ...surveyData,
        id: surveyId,
        timestamp,
        fingerprint,
        status: 'pending',
        audioData,
        metadata: {
          ...surveyData.metadata,
          submissionMethod: 'offline',
          deviceInfo: {
            userAgent: navigator.userAgent,
            screen: `${screen.width}x${screen.height}`,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
          }
        }
      };

      const existing = JSON.parse(localStorage.getItem('offline-surveys') || '[]');
      const updated = [...existing, offlineData];
      localStorage.setItem('offline-surveys', JSON.stringify(updated));
      setPendingSurveys(updated);

      return {
        success: true,
        message: 'Inquérito guardado localmente. Será sincronizado quando houver conexão.',
        itemId: `OFFLINE_${surveyId}`,
        surveyId: surveyId
      };
    } catch (error) {
      return {
        success: false,
        message: 'Erro ao guardar offline.',
        error: error.message
      };
    }
  };

  // Enhanced SharePoint save function with duplicate prevention
  const saveToSharePoint = useCallback(async (surveyData) => {
    try {
      console.log('Saving to SharePoint with duplicate check...', surveyData);

      // Generate unique identifiers
      const surveyId = generateSurveyId();
      const fingerprint = generateFingerprint();

      // Structure data with duplicate prevention info
      const formattedSurveyData = {
        responses: responses,
        customInputs: customInputs,
        audioRecordings: audioRecordings,
        metadata: {
          section: currentSection,
          completedAt: new Date().toISOString(),
          userType: responses.operadora === 'Africell' ? 'Africell User' : 'Non-Africell User',
          surveyId: surveyId,
          fingerprint: fingerprint,
          submissionMethod: 'online',
          deviceInfo: {
            userAgent: navigator.userAgent,
            screen: `${screen.width}x${screen.height}`,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
          }
        }
      };

      // Add focus group contact info if provided
      if (responses.interesseGrupoFocal === 'Sim' && customInputs.interesseGrupoFocal) {
        const contactParts = customInputs.interesseGrupoFocal.split('|');
        formattedSurveyData.focusGroupContact = {
          name: contactParts[0]?.trim() || '',
          phone: contactParts[1]?.trim() || ''
        };
      }

      // Call your SharePoint function
      const result = await saveSurveyResponse(formattedSurveyData);

      console.log('SharePoint save successful:', result);

      if (!result.success) {
        // Check if it's a duplicate error from server
        if (result.message?.includes('duplicate') || result.message?.includes('já existe')) {
          throw new Error('Inquérito duplicado detectado no servidor.');
        }
        throw new Error(result.message || 'SharePoint save failed');
      }

      return {
        success: true,
        message: result.message || 'Inquérito enviado com sucesso para SharePoint!',
        itemId: result.itemId || `SP_${surveyId}`,
        surveyId: surveyId,
        details: {
          responsesCount: Object.keys(responses).length,
          audioRecordings: Object.keys(audioRecordings).length,
          userType: responses.operadora === 'Africell' ? 'Africell User' : 'Non-Africell User',
          sharePointId: result.itemId,
          audioUploadResult: result.audioUploadResult
        }
      };

    } catch (error) {
      console.error('SharePoint save error:', error);
      throw new Error(`SharePoint error: ${error.message || 'Failed to save to SharePoint'}`);
    }
  }, [responses, customInputs, audioRecordings, currentSection, saveSurveyResponse]);

  // Enhanced sync function with progress tracking
  const syncPendingSurveys = async () => {
    if (!isOnline || pendingSurveys.length === 0) return;

    console.log('Starting sync of pending surveys with duplicate check:', pendingSurveys.length);

    // Set sync progress
    setSyncProgress({ isActive: true, current: 0, total: pendingSurveys.length });

    try {
      const syncResults = [];
      const processedFingerprints = new Set();

      for (let i = 0; i < pendingSurveys.length; i++) {
        const survey = pendingSurveys[i];
        
        // Update progress
        setSyncProgress({ isActive: true, current: i + 1, total: pendingSurveys.length });

        try {
          // Skip if we've already processed a survey with this fingerprint in this batch
          if (survey.fingerprint && processedFingerprints.has(survey.fingerprint)) {
            console.log('Skipping duplicate survey in batch:', survey.id);
            syncResults.push({ 
              surveyId: survey.id, 
              success: false, 
              error: 'Duplicate in batch',
              skipped: true 
            });
            continue;
          }

          console.log('Syncing survey:', survey.id);

          // Add to processed set
          if (survey.fingerprint) {
            processedFingerprints.add(survey.fingerprint);
          }

          // Convert base64 audio data back to blobs if needed
          const audioRecordingsToSync = {};
          if (survey.audioData) {
            for (const [key, base64Data] of Object.entries(survey.audioData)) {
              try {
                const response = await fetch(base64Data);
                const blob = await response.blob();
                const audioUrl = URL.createObjectURL(blob);
                audioRecordingsToSync[key] = { blob, url: audioUrl };
              } catch (audioError) {
                console.warn(`Failed to convert audio for ${key}:`, audioError);
              }
            }
          }

          // Structure the data properly for SharePoint with duplicate prevention
          const formattedSurveyData = {
            responses: survey.responses || {},
            customInputs: survey.customInputs || {},
            audioRecordings: audioRecordingsToSync,
            metadata: {
              ...survey.metadata,
              section: survey.metadata?.section || 'unknown',
              completedAt: survey.timestamp || new Date().toISOString(),
              userType: survey.responses?.operadora === 'Africell' ? 'Africell User' : 'Non-Africell User',
              syncedAt: new Date().toISOString(),
              originalOfflineId: survey.id,
              fingerprint: survey.fingerprint
            }
          };

          // Add focus group contact info if provided
          if (survey.responses?.interesseGrupoFocal === 'Sim' && survey.customInputs?.interesseGrupoFocal) {
            const contactParts = survey.customInputs.interesseGrupoFocal.split('|');
            formattedSurveyData.focusGroupContact = {
              name: contactParts[0]?.trim() || '',
              phone: contactParts[1]?.trim() || ''
            };
          }

          console.log('Formatted data for SharePoint:', formattedSurveyData);

          // Call SharePoint save function
          const result = await saveSurveyResponse(formattedSurveyData);

          if (result.success) {
            console.log('Successfully synced survey:', survey.id, 'SharePoint ID:', result.itemId);
            syncResults.push({ surveyId: survey.id, success: true, sharePointId: result.itemId });

            // Clean up audio URLs to prevent memory leaks
            Object.values(audioRecordingsToSync).forEach(recording => {
              if (recording.url) {
                URL.revokeObjectURL(recording.url);
              }
            });
          } else {
            // Check if it's a duplicate error
            if (result.message?.includes('duplicate') || result.message?.includes('já existe')) {
              console.log('Survey already exists on server, marking as synced:', survey.id);
              syncResults.push({ 
                surveyId: survey.id, 
                success: true, 
                sharePointId: 'DUPLICATE',
                wasDuplicate: true 
              });
            } else {
              throw new Error(result.message || 'SharePoint save failed');
            }
          }

        } catch (syncError) {
          console.error('Failed to sync survey:', survey.id, syncError);
          syncResults.push({ surveyId: survey.id, success: false, error: syncError.message });
        }
      }

      // Process results
      const successfulSyncs = syncResults.filter(r => r.success);
      const failedSyncs = syncResults.filter(r => !r.success && !r.skipped);
      const skippedSyncs = syncResults.filter(r => r.skipped);

      if (successfulSyncs.length > 0) {
        console.log(`Successfully synced ${successfulSyncs.length} surveys`);

        // Remove successfully synced surveys from pending list
        const remainingPending = pendingSurveys.filter(survey =>
          !successfulSyncs.some(sync => sync.surveyId === survey.id)
        );

        // Update localStorage and state
        localStorage.setItem('offline-surveys', JSON.stringify(remainingPending));
        setPendingSurveys(remainingPending);

        // Show success message
        let message = `${successfulSyncs.length} inquéritos sincronizados com sucesso!`;
        if (skippedSyncs.length > 0) {
          message += ` ${skippedSyncs.length} duplicados removidos.`;
        }
        if (failedSyncs.length > 0) {
          message += ` ${failedSyncs.length} falharam.`;
        }

        setSaveResult({
          success: true,
          message: message
        });
      }

      // Clear sync progress after completion
      setTimeout(() => {
        setSyncProgress({ isActive: false, current: 0, total: 0 });
      }, 2000);

      return successfulSyncs.length > 0;

    } catch (error) {
      console.error('Sync process failed:', error);
      setSaveResult({
        success: false,
        message: 'Erro durante a sincronização. Tente novamente.',
        error: error.message
      });
      
      // Clear sync progress on error
      setSyncProgress({ isActive: false, current: 0, total: 0 });
      return false;
    }
  };

  // Function to reset survey to start fresh
  const startNewSurvey = () => {
    setResponses({});
    setCustomInputs({});
    setAudioRecordings({});
    setCurrentStep(0);
    setCurrentSection('demographic');
    setShowSaveDialog(false);
    setSaveResult(null);
    setIsSaving(false);
  };

  // Main save function with duplicate prevention (timer removed)
  const handleSaveSurvey = useCallback(async () => {
    // Prevent saving if no responses
    if (Object.keys(responses).length === 0) {
      setSaveResult({
        success: false,
        message: 'Nenhuma resposta encontrada. Complete pelo menos uma pergunta antes de guardar.'
      });
      return;
    }

    // TIMER REMOVED - only keep content-based duplicate detection
    // The saveOffline function already checks for exact duplicates and recent submissions

    setIsSaving(true);
    setSaveResult(null);

    try {
      const surveyDataToSave = {
        responses,
        customInputs,
        metadata: {
          section: currentSection,
          completedAt: new Date().toISOString(),
          userType: responses.operadora === 'Africell' ? 'Africell User' : 'Non-Africell User'
        }
      };

      let result;
      
      if (isOnline) {
        try {
          result = await saveToSharePoint(surveyDataToSave);
        } catch (error) {
          // Fall back to offline storage
          result = await saveOffline(surveyDataToSave);
        }
      } else {
        result = await saveOffline(surveyDataToSave);
      }

      setSaveResult(result);

      if (result.success) {
        // Don't reset state immediately - let user see success message first
        // State will be reset when they close the dialog or start a new survey
      }
    } catch (error) {
      console.error('Error saving survey:', error);
      setSaveResult({
        success: false,
        message: 'Erro inesperado ao guardar o inquérito.',
        error: error.message
      });
    } finally {
      setIsSaving(false);
    }
  }, [responses, customInputs, currentSection, isOnline, saveToSharePoint]);

  // Audio recording functions
  const startRecording = async (questionId) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        const audioUrl = URL.createObjectURL(audioBlob);

        setAudioRecordings(prev => ({
          ...prev,
          [questionId]: { blob: audioBlob, url: audioUrl }
        }));

        handleResponse(questionId, `[Gravação de Áudio - ${new Date().toLocaleTimeString()}]`);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(questionId);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (error) {
      console.error('Error accessing microphone:', error);
      alert('Erro ao acessar o microfone. Por favor, verifique as permissões.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  };

  const playAudio = (questionId) => {
    const recording = audioRecordings[questionId];
    if (recording && audioRef.current) {
      audioRef.current.src = recording.url;
      audioRef.current.play();
      setIsPlaying(questionId);

      audioRef.current.onended = () => {
        setIsPlaying(false);
      };
    }
  };

  const deleteAudio = (questionId) => {
    setAudioRecordings(prev => {
      const newRecordings = { ...prev };
      if (newRecordings[questionId]) {
        URL.revokeObjectURL(newRecordings[questionId].url);
        delete newRecordings[questionId];
      }
      return newRecordings;
    });

    setResponses(prev => ({
      ...prev,
      [questionId]: ''
    }));
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const handleResponse = (questionId, value, customValue = '') => {
    setResponses(prev => ({
      ...prev,
      [questionId]: value
    }));

    if (customValue) {
      setCustomInputs(prev => ({
        ...prev,
        [questionId]: customValue
      }));
    }
  };

  const getCurrentQuestion = () => {
    const currentSectionData = sections[currentSection];
    return currentSectionData.questions[currentStep];
  };

  const nextStep = () => {
    // Check if currently recording and prevent navigation
    if (isRecording) {
      alert('Por favor, pare a gravação antes de continuar para a próxima pergunta.');
      return;
    }

    const currentSectionData = sections[currentSection];

    if (currentStep < currentSectionData.questions.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      if (currentSection === 'demographic') {
        const operadora = responses.operadora;
        if (operadora === 'Africell') {
          setCurrentSection('africellUser');
        } else {
          setCurrentSection('nonAfricellUser');
        }
        setCurrentStep(0);
      } else if (currentSection === 'africellUser' || currentSection === 'nonAfricellUser') {
        setCurrentSection('focusGroup');
        setCurrentStep(0);
      } else {
        setShowSaveDialog(true);
      }
    }
  };

  const prevStep = () => {
    // Check if currently recording and prevent navigation
    if (isRecording) {
      alert('Por favor, pare a gravação antes de voltar para a pergunta anterior.');
      return;
    }

    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    } else if (currentSection === 'focusGroup') {
      const operadora = responses.operadora;
      if (operadora === 'Africell') {
        setCurrentSection('africellUser');
        setCurrentStep(sections.africellUser.questions.length - 1);
      } else {
        setCurrentSection('nonAfricellUser');
        setCurrentStep(sections.nonAfricellUser.questions.length - 1);
      }
    } else if (currentSection !== 'demographic') {
      setCurrentSection('demographic');
      setCurrentStep(sections.demographic.questions.length - 1);
    }
  };

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
              <option value="">Selecione uma opção</option>
              {question.options.map(option => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>

            {question.hasOther && currentValue === 'Outro (especificar)' && (
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

      case 'likert':
        return (
          <div className="space-y-4">
            <div className="flex justify-between text-xs sm:text-sm text-gray-600 mb-3 px-2">
              <span>Muito Satisfeito</span>
              <span>Muito Insatisfeito</span>
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
              {['Sim', 'Não'].map(option => (
                <label key={option} className="flex items-center cursor-pointer p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                  <input
                    type="radio"
                    name={question.id}
                    value={option}
                    checked={currentValue === option}
                    onChange={(e) => handleResponse(question.id, e.target.value)}
                    className="mr-3 scale-125 accent-primary"
                  />
                  <span className="text-base sm:text-lg">{option}</span>
                </label>
              ))}
            </div>

            {currentValue === 'Sim' && question.followUp && (
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  {question.followUp}
                </label>
                {question.id === 'interesseGrupoFocal' ? (
                  <div className="space-y-3">
                    <input
                      type="text"
                      placeholder="Nome completo"
                      value={customValue.split('|')[0] || ''}
                      onChange={(e) => {
                        const parts = customValue.split('|');
                        const newValue = `${e.target.value}|${parts[1] || ''}`;
                        handleResponse(question.id, currentValue, newValue);
                      }}
                      className="w-full p-3 sm:p-4 border-2 border-gray-300 rounded-lg focus:border-primary focus:outline-none text-base"
                    />
                    <input
                      type="text"
                      placeholder="Número de contacto"
                      value={customValue.split('|')[1] || ''}
                      onChange={(e) => {
                        const parts = customValue.split('|');
                        const newValue = `${parts[0] || ''}|${e.target.value}`;
                        handleResponse(question.id, currentValue, newValue);
                      }}
                      className="w-full p-3 sm:p-4 border-2 border-gray-300 rounded-lg focus:border-primary focus:outline-none text-base"
                    />
                  </div>
                ) : (
                  <textarea
                    placeholder={question.followUp}
                    value={customValue}
                    onChange={(e) => handleResponse(question.id, currentValue, e.target.value)}
                    className="w-full p-3 sm:p-4 border-2 border-gray-300 rounded-lg focus:border-primary focus:outline-none h-20 sm:h-24 text-base"
                  />
                )}
              </div>
            )}
          </div>
        );

      case 'yesnomaybe':
        return (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              {['Sim', 'Não', 'Talvez'].map(option => (
                <label key={option} className="flex items-center cursor-pointer p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                  <input
                    type="radio"
                    name={question.id}
                    value={option}
                    checked={currentValue === option}
                    onChange={(e) => handleResponse(question.id, e.target.value)}
                    className="mr-3 scale-125 accent-primary"
                  />
                  <span className="text-base sm:text-lg">{option}</span>
                </label>
              ))}
            </div>

            {currentValue && question.followUp && (
              <textarea
                placeholder={question.followUp}
                value={customValue}
                onChange={(e) => handleResponse(question.id, currentValue, e.target.value)}
                className="w-full p-3 sm:p-4 border-2 border-gray-300 rounded-lg focus:border-primary focus:outline-none h-20 sm:h-24 text-base"
              />
            )}
          </div>
        );

      case 'multiple':
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
                      let newValues;
                      if (e.target.checked) {
                        newValues = [...selectedValues, option];
                      } else {
                        newValues = selectedValues.filter(v => v !== option);
                      }
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

      case 'voice':
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
                      <p className="text-gray-600 mb-2 text-sm sm:text-base">Clique para começar a gravar sua resposta</p>
                      <p className="text-xs sm:text-sm text-gray-500">Pressione o botão do microfone e fale claramente</p>
                    </div>

                    {!isCurrentlyRecording ? (
                      <button
                        onClick={() => startRecording(question.id)}
                        disabled={isRecording && isRecording !== question.id}
                        className="flex items-center px-4 py-2 sm:px-6 sm:py-3 bg-primary text-white rounded-full hover:bg-primaryDark transition-colors shadow-lg disabled:opacity-50"
                      >
                        <Mic className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                        <span className="text-sm sm:text-base">
                          {isRecording && isRecording !== question.id ? 'Outro áudio gravando...' : 'Começar Gravação'}
                        </span>
                      </button>
                    ) : (
                      <div className="text-center">
                        <div className="flex items-center justify-center mb-3 sm:mb-4">
                          <div className="w-3 h-3 sm:w-4 sm:h-4 bg-primary rounded-full animate-pulse mr-2"></div>
                          <span className="text-primary font-medium text-sm sm:text-base">Gravando... {formatTime(recordingTime)}</span>
                        </div>
                        <button
                          onClick={stopRecording}
                          className="flex items-center px-4 py-2 sm:px-6 sm:py-3 bg-gray-600 text-white rounded-full hover:bg-gray-700 transition-colors"
                        >
                          <Square className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                          <span className="text-sm sm:text-base">Parar Gravação</span>
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="w-full">
                    <div className="flex flex-col sm:flex-row items-center sm:justify-between bg-green-50 border border-green-200 rounded-lg p-3 sm:p-4 mb-3 sm:mb-4 gap-2 sm:gap-0">
                      <div className="flex items-center">
                        <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                        <span className="text-green-700 font-medium text-sm sm:text-base">Gravação concluída</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => playAudio(question.id)}
                          disabled={isCurrentlyPlaying}
                          className="flex items-center px-2 py-1 sm:px-3 sm:py-2 bg-primary text-white rounded hover:bg-primaryDark transition-colors disabled:opacity-50"
                        >
                          {isCurrentlyPlaying ? <Pause className="w-3 h-3 sm:w-4 sm:h-4" /> : <Play className="w-3 h-3 sm:w-4 sm:h-4" />}
                        </button>
                        <button
                          onClick={() => deleteAudio(question.id)}
                          className="flex items-center px-2 py-1 sm:px-3 sm:py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                        >
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
                        {isRecording && isRecording !== question.id ? 'Outro áudio gravando...' : 'Gravar Novamente'}
                      </span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="border-t pt-4">
              <p className="text-xs sm:text-sm text-gray-600 mb-2">Ou escreva sua resposta:</p>
              <textarea
                placeholder={question.placeholder || 'Digite sua resposta aqui...'}
                value={currentValue.includes('[Gravação de Áudio') ? '' : currentValue}
                onChange={(e) => handleResponse(question.id, e.target.value)}
                className="w-full p-3 sm:p-4 border-2 border-gray-300 rounded-lg focus:border-primary focus:outline-none h-20 sm:h-24 text-base"
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const isStepComplete = () => {
    const question = getCurrentQuestion();
    const value = responses[question.id];

    // Prevent moving to next question if currently recording
    if (isRecording) {
      return false;
    }

    if (!value) return false;

    if (question.type === 'voice') {
      return audioRecordings[question.id] || value.trim() !== '';
    }

    if ((question.hasOther && value === 'Outro (especificar)') ||
        (question.type === 'yesno' && value === 'Sim' && question.followUp) ||
        (question.type === 'yesnomaybe' && question.followUp)) {
      
      if (question.id === 'interesseGrupoFocal' && value === 'Sim') {
        const parts = customInputs[question.id]?.split('|') || [];
        return parts[0]?.trim() && parts[1]?.trim();
      }
      
      return !!customInputs[question.id]?.trim();
    }

    return true;
  };

  const currentQuestion = getCurrentQuestion();
  const currentSectionData = sections[currentSection];
  const totalSteps = currentSectionData.questions.length;
  const isLastStep = currentStep === totalSteps - 1;
  const isLastSection = currentSection === 'focusGroup' && isLastStep;

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 py-4 px-3 sm:py-8 sm:px-4">
      {/* Connection Status Badge with Sync Progress */}
      <div className={`fixed bottom-4 right-4 z-40 px-3 py-2 rounded-full shadow-lg transition-all duration-300 ${
        isOnline ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
      } ${(pendingSurveys.length > 0 || syncProgress.isActive) ? 'animate-pulse' : ''}`}>
        <div className="flex items-center gap-2 text-xs sm:text-sm">
          {isOnline ? <Wifi className="w-3 h-3 sm:w-4 sm:h-4" /> : <WifiOff className="w-3 h-3 sm:w-4 sm:h-4" />}
          <span className="hidden sm:inline">
            {isOnline ? 'Online' : 'Offline'}
          </span>
          {(pendingSurveys.length > 0 || syncProgress.isActive) && (
            <span className="px-2 py-1 bg-white bg-opacity-20 rounded-full text-xs">
              {syncProgress.isActive ? `${syncProgress.current}/${syncProgress.total}` : pendingSurveys.length}
            </span>
          )}
        </div>
      </div>

      <div className="max-w-lg mx-auto sm:max-w-2xl">
        <div className="bg-white rounded-xl shadow-lg p-4 sm:p-8">
          {/* Mobile-Optimized Header */}
          <div className="mb-6 sm:mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-primaryDark text-center sm:text-left">
                Inquérito Africell
              </h1>
              <div className="text-sm text-gray-500 text-center sm:text-right">
                {currentStep + 1} de {totalSteps}
              </div>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
              <div
                className="bg-primary h-2 rounded-full transition-all duration-300"
                style={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
              />
            </div>

            <h2 className="text-base sm:text-lg font-semibold text-primaryDark text-center">
              {currentSectionData.title}
            </h2>
          </div>

          {/* Centered Question */}
          <div className="mb-6 sm:mb-8">
            <h3 className="text-lg sm:text-xl font-medium text-primaryDark mb-4 sm:mb-6 text-center px-2">
              {currentQuestion.text}
            </h3>

            <div className="max-w-md mx-auto">
              {renderQuestion(currentQuestion)}
            </div>
          </div>

          {/* Mobile-Optimized Navigation */}
          <div className="flex flex-col sm:flex-row justify-between gap-3 sm:gap-0">
            <button
              onClick={prevStep}
              disabled={currentStep === 0 && currentSection === 'demographic' || isRecording}
              className="flex items-center justify-center px-4 py-3 sm:px-6 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors order-2 sm:order-1"
              title={isRecording ? "Pare a gravação para navegar" : ""}
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Anterior
            </button>

            <button
              onClick={nextStep}
              disabled={!isStepComplete() || isRecording}
              className="flex items-center justify-center px-4 py-3 sm:px-6 bg-primary text-white rounded-lg hover:bg-primaryDark disabled:opacity-50 disabled:cursor-not-allowed transition-colors order-1 sm:order-2"
              title={isRecording ? "Pare a gravação para continuar" : ""}
            >
              {isLastSection ? (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Finalizar
                </>
              ) : (
                <>
                  Próxima
                  <ChevronRight className="w-4 h-4 ml-2" />
                </>
              )}
            </button>
          </div>

          {/* Recording Warning Message */}
          {isRecording && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center text-yellow-800">
                <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse mr-2"></div>
                <p className="text-sm font-medium">
                  Gravação em progresso. Pare a gravação para navegar entre perguntas.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Success message with option to start new survey */}
        {saveResult && saveResult.success && !showSaveDialog && (
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-800">
                  ✓ Inquérito guardado com sucesso!
                </p>
                <p className="text-xs text-green-600">ID: {saveResult.itemId}</p>
              </div>
              <button
                onClick={startNewSurvey}
                className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 text-sm"
              >
                Novo Inquérito
              </button>
            </div>
          </div>
        )}

        {/* Auto-sync Status Display (no manual sync button) */}
        {isOnline && (pendingSurveys.length > 0 || syncProgress.isActive) && (
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                {syncProgress.isActive ? (
                  <>
                    <p className="text-sm font-medium text-blue-800">
                      Sincronizando inquéritos...
                    </p>
                    <div className="mt-2">
                      <div className="flex justify-between text-xs text-blue-600 mb-1">
                        <span>Progresso: {syncProgress.current} de {syncProgress.total}</span>
                        <span>{Math.round((syncProgress.current / syncProgress.total) * 100)}%</span>
                      </div>
                      <div className="w-full bg-blue-200 rounded-full h-2">
                        <div 
                          className="bg-blue-500 h-2 rounded-full transition-all duration-300" 
                          style={{ width: `${(syncProgress.current / syncProgress.total) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-medium text-blue-800">
                      {pendingSurveys.length} inquérito{pendingSurveys.length > 1 ? 's' : ''} pendente{pendingSurveys.length > 1 ? 's' : ''}
                    </p>
                    <p className="text-xs text-blue-600">Sincronização automática iniciada...</p>
                  </>
                )}
              </div>
              
              {/* Loading indicator */}
              {syncProgress.isActive && (
                <div className="ml-3 flex items-center">
                  <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Save Dialog */}
        {showSaveDialog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
              <h3 className="text-lg font-semibold mb-4">Guardar Inquérito</h3>

              {!saveResult ? (
                <>
                  <p className="text-gray-600 mb-4">
                    Deseja guardar as respostas do inquérito agora?
                  </p>

                  <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                    <h4 className="text-sm font-medium text-gray-800 mb-3">
                      Resumo do Inquérito:
                    </h4>
                    <div className="space-y-2 text-sm text-gray-600">
                      <p>• Tipo: {responses.operadora === 'Africell' ? 'Utilizador Africell' : 'Não utilizador Africell'}</p>
                      <p>• Respostas: {Object.keys(responses).length}</p>
                      <p>• Gravações: {Object.keys(audioRecordings).length}</p>
                      <p>• Status: {isOnline ? 'Online - SharePoint' : 'Offline - Local'}</p>
                      {responses.interesseGrupoFocal === 'Sim' && (
                        <p>• Grupo focal: Interessado</p>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowSaveDialog(false)}
                      disabled={isSaving}
                      className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 disabled:opacity-50"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleSaveSurvey}
                      disabled={isSaving}
                      className="flex-1 flex items-center justify-center px-4 py-2 bg-primary text-white rounded hover:bg-primaryDark disabled:opacity-50"
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Guardando...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4 mr-2" />
                          Guardar
                        </>
                      )}
                    </button>
                  </div>
                </>
              ) : (
                <div>
                  <div className={`p-4 rounded-lg mb-4 ${
                    saveResult.success
                      ? 'bg-green-50 border border-green-200 text-green-700'
                      : 'bg-red-50 border border-red-200 text-red-700'
                  }`}>
                    <p className="font-medium">
                      {saveResult.success ? '✓ Sucesso!' : '✗ Erro'}
                    </p>
                    <p className="text-sm mt-1">{saveResult.message}</p>
                    {saveResult.itemId && (
                      <p className="text-xs mt-1">ID: {saveResult.itemId}</p>
                    )}
                    {saveResult.isDuplicate && (
                      <p className="text-xs mt-1 font-medium">Inquérito duplicado detectado</p>
                    )}
                  </div>

                  {saveResult.success ? (
                    <div className="flex gap-3">
                      <button
                        onClick={() => setShowSaveDialog(false)}
                        className="flex-1 px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                      >
                        Fechar
                      </button>
                      <button
                        onClick={startNewSurvey}
                        className="flex-1 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                      >
                        Novo Inquérito
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-3">
                      <button
                        onClick={() => setShowSaveDialog(false)}
                        className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
                      >
                        Fechar
                      </button>
                      {!saveResult.isDuplicate && !saveResult.wasCancelled && (
                        <button
                          onClick={handleSaveSurvey}
                          className="flex-1 px-4 py-2 bg-primary text-white rounded hover:bg-primaryDark"
                        >
                          Tentar Novamente
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Hidden audio element for playback */}
        <audio ref={audioRef} style={{ display: 'none' }} />
      </div>
      
      <style>{`
        .accent-primary {
          accent-color: #f97316;
        }
        .bg-primary {
          background-color: #f97316;
        }
        .text-primary {
          color: #f97316;
        }
        .text-primaryDark {
          color: #ea580c;
        }
        .border-primary {
          border-color: #f97316;
        }
        .hover\\:bg-primary:hover {
          background-color: #f97316;
        }
        .hover\\:bg-primaryDark:hover {
          background-color: #ea580c;
        }
      `}</style>
    </div>
  );
};

export default AfricellSurvey;