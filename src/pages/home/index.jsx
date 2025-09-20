import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronRight, ChevronLeft, Check, Mic, Square, Play, Pause, Trash2, Save, Loader2 } from 'lucide-react';
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

  // Get SharePoint functions from the hook
  const {
    saveSurveyResponse,
    testSharePointConnection,
    getSurveyStats
  } = useSharePoint();

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioRef = useRef(null);
  const timerRef = useRef(null);

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
    }
  };

  // Save survey function with enhanced error handling
  const handleSaveSurvey = useCallback(async () => {
    setIsSaving(true);
    setSaveResult(null);

    try {
      const surveyDataToSave = {
        responses,
        customInputs,
        audioRecordings
      };

      console.log('Saving survey data:', surveyDataToSave);

      // Call the save function from the hook
      const result = await saveSurveyResponse(surveyDataToSave);

      setSaveResult(result);

      if (result.success) {
        // Reset form after successful save
        setTimeout(() => {
          setResponses({});
          setCustomInputs({});
          setAudioRecordings({});
          setCurrentStep(0);
          setCurrentSection('demographic');
          setShowSaveDialog(false);
        }, 2000);
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
  }, [responses, customInputs, audioRecordings, saveSurveyResponse]);

  // Debug function to test SharePoint connection
  const handleTestConnection = useCallback(async () => {
    try {
      const result = await testSharePointConnection();
      console.log('Connection test result:', result);
      alert(`Test Result: ${result.message}\n\nCheck console for details.`);
    } catch (error) {
      console.error('Test connection error:', error);
      alert('Test failed. Check console for details.');
    }
  }, [testSharePointConnection]);

  // Audio recording functions - updated to handle multiple recordings
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

        // Store a reference that audio was recorded for this specific question
        handleResponse(questionId, `[Audio Recording - ${new Date().toLocaleTimeString()}]`);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(questionId); // Track which question is being recorded
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
      setIsPlaying(questionId); // Track which audio is playing

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

    // Clear the response text as well when deleting audio
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
    const currentSectionData = sections[currentSection];

    if (currentStep < currentSectionData.questions.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Handle section transition
      if (currentSection === 'demographic') {
        // Route based on primary operator
        const operadora = responses.operadora;
        if (operadora === 'Africell') {
          setCurrentSection('africellUser');
        } else {
          setCurrentSection('nonAfricellUser');
        }
        setCurrentStep(0);
      } else {
        // Survey complete - show save dialog
        setShowSaveDialog(true);
      }
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
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
              className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-orange-500 focus:outline-none"
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
                className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-orange-500 focus:outline-none"
              />
            )}
          </div>
        );

      case 'likert':
        return (
          <div className="space-y-4">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>Muito Satisfeito</span>
              <span>Muito Insatisfeito</span>
            </div>
            <div className="flex justify-between">
              {[1, 2, 3, 4, 5].map(value => (
                <label key={value} className="flex flex-col items-center cursor-pointer">
                  <input
                    type="radio"
                    name={question.id}
                    value={value}
                    checked={currentValue === value.toString()}
                    onChange={(e) => handleResponse(question.id, e.target.value)}
                    className="mb-2 scale-150 accent-orange-500"
                  />
                  <span className="text-lg font-bold">{value}</span>
                </label>
              ))}
            </div>
          </div>
        );

      case 'yesno':
        return (
          <div className="space-y-4">
            <div className="flex gap-4">
              {['Sim', 'Não'].map(option => (
                <label key={option} className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name={question.id}
                    value={option}
                    checked={currentValue === option}
                    onChange={(e) => handleResponse(question.id, e.target.value)}
                    className="mr-2 scale-125 accent-orange-500"
                  />
                  <span className="text-lg">{option}</span>
                </label>
              ))}
            </div>

            {currentValue === 'Sim' && question.followUp && (
              <textarea
                placeholder={question.followUp}
                value={customValue}
                onChange={(e) => handleResponse(question.id, currentValue, e.target.value)}
                className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-orange-500 focus:outline-none h-24"
              />
            )}
          </div>
        );

      case 'yesnomaybe':
        return (
          <div className="space-y-4">
            <div className="flex gap-4 flex-wrap">
              {['Sim', 'Não', 'Talvez'].map(option => (
                <label key={option} className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name={question.id}
                    value={option}
                    checked={currentValue === option}
                    onChange={(e) => handleResponse(question.id, e.target.value)}
                    className="mr-2 scale-125 accent-orange-500"
                  />
                  <span className="text-lg">{option}</span>
                </label>
              ))}
            </div>

            {currentValue && question.followUp && (
              <textarea
                placeholder={question.followUp}
                value={customValue}
                onChange={(e) => handleResponse(question.id, currentValue, e.target.value)}
                className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-orange-500 focus:outline-none h-24"
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
                <label key={option} className="flex items-center cursor-pointer p-2 hover:bg-gray-50 rounded">
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
                    className="mr-3 scale-125 accent-orange-500"
                  />
                  <span>{option}</span>
                </label>
              ))}
            </div>

            {question.hasOther && selectedValues.includes('Outro (especificar)') && (
              <input
                type="text"
                placeholder="Por favor, especifique"
                value={customValue}
                onChange={(e) => handleResponse(question.id, currentValue, e.target.value)}
                className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-orange-500 focus:outline-none"
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
            <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-6">
              <div className="flex flex-col items-center space-y-4">
                {!hasRecording ? (
                  <>
                    <div className="text-center">
                      <p className="text-gray-600 mb-2">Clique para começar a gravar sua resposta</p>
                      <p className="text-sm text-gray-500">Pressione o botão do microfone e fale claramente</p>
                    </div>

                    {!isCurrentlyRecording ? (
                      <button
                        onClick={() => startRecording(question.id)}
                        disabled={isRecording && isRecording !== question.id} // Disable if another question is recording
                        className="flex items-center px-6 py-3 bg-orange-500 text-white rounded-full hover:bg-orange-600 transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Mic className="w-5 h-5 mr-2" />
                        {isRecording && isRecording !== question.id ? 'Outro áudio gravando...' : 'Começar Gravação'}
                      </button>
                    ) : (
                      <div className="text-center">
                        <div className="flex items-center justify-center mb-4">
                          <div className="w-4 h-4 bg-orange-500 rounded-full animate-pulse mr-2"></div>
                          <span className="text-orange-500 font-medium">Gravando... {formatTime(recordingTime)}</span>
                        </div>
                        <button
                          onClick={stopRecording}
                          className="flex items-center px-6 py-3 bg-gray-600 text-white rounded-full hover:bg-gray-700 transition-colors"
                        >
                          <Square className="w-5 h-5 mr-2" />
                          Parar Gravação
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="w-full">
                    <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                      <div className="flex items-center">
                        <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                        <span className="text-green-700 font-medium">Gravação concluída para {question.id}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => playAudio(question.id)}
                          disabled={isCurrentlyPlaying}
                          className="flex items-center px-3 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 transition-colors disabled:opacity-50"
                        >
                          {isCurrentlyPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => deleteAudio(question.id)}
                          className="flex items-center px-3 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <button
                      onClick={() => startRecording(question.id)}
                      disabled={isRecording && isRecording !== question.id}
                      className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 text-gray-600 rounded hover:bg-gray-50 transition-colors disabled:opacity-50"
                    >
                      <Mic className="w-4 h-4 mr-2" />
                      {isRecording && isRecording !== question.id ? 'Outro áudio gravando...' : 'Gravar Novamente'}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Fallback text input */}
            <div className="border-t pt-4">
              <p className="text-sm text-gray-600 mb-2">Ou escreva sua resposta:</p>
              <textarea
                placeholder={question.placeholder || 'Digite sua resposta aqui...'}
                value={currentValue.includes('[Audio Recording') ? '' : currentValue} // Clear text if audio is recorded
                onChange={(e) => handleResponse(question.id, e.target.value)}
                className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-orange-500 focus:outline-none h-24"
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

    if (!value) return false;

    // For voice questions, check if audio is recorded or text is provided
    if (question.type === 'voice') {
      return audioRecordings[question.id] || value.trim() !== '';
    }

    // Check if custom input is required and provided
    if ((question.hasOther && value === 'Outro (especificar)') ||
        (question.type === 'yesno' && value === 'Sim' && question.followUp) ||
        (question.type === 'yesnomaybe' && question.followUp)) {
      return !!customInputs[question.id];
    }

    return true;
  };

  const currentQuestion = getCurrentQuestion();
  const currentSectionData = sections[currentSection];
  const totalSteps = currentSectionData.questions.length;
  const isLastStep = currentStep === totalSteps - 1;
  const isLastSection = currentSection === 'nonAfricellUser' ||
                       (currentSection === 'africellUser' && isLastStep);

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-2xl font-bold text-gray-800">
                Inquérito Africell
              </h1>
              <div className="flex items-center gap-2">
                <div className="text-sm text-gray-500">
                  {currentStep + 1} de {totalSteps}
                </div>
                {/* Debug button - remove in production */}
                
              </div>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-orange-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
              />
            </div>

            <h2 className="text-lg font-semibold text-gray-700 mt-4">
              {currentSectionData.title}
            </h2>
          </div>

          {/* Question */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-6">
              <h3 className="text-xl font-medium text-orange-700">
                {currentQuestion.text}
              </h3>
              {/* Audio indicator for voice questions */}
              {currentQuestion.type === 'voice' && audioRecordings[currentQuestion.id] && (
                <div className="flex items-center px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">
                  <Mic className="w-3 h-3 mr-1" />
                  Audio
                </div>
              )}
            </div>

            {renderQuestion(currentQuestion)}
          </div>

          {/* Navigation */}
          <div className="flex justify-between">
            <button
              onClick={prevStep}
              disabled={currentStep === 0 && currentSection === 'demographic'}
              className="flex items-center px-6 py-3 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Anterior
            </button>

            <button
              onClick={nextStep}
              disabled={!isStepComplete()}
              className="flex items-center px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
        </div>

        {/* Save Dialog */}
        {showSaveDialog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full max-h-90vh overflow-y-auto">
              <h3 className="text-lg font-semibold mb-4">Guardar Inquérito</h3>

              {!saveResult ? (
                <>
                  <p className="text-gray-600 mb-4">
                    Deseja guardar as respostas do inquérito agora?
                  </p>

                  {/* Audio summary */}
                  {Object.keys(audioRecordings).length > 0 && (
                    <div className="mb-6 p-3 bg-blue-50 rounded-lg">
                      <h4 className="text-sm font-medium text-blue-800 mb-2">
                        Gravações de áudio encontradas:
                      </h4>
                      <ul className="text-xs text-blue-700 space-y-1">
                        {Object.keys(audioRecordings).map(questionId => (
                          <li key={questionId} className="flex items-center">
                            <Mic className="w-3 h-3 mr-1" />
                            {questionId}
                          </li>
                        ))}
                      </ul>
                      <p className="text-xs text-blue-600 mt-2">
                        {Object.keys(audioRecordings).length} gravação(ões) serão guardadas como anexos.
                      </p>
                    </div>
                  )}

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
                      className="flex-1 flex items-center justify-center px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 disabled:opacity-50"
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
                    {!saveResult.success && saveResult.error && (
                      <details className="mt-2">
                        <summary className="text-xs cursor-pointer hover:underline">
                          Technical Details
                        </summary>
                        <pre className="text-xs mt-1 p-2 bg-gray-100 rounded overflow-auto max-h-32">
                          {JSON.stringify(saveResult.details || saveResult.error, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>

                  {saveResult.success ? (
                    <button
                      onClick={() => setShowSaveDialog(false)}
                      className="w-full px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                    >
                      Fechar
                    </button>
                  ) : (
                    <div className="flex gap-3">
                      <button
                        onClick={() => setShowSaveDialog(false)}
                        className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
                      >
                        Fechar
                      </button>
                      <button
                        onClick={handleSaveSurvey}
                        className="flex-1 px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600"
                      >
                        Tentar Novamente
                      </button>
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
    </div>
  );
};

export default AfricellSurvey;
