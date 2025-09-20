import { useSharePoint } from '@/hooks/useSharePoint';
import React, { useEffect, useState, useCallback } from 'react';
import { Send, MessageCircle, Database, FileText, Loader, Sparkles, Globe, Building2, ChevronDown , ThumbsDown,ThumbsUp} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
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
    initializeRAGWithArticles,
    rebuildArticlesCache,
    getCacheFileFromArticles,
    handleChatWithWebSupport,
    initializeRAGWithFeedbackBoost, // New: uses feedback first
    upsertHighQualityQnA,           // New: save good answers
    isIndexing,
    processedDocs,
    ragStatus,
    addHighQualityQnA
  } = useSharePoint();

  const { getMyProfilePhoto, profilePhoto } = useGraph();
  const { userProfile } = useAuth();

  const [chat, setChat] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [feedbackGiven, setFeedbackGiven] = useState({}); // Tracks which messages were rated

  // New state for search mode
  const [searchMode, setSearchMode] = useState('hybrid'); // 'hybrid', 'internal'
  const [showDropdown, setShowDropdown] = useState(false);

  const searchModes = {
    hybrid: {
      label: t('cellito.search_hybrid'),
      icon: <Sparkles className="w-4 h-4" />,
      description: t('cellito.search_hybrid_description')
    },
    internal: {
      label: t('cellito.search_internal') ,
      icon: <Building2 className="w-4 h-4" />,
      description: t('cellito.search_internal_description')
    }
  };

  useEffect(() => {
    getMyProfilePhoto();
  }, [getMyProfilePhoto]);

  // Initialize RAG on load
  const initializeRAG = useCallback(async () => {
    if (!sp?.web || isIndexing || ragStatus.isReady) return;
    try {
      setError('');
      console.log('🚀 Initializing Articles RAG system...');
      const result = await initializeRAGWithArticles();
      if (!result.success) setError(`Falha ao inicializar sistema RAG: ${result.error}`);
      else console.log('✅ RAG system initialized');
    } catch (err) {
      console.error('❌ Initialization failed:', err);
      setError(`Erro: ${err.message}`);
    }
  }, [sp, initializeRAGWithArticles, isIndexing, ragStatus.isReady]);

  // Auto-initialize RAG
  useEffect(() => {
    if (sp?.web && !isIndexing && !ragStatus.isReady) {
      initializeRAG();
    }
  }, [sp, initializeRAG, isIndexing, ragStatus.isReady]);

  // Handle sending message with search mode consideration
  const handleSend = async (message = input) => {
    if (!message.trim() || loading) return;

    const userMessage = { role: 'user', content: message };
    const updatedChat = [...chat, userMessage];
    setChat(updatedChat);
    setInput('');
    setLoading(true);
    setError('');

    try {
      const chatHistory = updatedChat
        .filter((msg) => msg.role !== 'system')
        .slice(-10)
        .map((msg) => ({ role: msg.role, content: msg.content }));

      let result;

      if (searchMode === 'internal') {
        // Internal-only search using askRAGQuestion
        result = await askRAGQuestion(message, processedDocs, chatHistory);
        // Ensure we don't have web sources for internal-only mode
        result.hasWebResults = false;
        result.webSources = [];
      } else {
        // Hybrid search using feedback-first retrieval
        result = await initializeRAGWithFeedbackBoost(message, processedDocs, chatHistory);
      }

      let responseContent = result.content;

      // Add internal sources
      if (result.sources?.length > 0) {
        const uniqueSources = [...new Set(result.sources.map((s) => s.title || s.fileName))];
        responseContent += '\n\n📚 **Fontes consultadas:**\n';
        uniqueSources.forEach((source, idx) => {
          responseContent += `${idx + 1}. ${source}\n`;
        });
      }

      // Add web sources (only if hybrid mode)
      if (searchMode === 'hybrid' && result.webSources?.length > 0) {
        responseContent += '\n\n🌐 **Fontes web consultadas:**\n';
        result.webSources.forEach((web, idx) => {
          responseContent += `${idx + 1}. ${web.title} (${web.source})\n`;
        });
      }

      const assistantMessage = {
        role: 'assistant',
        content: responseContent,
        metadata: {
          hasRelevantDocs: result.hasRelevantDocs,
          hasWebResults: searchMode === 'hybrid' ? result.hasWebResults : false,
          confidence: result.confidence,
          searchStrategy: result.searchStrategy,
          fromFeedback: result.source === 'feedback-cache',
          searchMode: searchMode, // Track which mode was used
        },
      };

      setChat([...updatedChat, assistantMessage]);

    } catch (err) {
      console.error('❌ Error:', err);
      setChat([
        ...updatedChat,
        {
          role: 'assistant',
          content: 'Peço desculpas, estou enfrentando dificuldades técnicas. Tente novamente em instantes.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Simple keyword extractor
  const extractKeywords = (text) => {
    const stopWords = new Set([
      'o', 'a', 'e', 'de', 'do', 'da', 'em', 'para', 'com', 'sem', 'por', 'que', 'não',
      'os', 'as', 'um', 'uma', 'uns', 'umas', 'se', 'ao', 'dos', 'nas', 'no', 'nas',
      'the', 'and', 'or', 'but', 'if', 'that', 'of', 'in', 'on', 'at', 'by', 'for', 'with'
    ]);
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 3 && !stopWords.has(word))
      .filter((value, idx, self) => self.indexOf(value) === idx)
      .slice(0, 5);
  };

  // Handle feedback (thumbs up/down)
  const handleFeedback = useCallback(
    async (index, rating) => {
      const message = chat[index];
      if (message.role !== 'assistant' || feedbackGiven[index]) return;

      setFeedbackGiven((prev) => ({ ...prev, [index]: rating }));

      const userMessage = chat[index - 1]?.content || 'N/A';
      const assistantMessage = message.content;

      if (rating === 5) {
        try {
          await addHighQualityQnA(
            userMessage,
            assistantMessage,
            message.metadata?.hasWebResults ? 'hybrid' : 'internal',
            extractKeywords(userMessage),
            90
          );
          console.log('⭐ High-quality Q&A saved!');
        } catch (err) {
          console.error('❌ Failed to save Q&A:', err);
        }
      }

      if (rating === 1) {
        console.log('⚠️ Negative feedback:', userMessage);
      }
    },
    [chat, feedbackGiven, addHighQualityQnA, extractKeywords]
  );

  // Sample questions
  const sampleQuestions = [
    t('cellito.socializa_pack'),
    t('cellito.weekend_bundles'),
    t('cellito.konektas_devices'),
    t('cellito.konekta_plans')
  ];

  return (
    <div className="flex flex-col h-[90vh] mt-10 bg-white">
      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        {/* Empty State */}
        {chat.length === 0 && !isIndexing && (
          <div className="flex flex-col items-center justify-center h-full px-4">
            <div className="text-center max-w-2xl">
              <div className="w-16 h-16 bg-gradient-to-br from-accent to-primary-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <MessageCircle className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-4xl font-bold text-gray-900 mb-4">
                {t('cellito.greetings')} {t('cellito.welcomeMessage')}
              </h1>
              <p className="text-xl text-gray-600 mb-8">{t('cellito.description')}</p>

              {ragStatus.isReady && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-2xl mx-auto">
                  {sampleQuestions.map((q, i) => (
                    <button
                      key={i}
                      onClick={() => handleSend(q)}
                      disabled={loading}
                      className="p-4 text-left bg-gray-50 hover:bg-gray-100 rounded-xl border border-gray-200 transition"
                    >
                      <div className="flex items-start">
                        <Sparkles className="w-5 h-5 text-accent mr-3 mt-0.5" />
                        <span className="text-gray-700">{q}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {!ragStatus.isReady && !isIndexing && (
                <div>
                  <p className="text-gray-500 mb-4">Sistema não inicializado</p>
                  <button
                    onClick={initializeRAG}
                    className="px-6 py-2 bg-accent text-white rounded-lg hover:bg-primary-500 transition"
                  >
                    Inicializar Sistema
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Indexing State */}
        {isIndexing && chat.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-accent to-primary-500 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
                <Database className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-semibold text-gray-900">Inicializando...</h2>
              <p className="text-gray-600">Carregando base de conhecimento</p>
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
                    <div
                      className={`flex items-start space-x-4 ${msg.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''
                        }`}
                    >
                      {/* Avatar */}
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === 'user'
                            ? 'bg-accent'
                            : 'bg-gradient-to-br from-accent to-primary-500'
                          }`}
                      >
                        {msg.role === 'user' ? (
                          <FallBackAvatar
                            src={profilePhoto}
                            alt={getInitials(userProfile?.displayName)}
                            className="h-10 w-10 text-2xl bg-transparent"
                          />
                        ) : (
                          <MessageCircle className="w-4 h-4 text-white" />
                        )}
                      </div>

                      {/* Message */}
                      <div
                        className={`flex-1 max-w-none ${msg.role === 'user' ? 'text-right' : ''
                          }`}
                      >
                        <div
                          className={`inline-block px-4 py-3 rounded-2xl ${msg.role === 'user'
                              ? 'bg-accent text-white'
                              : 'bg-gray-100 text-gray-900'
                            }`}
                        >
                          {msg.role === 'user' ? (
                            <div className="whitespace-pre-wrap break-words">
                              {msg.content}
                            </div>
                          ) : (
                            <div className="prose prose-sm max-w-none prose-gray">
                              <ReactMarkdown
                                remarkPlugins={[remarkGfm]}
                                rehypePlugins={[rehypeRaw]}
                                components={{
                                  p: ({ children }) => <p className="m-0 text-gray-900">{children}</p>,
                                  strong: ({ children }) => <strong className="font-semibold text-gray-900">{children}</strong>,
                                  table: ({ children }) => <table className="w-full border-collapse my-4">{children}</table>,
                                  th: ({ children }) => <th className="px-3 py-2 font-semibold bg-gray-100 text-gray-900">{children}</th>,
                                  td: ({ children }) => <td className="px-3 py-2 text-gray-900">{children}</td>,
                                }}
                              >
                                {msg.content}
                              </ReactMarkdown>
                            </div>
                          )}
                        </div>

                        {/* Metadata */}
                        {msg.role === 'assistant' && msg.metadata && (
                          <div className="mt-2 text-xs text-gray-500 flex items-center flex-wrap gap-2">
                            {msg.metadata.hasRelevantDocs && (
                              <span className="flex items-center gap-1 bg-accent-50 px-2 py-1 rounded text-xs">
                                <FileText className="w-3 h-3" />
                                {t("cellito.source_internal")}
                              </span>
                            )}
                            {msg.metadata.hasWebResults && (
                              <span className="flex items-center gap-1 bg-purple-50 px-2 py-1 rounded text-xs">
                                <Globe className="w-3 h-3" />
                                {t("cellito.source_web")}
                              </span>
                            )}
                            {msg.metadata.searchMode && (
                              <span className="flex items-center gap-1 bg-gray-50 px-2 py-1 rounded text-xs">
                                {searchModes[msg.metadata.searchMode]?.icon}
                                {msg.metadata.searchMode === 'hybrid' ? t("cellito.search_hybrid") : t("cellito.search_internal")}
                              </span>
                            )}
                            {msg.metadata.confidence && (
                              <span className="bg-gray-100 px-2 py-1 rounded text-xs">
                                {Math.round(msg.metadata.confidence)} {t("cellito.confidence_percentage")}
                              </span>
                            )}
                          </div>
                        )}

                        {/* Feedback Buttons */}
                        {msg.role === 'assistant' && !feedbackGiven[i] && (
                          <div className="mt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center space-x-3">
                            <button
                              onClick={() => handleFeedback(i, 5)}
                              className="text-green-500 hover:text-green-700 text-sm flex items-center gap-1"
                              disabled={loading}
                            >
                             <ThumbsUp className="w-4 h-4 text-accent"/>
                            </button>
                            <button
                              onClick={() => handleFeedback(i, 1)}
                              className="text-red-500 hover:text-red-700 text-sm flex items-center gap-1"
                              disabled={loading}
                            >
                              <ThumbsDown className="w-4 h-4 text-accent"/>
                            </button>
                          </div>
                        )}

                        {feedbackGiven[i] && (
                          <div className="mt-2 text-xs text-gray-500">
                           {t("cellito.thanks_feedback")}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {/* Typing Indicator */}
                {loading && (
                  <div className="group">
                    <div className="flex items-start space-x-4">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent to-primary-500 flex items-center justify-center">
                        <MessageCircle className="w-4 h-4 text-white" />
                      </div>
                      <div className="inline-block px-4 py-3 rounded-2xl bg-gray-100">
                        <div className="flex items-center space-x-2">
                          <div className="flex space-x-1">
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                          </div>
                          <span className="text-sm text-gray-600">{t('cellito.thinking')}</span>
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

      {/* Input Area */}
      <div className="mb-20 bg-white">
        <div className="max-w-3xl mx-auto px-4 py-4">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="space-y-3">
            {/* Main Input Row */}
            <div className="flex items-top gap-3">
              {/* Text Input Container */}
              <div className="flex-1 relative">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey && !loading) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder={
                    isIndexing
                      ? t('cellito.initializing')
                      : !ragStatus.isReady
                        ? 'Sistema não inicializado...'
                        : searchMode === 'internal'
                          ? t('cellito.askQuestionPlaceholder')
                          : t('cellito.askQuestionPlaceholder')
                  }
                  rows="1"
                  disabled={loading || isIndexing || !ragStatus.isReady}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 pr-12 focus:outline-none focus:ring-2 focus:ring-accent resize-none max-h-32"
                  style={{ minHeight: '52px' }}
                  onInput={(e) => {
                    e.target.style.height = 'auto';
                    e.target.style.height = Math.min(e.target.scrollHeight, 128) + 'px';
                  }}
                />
                {/* Send Button - Positioned inside textarea */}
                <button
                  onClick={() => handleSend()}
                  disabled={loading || !input.trim() || isIndexing || !ragStatus.isReady}
                  className="absolute right-3 bottom-3 w-8 h-8 bg-accent text-white rounded-lg hover:bg-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center"
                  type="button"
                >
                  {loading ? (
                    <Loader className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </button>
              </div>

              {/* Search Mode Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowDropdown(!showDropdown)}
                  className="flex items-center gap-2 px-3 py-3 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors h-[52px]"
                  disabled={loading || isIndexing}
                  type="button"
                >
                  {searchModes[searchMode].icon}
                  <span className="text-sm font-medium text-gray-700 hidden sm:block">
                    {searchMode === 'hybrid' ?  t('cellito.search_hybrid') : t('cellito.search_internal')}
                  </span>
                  <ChevronDown className="w-4 h-4 text-gray-500" />
                </button>

                {/* Dropdown Menu */}
                {showDropdown && (
                  <div className="absolute bottom-full mb-2 left-0 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-[280px]">
                    {Object.entries(searchModes).map(([key, mode]) => (
                      <button
                        key={key}
                        onClick={() => {
                          setSearchMode(key);
                          setShowDropdown(false);
                        }}
                        className={`w-full px-4 py-3 text-left hover:bg-gray-50 flex items-start gap-3 transition-colors ${
                          key === searchMode ? 'bg-accent-50 border-l-4 border-l-accent-500' : ''
                        } ${
                          key === Object.keys(searchModes)[0] ? 'rounded-t-lg' : ''
                        } ${
                          key === Object.keys(searchModes)[Object.keys(searchModes).length - 1] ? 'rounded-b-lg' : ''
                        }`}
                        type="button"
                      >
                        <div className="mt-0.5">
                          {mode.icon}
                        </div>
                        <div>
                          <div className={`font-medium text-sm ${
                            key === searchMode ? 'text-accent-700' : 'text-gray-900'
                          }`}>
                            {mode.label}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {mode.description}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Footer Text */}
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-500">
                {searchMode === 'internal'
                  ? t('cellito.search_internal_description')
                  : t('cellito.search_hybrid_description')
                }
              </p>
              {/* <p className="text-xs text-gray-500">
                {t('cellito.footertext')}
              </p> */}
            </div>
          </div>
        </div>
      </div>

      {/* Click outside to close dropdown */}
      {showDropdown && (
        <div
          className="fixed inset-0 z-5"
          onClick={() => setShowDropdown(false)}
        />
      )}
    </div>
  );
};

export default Cellito;
