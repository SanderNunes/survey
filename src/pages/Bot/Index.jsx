import { useSharePoint } from '@/hooks/useSharePoint';
import React, { useEffect, useState, useCallback } from 'react';
import { Send, MessageCircle, Database, FileText, Loader, Sparkles, RefreshCw } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import FallBackAvatar from '@/components/FallBackAvatar';
import { useGraph } from '@/hooks/useGraph';
import { getInitials } from '@/utils/constants';
import { useTranslation } from 'react-i18next';

const Cellito = () => {
  const { t } = useTranslation();

  const {
    sp,
    askRAGQuestion,
    initializeRAGWithCache,
    rebuildCache: performCacheRebuild, // Use the renamed function
    getCacheFile,
    // Get state from the hook instead of managing locally
    isIndexing,
    processedDocs,
    ragStatus,
    setRagStatus // In case we need to update externally
  } = useSharePoint();

  const { getMyProfilePhoto, profilePhoto } = useGraph();
  const { userProfile } = useAuth();

  // Only manage chat-related state locally
  const [chat, setChat] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if(userProfile){
      getMyProfilePhoto()
    }
  }, [userProfile, getMyProfilePhoto]);

  // Handle manual cache rebuild
  const handleRebuildCache = useCallback(async () => {
    if (isIndexing) return;

    try {
      setError('');
      const result = await performCacheRebuild(); // Use the correct function name
      if (!result.success) {
        setError(`Erro ao reconstruir cache: ${result.error}`);
      }
    } catch (error) {
      console.error('Error rebuilding cache:', error);
      setError(`Erro ao reconstruir cache: ${error.message}`);
    }
  }, [performCacheRebuild, isIndexing]);

  // Check cache status (for debugging/info)
  const checkCacheStatus = useCallback(async () => {
    try {
      const cache = await getCacheFile();
      if (cache) {
        console.log('📋 Cache Status:', {
          documents: cache.metadata?.totalDocs || 0,
          chunks: cache.metadata?.totalChunks || 0,
          lastUpdated: cache.metadata?.lastUpdated,
          buildTime: cache.metadata?.buildTime
        });
      }
    } catch (error) {

    }
  }, [getCacheFile]);

  // Initialize RAG system
  const initializeRAG = useCallback(async () => {
    if (!sp?.web || isIndexing) return;

    try {
      setError('');


      const result = await initializeRAGWithCache();

      if (!result.success) {
        setError(`Falha ao inicializar sistema RAG: ${result.error}`);
      }

      // Check cache status for additional info
      await checkCacheStatus();

    } catch (err) {
      console.error('❌ RAG initialization failed:', err);
      setError(`Falha ao inicializar sistema RAG: ${err.message}`);
    }
  }, [sp, initializeRAGWithCache, checkCacheStatus, isIndexing]);

  // Handle sending messages
  const handleSend = async (message = input) => {
    if (!message.trim()) return;

    const userMessage = { role: "user", content: message };
    const updatedChat = [...chat, userMessage];
    setChat(updatedChat);
    setInput("");
    setLoading(true);
    setError("");

    try {


      const chatHistory = updatedChat
        .filter(msg => msg.role !== 'system')
        .slice(-10)
        .map(msg => ({role: msg.role, content: msg.content}));

      const result = await askRAGQuestion(message, processedDocs, chatHistory);

      let responseContent = result.content;

      if (result.sources && result.sources.length > 0) {
        responseContent += "\n\n📚 **Fontes consultadas:**\n";
        const uniqueSources = [...new Set(result.sources.map(s => s.fileName))];
        uniqueSources.forEach((fileName, index) => {
          responseContent += `${index + 1}. ${fileName}\n`;
        });
      }

      setChat([...updatedChat, {
        role: "assistant",
        content: responseContent,
        metadata: {
          sources: result.sources,
          hasRelevantDocs: result.hasRelevantDocs,
          totalChunksSearched: result.totalChunksSearched
        }
      }]);

    } catch (err) {
      console.error("❌ Error in chat:", err);
      setError(`Erro: ${err.message}`);
      setChat([...updatedChat, {
        role: "assistant",
        content: "Peço desculpas, mas estou enfrentando dificuldades técnicas no momento. Por favor, tente novamente em alguns instantes."
      }]);
    } finally {
      setLoading(false);
    }
  };

  // Sample questions
  const sampleQuestions = [
    "Quais são as diretrizes da marca da empresa?",
    "Como devo lidar com reclamações de clientes?",
    "Quais são as políticas de reembolso?",
    "Procedimentos de atendimento ao cliente"
  ];

  // Auto-initialize when SharePoint is ready
  useEffect(() => {
    if (sp?.web && !isIndexing && !ragStatus.isReady) {
      initializeRAG();
    }
  }, [sp, initializeRAG, isIndexing, ragStatus.isReady]);

  return (
    <div className="flex flex-col h-[90vh] mt-10 bg-white">

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden">
        {/* Empty State - Show when no conversation */}
        {chat.length === 0 && !isIndexing && (
          <div className="flex flex-col items-center justify-center h-full px-4">
            <div className="text-center max-w-2xl">
              {/* Logo/Icon */}
              <div className="w-16 h-16 bg-gradient-to-br from-accent to-primary-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <MessageCircle className="w-8 h-8 text-white" />
              </div>

              {/* Welcome Text */}
              <h1 className="text-4xl font-bold text-gray-900 mb-4">
                {t('cellito.greetings')}{" "}{t('cellito.welcomeMessage')}
              </h1>
              <p className="text-xl text-gray-600 mb-8">
                {t('cellito.description')}
              </p>



              {/* Sample Questions */}
              {ragStatus.isReady && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-2xl mx-auto">
                  {sampleQuestions.map((question, i) => (
                    <button
                      key={i}
                      onClick={() => handleSend(question)}
                      className="p-4 text-left bg-gray-50 hover:bg-gray-100 rounded-xl border border-gray-200 transition-colors duration-200"
                      disabled={loading}
                    >
                      <div className="flex items-start">
                        <Sparkles className="w-5 h-5 text-accent mr-3 mt-0.5 flex-shrink-0" />
                        <span className="text-gray-700">{question}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Show message if not ready and not indexing */}
              {!ragStatus.isReady && !isIndexing && (
                <div className="text-center">
                  <p className="text-gray-500 mb-4">Sistema não inicializado</p>
                  <button
                    onClick={initializeRAG}
                    className="px-6 py-2 bg-accent text-white rounded-lg hover:bg-primary-500 transition-colors"
                  >
                    Inicializar Sistema
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Loading State - Show when indexing */}
        {isIndexing && chat.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full px-4">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-accent to-primary-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <Database className="w-8 h-8 text-white animate-pulse" />
              </div>
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                {t('cellito.initializing')}
              </h2>
              <p className="text-gray-600 mb-6">
                {ragStatus.fromCache
                  ? "Carregando do cache..."
                  : t('cellito.gettingReady')
                }
              </p>
              <div className="flex items-center justify-center space-x-2">
                <Loader className="w-5 h-5 text-accent animate-spin" />
                <span className="text-accent">
                  {ragStatus.fromCache
                    ? "Carregando cache..."
                    : t('cellito.loadingDocuments')
                  }
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Chat Messages */}
        {chat.length > 0 && (
          <div className="h-full overflow-y-auto">
            <div className="max-w-3xl mx-auto px-4 py-8">
              <div className="space-y-6">
                {chat.map((msg, i) => (
                  <div key={i} className="group">
                    <div className={`flex items-start space-x-4 ${
                      msg.role === "user" ? "flex-row-reverse space-x-reverse" : ""
                    }`}>
                      {/* Avatar */}
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                        msg.role === "user"
                          ? "bg-accent"
                          : "bg-gradient-to-br from-accent to-primary-500"
                      }`}>
                        {msg.role === "user" ? (
                          <FallBackAvatar
                            src={profilePhoto}
                            alt={getInitials(userProfile?.displayName)}
                            className={'h-10 w-10 text-2xl bg-transparent '}
                          />
                        ) : (
                          <MessageCircle className="w-4 h-4 text-white" />
                        )}
                      </div>

                      {/* Message Content */}
                      <div className={`flex-1 max-w-none ${
                        msg.role === "user" ? "text-right" : ""
                      }`}>
                        <div className={`inline-block px-4 py-3 rounded-2xl ${
                          msg.role === "user"
                            ? "bg-accent text-white"
                            : "bg-gray-100 text-gray-900"
                        }`}>
                          <div className="whitespace-pre-wrap break-words">
                            {msg.content}
                          </div>
                        </div>

                        {/* Source indicator */}
                        {msg.role === "assistant" && msg.metadata && msg.metadata.hasRelevantDocs && (
                          <div className="mt-2 text-xs text-gray-500 flex items-center">
                            <FileText className="w-3 h-3 mr-1" />
                            <span>{t('cellito.baseonknowledge')}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {/* Loading indicator */}
                {loading && (
                  <div className="group">
                    <div className="flex items-start space-x-4">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent to-primary-500 flex items-center justify-center flex-shrink-0">
                        <MessageCircle className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex-1">
                        <div className="inline-block px-4 py-3 rounded-2xl bg-gray-100">
                          <div className="flex items-center space-x-2">
                            <div className="flex space-x-1">
                              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                            </div>
                            <span className="text-sm text-gray-600">{t('cellito.thinking')}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Fixed Input Area */}
      <div className=" mb-20 bg-white">
        <div className="max-w-3xl mx-auto px-4 py-4">
          {/* Error Display */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
              {error}
            </div>
          )}

          {/* Input Box */}
          <div className="relative">
            <div className="flex items-end space-x-3">
              <div className="flex-1 relative">
                <textarea
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 pr-12 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent resize-none max-h-32"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey && !loading) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder={
                    isIndexing
                      ? "Aguarde a inicialização..."
                      : !ragStatus.isReady
                        ? "Sistema não inicializado..."
                        : chat.length === 0
                          ? t('cellito.askQuestionPlaceholder')
                          : t('cellito.askQuestionPlaceholder')
                  }
                  rows="1"
                  disabled={loading || isIndexing || !ragStatus.isReady}
                  style={{
                    minHeight: '52px'
                  }}
                  onInput={(e) => {
                    e.target.style.height = 'auto';
                    e.target.style.height = Math.min(e.target.scrollHeight, 128) + 'px';
                  }}
                />

                {/* Send Button Inside Input */}
                <button
                  className="absolute right-2 bottom-2 w-8 h-8 bg-accent text-white rounded-lg hover:bg-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                  onClick={() => handleSend()}
                  disabled={loading || !input.trim() || isIndexing || !ragStatus.isReady}
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Footer Text */}
            <p className="text-xs text-gray-500 mt-2 text-center">
              {t('cellito.footertext')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cellito;
