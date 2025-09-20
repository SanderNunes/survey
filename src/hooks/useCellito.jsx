// src/contexts/useRAGContext.js
import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useSharePoint } from '@/hooks/useSharePoint';

const RAGContext = createContext();

export const useRAGContext = () => {
  const context = useContext(RAGContext);
  if (!context) {
    throw new Error('useRAGContext must be used within a RAGProvider');
  }
  return context;
};

export const RAGProvider = ({ children }) => {
  // Core RAG State
  const [isInitialized, setIsInitialized] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedArticles, setProcessedArticles] = useState([]);
  const [ragStatus, setRagStatus] = useState({
    totalArticles: 0,
    totalChunks: 0,
    isReady: false,
    fromCache: false,
    lastUpdated: null,
    error: null
  });

  // Search State
  const [searchHistory, setSearchHistory] = useState([]);
  const [lastSearchResult, setLastSearchResult] = useState(null);

  // Feedback State
  const [feedbackHistory, setFeedbackHistory] = useState([]);

  // Get SharePoint context
  const { sp, getContentFromList } = useSharePoint();

  // ============================================================================
  // CORE TEXT PROCESSING FUNCTIONS
  // ============================================================================

  const stripHtmlTags = useCallback((html) => {
    if (!html || typeof html !== 'string') return '';
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    const textContent = tempDiv.textContent || tempDiv.innerText || '';
    return textContent
      .replace(/\s+/g, ' ')
      .replace(/\n\s*\n/g, '\n')
      .trim();
  }, []);

  const extractTextFromContent = useCallback((articleContent) => {
    if (!articleContent || typeof articleContent !== 'string') return '';

    try {
      const parsed = JSON.parse(articleContent);

      if (typeof parsed === 'object' && parsed !== null) {
        let extractedText = '';

        if (parsed.title || parsed.header || parsed.heading) {
          const titleText = stripHtmlTags(parsed.title || parsed.header || parsed.heading);
          extractedText += titleText + '\n\n';
        }

        if (parsed.content) {
          extractedText += stripHtmlTags(extractContentText(parsed.content));
        } else if (parsed.body) {
          extractedText += stripHtmlTags(extractContentText(parsed.body));
        } else if (parsed.text) {
          extractedText += stripHtmlTags(parsed.text);
        }

        return extractedText.trim();
      }

      return stripHtmlTags(String(parsed)).trim();
    } catch (parseError) {
      return stripHtmlTags(articleContent).trim();
    }
  }, [stripHtmlTags]);

  const extractContentText = useCallback((content) => {
    if (!content) return '';

    if (typeof content === 'string') {
      return stripHtmlTags(content);
    }

    if (Array.isArray(content)) {
      return content.map(item => extractContentText(item)).join('\n');
    }

    if (typeof content === 'object') {
      let text = '';
      const textFields = ['text', 'content', 'value', 'innerHTML', 'innerText'];

      for (const field of textFields) {
        if (content[field]) {
          text += stripHtmlTags(extractContentText(content[field])) + '\n';
        }
      }

      if (!text.trim()) {
        Object.values(content).forEach(value => {
          if (typeof value === 'string' && value.trim()) {
            text += stripHtmlTags(value) + '\n';
          } else if (typeof value === 'object') {
            text += extractContentText(value) + '\n';
          }
        });
      }

      return text;
    }

    return '';
  }, [stripHtmlTags]);

  // ============================================================================
  // CHUNKING FUNCTIONS
  // ============================================================================

  const createTextChunks = useCallback((text, options = {}) => {
    const {
      chunkSize = 800,
      overlap = 150,
      minChunkSize = 100,
      maxChunkSize = 1200,
      strategy = 'smart'
    } = options;

    if (!text || typeof text !== 'string' || text.length === 0) {
      return [];
    }

    // Prevent infinite loops with very long texts
    if (text.length > 100000) {
      console.warn(`⚠️ Text too long (${text.length} chars), truncating to 100KB`);
      text = text.substring(0, 100000);
    }

    console.log(`🔧 Creating chunks: ${chunkSize} chars, strategy: ${strategy}`);

    try {
      return createSmartChunks(text, chunkSize, overlap, minChunkSize, maxChunkSize);
    } catch (error) {
      console.error('❌ Error in chunking, using fallback:', error);
      return createFallbackChunks(text, chunkSize);
    }
  }, []);

  const createSmartChunks = useCallback((text, chunkSize, overlap, minChunkSize, maxChunkSize) => {
    const chunks = [];
    const sentences = text.split(/(?<=[.!?।])\s+/).filter(s => s.trim().length > 10);

    if (sentences.length === 0) return [];

    let currentChunk = '';
    let currentSentences = [];
    let chunkCount = 0;

    for (let i = 0; i < sentences.length; i++) {
      // Prevent infinite loops
      if (chunkCount > 1000) {
        console.warn('⚠️ Maximum chunk limit reached (1000), stopping');
        break;
      }

      const sentence = sentences[i].trim();
      const testChunk = currentChunk + (currentChunk ? ' ' : '') + sentence;

      if (testChunk.length > chunkSize && currentChunk.length >= minChunkSize) {
        chunks.push(createChunkMetadata(currentChunk.trim(), currentSentences, i));
        chunkCount++;

        // Handle overlap
        const overlapSentences = Math.min(2, Math.floor(currentSentences.length * 0.3));
        if (overlapSentences > 0) {
          const overlapText = currentSentences.slice(-overlapSentences).join(' ');
          currentChunk = overlapText + ' ' + sentence;
          currentSentences = currentSentences.slice(-overlapSentences).concat([sentence]);
        } else {
          currentChunk = sentence;
          currentSentences = [sentence];
        }
      } else {
        currentChunk = testChunk;
        currentSentences.push(sentence);
      }

      if (currentChunk.length > maxChunkSize) {
        chunks.push(createChunkMetadata(currentChunk.trim(), currentSentences, i));
        chunkCount++;
        currentChunk = sentence;
        currentSentences = [sentence];
      }
    }

    if (currentChunk.trim().length >= minChunkSize) {
      chunks.push(createChunkMetadata(currentChunk.trim(), currentSentences, sentences.length));
    }

    return chunks;
  }, []);

  const createFallbackChunks = useCallback((text, chunkSize) => {
    console.log('🔄 Using fallback chunking...');

    const chunks = [];
    const words = text.split(/\s+/);
    const wordsPerChunk = Math.floor(chunkSize / 6);

    for (let i = 0; i < words.length; i += wordsPerChunk) {
      const chunkWords = words.slice(i, i + wordsPerChunk);
      const chunkText = chunkWords.join(' ');

      if (chunkText.length > 50) {
        chunks.push({
          text: chunkText.trim(),
          size: chunkText.length,
          elementCount: chunkWords.length,
          type: 'fallback',
          startIndex: i,
          completeness: 50,
          readability: 50
        });
      }

      if (chunks.length > 500) {
        console.warn('⚠️ Fallback chunk limit reached');
        break;
      }
    }

    return chunks;
  }, []);

  const createChunkMetadata = useCallback((text, elements, index) => {
    return {
      text: text.trim(),
      size: text.length,
      elementCount: elements.length,
      type: 'smart',
      startIndex: index,
      startsWithCapital: /^[A-Z]/.test(text.trim()),
      endsWithPunctuation: /[.!?]$/.test(text.trim()),
      hasQuestions: /\?/.test(text),
      wordCount: text.split(/\s+/).length,
      completeness: calculateCompleteness(text),
      readability: calculateReadability(text)
    };
  }, []);

  const calculateCompleteness = useCallback((text) => {
    let score = 0;
    if (text.match(/[.!?]$/)) score += 30;
    if (text.length >= 200 && text.length <= 800) score += 25;

    const words = text.toLowerCase().split(/\s+/);
    const wordFreq = {};
    words.forEach(word => {
      if (word.length > 3) {
        wordFreq[word] = (wordFreq[word] || 0) + 1;
      }
    });

    const repeatedWords = Object.values(wordFreq).filter(freq => freq > 1).length;
    if (repeatedWords > 2) score += 25;

    return Math.min(100, score);
  }, []);

  const calculateReadability = useCallback((text) => {
    const sentences = text.split(/[.!?]/).length - 1;
    const words = text.split(/\s+/).length;
    const avgWordsPerSentence = sentences > 0 ? words / sentences : words;

    let score = 100;
    if (avgWordsPerSentence > 20) score -= 20;
    if (avgWordsPerSentence > 30) score -= 30;
    if (avgWordsPerSentence >= 10 && avgWordsPerSentence <= 20) score += 20;

    return Math.max(0, Math.min(100, score));
  }, []);

  // ============================================================================
  // ARTICLE PROCESSING FUNCTIONS
  // ============================================================================

  const loadArticlesFromSharePoint = useCallback(async (listName = "ArticlesList") => {
    try {
      console.log(`📋 Loading articles from list: ${listName}`);

      if (!sp?.web) {
        throw new Error('SharePoint context not initialized');
      }

      const items = await getContentFromList(listName, {
        additionalFields: ['ArticleSlug', 'Category', 'Summary', 'Tags'],
        filter: "ArticleStatus eq 'Published'", // Only published articles
        top: 1000
      });

      console.log(`📊 Retrieved ${items.length} articles from SharePoint`);
      return items;

    } catch (error) {
      console.error('❌ Error loading articles:', error);
      throw error;
    }
  }, [sp, getContentFromList]);

  const processArticlesForRAG = useCallback(async (articles, chunkingOptions = {}) => {
    console.log(`🔄 Processing ${articles.length} articles for RAG...`);

    setIsProcessing(true);
    const processedDocs = [];
    const errors = [];

    try {
      for (let index = 0; index < articles.length; index++) {
        const article = articles[index];

        try {
          console.log(`📄 Processing ${index + 1}/${articles.length}: ${article.fileName}`);

          if (!article.text || article.text.length < 50) {
            console.log(`⏭️ Skipping ${article.fileName}: insufficient content`);
            errors.push({ index: index + 1, error: 'Insufficient content', article: article.fileName });
            continue;
          }

          // Process with timeout
          const chunks = await Promise.race([
            createTextChunks(article.text, chunkingOptions),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error('Processing timeout')), 30000)
            )
          ]);

          if (!chunks || chunks.length === 0) {
            console.log(`⚠️ No chunks created for ${article.fileName}`);
            errors.push({ index: index + 1, error: 'No chunks created', article: article.fileName });
            continue;
          }

          const validChunks = chunks.filter(chunk =>
            chunk?.text && chunk.text.trim().length > 0
          );

          if (validChunks.length === 0) {
            console.log(`⚠️ No valid chunks for ${article.fileName}`);
            errors.push({ index: index + 1, error: 'No valid chunks', article: article.fileName });
            continue;
          }

          // Create keywords
          const keywords = extractKeywords(article.text);

          const processedDoc = {
            ...article,
            chunks: validChunks,
            totalChunks: validChunks.length,
            keywords,
            originalTextLength: article.text.length,
            averageChunkSize: Math.round(validChunks.reduce((sum, c) => sum + c.size, 0) / validChunks.length),
            qualityScore: Math.round(validChunks.reduce((sum, c) => sum + (c.completeness || 0), 0) / validChunks.length),
            processedAt: new Date().toISOString()
          };

          processedDocs.push(processedDoc);
          console.log(`✅ ${article.fileName}: ${validChunks.length} chunks created`);

        } catch (articleError) {
          console.error(`❌ Error processing ${article.fileName}:`, articleError);
          errors.push({
            index: index + 1,
            error: articleError.message,
            article: article.fileName,
            isLast: index === articles.length - 1
          });
          continue;
        }

        // Brief pause every 10 articles
        if (index > 0 && index % 10 === 0) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      console.log(`✅ Processing complete: ${processedDocs.length}/${articles.length} articles processed`);

      if (errors.length > 0) {
        console.log('📋 Processing errors:', errors);

        // Check if last article failed
        const lastArticleError = errors.find(e => e.isLast);
        if (lastArticleError) {
          console.error('🚨 Last article failed - this was likely the stuck point:', lastArticleError);
        }
      }

      return { processedDocs, errors };

    } finally {
      setIsProcessing(false);
    }
  }, [createTextChunks]);

  // ============================================================================
  // KEYWORD EXTRACTION
  // ============================================================================

  const extractKeywords = useCallback((text) => {
    if (!text) return {};

    const stopWords = new Set([
      // Portuguese
      'o', 'a', 'os', 'as', 'um', 'uma', 'e', 'ou', 'mas', 'se', 'que', 'de', 'da', 'do',
      'em', 'no', 'na', 'por', 'para', 'com', 'ser', 'ter', 'estar', 'isso', 'ele', 'ela',
      // English
      'the', 'and', 'or', 'but', 'if', 'that', 'of', 'in', 'on', 'at', 'by', 'for', 'with',
      'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'this', 'that', 'i', 'you'
    ]);

    const processedText = text
      .toLowerCase()
      .replace(/[^\w\sàáâãäåçèéêëìíîïñòóôõöùúûüý]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const words = processedText
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.has(word))
      .filter(word => !/^\d+$/.test(word));

    const wordFreq = {};
    words.forEach(word => {
      wordFreq[word] = (wordFreq[word] || 0) + 1;
    });

    // Extract phrases
    const phrases = [];
    for (let i = 0; i < words.length - 1; i++) {
      const phrase2 = words[i] + ' ' + words[i + 1];
      phrases.push(phrase2);

      if (i < words.length - 2) {
        const phrase3 = words[i] + ' ' + words[i + 1] + ' ' + words[i + 2];
        phrases.push(phrase3);
      }
    }

    const phraseFreq = {};
    phrases.forEach(phrase => {
      phraseFreq[phrase] = (phraseFreq[phrase] || 0) + 1;
    });

    const allKeywords = {};

    Object.entries(wordFreq).forEach(([word, freq]) => {
      if (freq > 1) {
        allKeywords[word] = freq;
      }
    });

    Object.entries(phraseFreq).forEach(([phrase, freq]) => {
      if (freq > 1) {
        allKeywords[phrase] = freq * 2;
      }
    });

    return Object.entries(allKeywords)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 20)
      .reduce((acc, [keyword, freq]) => {
        acc[keyword] = freq;
        return acc;
      }, {});
  }, []);

  // ============================================================================
  // SEARCH FUNCTIONS
  // ============================================================================

  const calculateSimilarity = useCallback((query, chunk, doc) => {
    const queryLower = query.toLowerCase();
    const chunkTextLower = chunk.text.toLowerCase();

    let score = 0;

    // Exact phrase matching
    if (chunkTextLower.includes(queryLower)) {
      score += 100;
    }

    // Word matching
    const queryWords = queryLower.split(/\s+/).filter(word => word.length > 2);
    const chunkWords = chunkTextLower.split(/\s+/);

    queryWords.forEach(queryWord => {
      const exactMatches = chunkWords.filter(word => word === queryWord).length;
      score += exactMatches * 15;

      const partialMatches = chunkWords.filter(word =>
        word.includes(queryWord) || queryWord.includes(word)
      ).length;
      score += partialMatches * 8;
    });

    // Keyword matching
    if (doc.keywords) {
      queryWords.forEach(queryWord => {
        if (doc.keywords[queryWord]) {
          score += doc.keywords[queryWord] * 10;
        }

        Object.keys(doc.keywords).forEach(keyword => {
          if (keyword.includes(queryWord) || queryWord.includes(keyword)) {
            score += doc.keywords[keyword] * 5;
          }
        });
      });
    }

    // Quality bonuses
    if (chunk.startsWithCapital) score += 2;
    if (chunk.endsWithPunctuation) score += 2;

    return Math.round(score);
  }, []);

  const findRelevantChunks = useCallback((query, maxChunks = 5) => {
    if (!processedArticles || processedArticles.length === 0) {
      return [];
    }

    console.log(`🔍 Searching ${processedArticles.length} articles for: "${query}"`);

    const relevantChunks = [];
    let totalChunksSearched = 0;

    processedArticles.forEach((doc, docIndex) => {
      doc.chunks.forEach((chunk, chunkIndex) => {
        totalChunksSearched++;

        const score = calculateSimilarity(query, chunk, doc);

        if (score > 0) {
          relevantChunks.push({
            chunk,
            score,
            document: {
              fileName: doc.fileName,
              articleSlug: doc.articleSlug,
              category: doc.category,
              totalChunks: doc.totalChunks
            },
            chunkIndex,
            docIndex
          });
        }
      });
    });

    const sortedChunks = relevantChunks
      .sort((a, b) => b.score - a.score)
      .filter(item => item.score >= 5)
      .slice(0, maxChunks);

    console.log(`📊 Found ${sortedChunks.length}/${totalChunksSearched} relevant chunks`);

    return sortedChunks;
  }, [processedArticles, calculateSimilarity]);

  const createContextForQuery = useCallback((relevantChunks, query) => {
    if (!relevantChunks || relevantChunks.length === 0) {
      return "Nenhum artigo relevante encontrado para esta consulta.";
    }

    let context = `CONTEXTO RELEVANTE PARA: "${query}"\n\n`;

    const chunksByDoc = {};
    relevantChunks.forEach(item => {
      const docName = item.document.fileName;
      if (!chunksByDoc[docName]) {
        chunksByDoc[docName] = [];
      }
      chunksByDoc[docName].push(item);
    });

    Object.entries(chunksByDoc).forEach(([docName, chunks]) => {
      context += `📄 ARTIGO: ${docName}\n`;
      chunks.forEach((item) => {
        context += `\n[Seção ${item.chunkIndex + 1}/${item.document.totalChunks} - Relevância: ${item.score}]\n`;
        context += `${item.chunk.text}\n`;
      });
      context += `\n${'─'.repeat(50)}\n\n`;
    });

    return context;
  }, []);

  // ============================================================================
  // MAIN SEARCH FUNCTION
  // ============================================================================

  const searchArticles = useCallback(async (query, options = {}) => {
    const { maxChunks = 5, saveToHistory = true } = options;

    try {
      console.log(`🔍 Searching articles for: "${query}"`);

      if (!processedArticles || processedArticles.length === 0) {
        return {
          success: false,
          message: "Nenhum artigo carregado. Execute a inicialização primeiro.",
          results: []
        };
      }

      const relevantChunks = findRelevantChunks(query, maxChunks);

      if (relevantChunks.length === 0) {
        const result = {
          success: false,
          message: "Nenhuma informação relevante encontrada nos artigos.",
          query,
          results: [],
          searchedArticles: processedArticles.length,
          timestamp: new Date().toISOString()
        };

        if (saveToHistory) {
          setSearchHistory(prev => [result, ...prev.slice(0, 49)]);
        }

        return result;
      }

      const context = createContextForQuery(relevantChunks, query);
      const relevantArticles = [...new Set(relevantChunks.map(c => c.document.fileName))];

      const result = {
        success: true,
        query,
        context,
        relevantChunks,
        relevantArticles,
        totalChunksFound: relevantChunks.length,
        searchedArticles: processedArticles.length,
        avgScore: Math.round(relevantChunks.reduce((sum, c) => sum + c.score, 0) / relevantChunks.length),
        timestamp: new Date().toISOString()
      };

      setLastSearchResult(result);

      if (saveToHistory) {
        setSearchHistory(prev => [result, ...prev.slice(0, 49)]);
      }

      console.log(`✅ Search complete: ${relevantChunks.length} chunks from ${relevantArticles.length} articles`);

      return result;

    } catch (error) {
      console.error('❌ Search error:', error);

      const errorResult = {
        success: false,
        error: error.message,
        query,
        timestamp: new Date().toISOString()
      };

      if (saveToHistory) {
        setSearchHistory(prev => [errorResult, ...prev.slice(0, 49)]);
      }

      return errorResult;
    }
  }, [processedArticles, findRelevantChunks, createContextForQuery]);

  // ============================================================================
  // INITIALIZATION FUNCTIONS
  // ============================================================================

  const initializeRAG = useCallback(async (options = {}) => {
    const {
      listName = "ArticlesList",
      chunkingOptions = {
        chunkSize: 800,
        overlap: 150,
        strategy: 'smart'
      },
      forceRefresh = false
    } = options;

    console.log('🚀 Initializing RAG system...');
    setIsProcessing(true);

    try {
      // Step 1: Load articles
      console.log('📋 Loading articles from SharePoint...');
      const articles = await loadArticlesFromSharePoint(listName);

      if (articles.length === 0) {
        throw new Error('No articles found in SharePoint');
      }

      // Step 2: Process articles
      console.log('🔄 Processing articles...');
      const { processedDocs, errors } = await processArticlesForRAG(articles, chunkingOptions);

      if (processedDocs.length === 0) {
        throw new Error('No articles could be processed');
      }

      // Step 3: Update state
      setProcessedArticles(processedDocs);

      const totalChunks = processedDocs.reduce((sum, doc) => sum + doc.totalChunks, 0);
      const newStatus = {
        totalArticles: processedDocs.length,
        totalChunks,
        isReady: true,
        fromCache: false,
        lastUpdated: new Date().toISOString(),
        error: null,
        processingErrors: errors.length,
        averageChunkSize: Math.round(processedDocs.reduce((sum, doc) => sum + doc.averageChunkSize, 0) / processedDocs.length),
        averageQuality: Math.round(processedDocs.reduce((sum, doc) => sum + doc.qualityScore, 0) / processedDocs.length)
      };

      setRagStatus(newStatus);
      setIsInitialized(true);

      console.log(`✅ RAG initialization complete:`);
      console.log(`   📊 ${processedDocs.length} articles processed`);
      console.log(`   🧩 ${totalChunks} chunks created`);
      console.log(`   ❌ ${errors.length} processing errors`);

      return {
        success: true,
        articlesProcessed: processedDocs.length,
        totalChunks,
        errors: errors.length,
        status: newStatus
      };

    } catch (error) {
      console.error('❌ RAG initialization failed:', error);

      const errorStatus = {
        totalArticles: 0,
        totalChunks: 0,
        isReady: false,
        fromCache: false,
        lastUpdated: null,
        error: error.message
      };

      setRagStatus(errorStatus);
      setIsInitialized(false);

      return {
        success: false,
        error: error.message,
        status: errorStatus
      };
    } finally {
      setIsProcessing(false);
    }
  }, [loadArticlesFromSharePoint, processArticlesForRAG]);

  const resetRAG = useCallback(() => {
    console.log('🔄 Resetting RAG system...');

    setIsInitialized(false);
    setIsProcessing(false);
    setProcessedArticles([]);
    setSearchHistory([]);
    setLastSearchResult(null);
    setFeedbackHistory([]);

    setRagStatus({
      totalArticles: 0,
      totalChunks: 0,
      isReady: false,
      fromCache: false,
      lastUpdated: null,
      error: null
    });

    console.log('✅ RAG system reset complete');
  }, []);

  // ============================================================================
  // DEBUG FUNCTIONS
  // ============================================================================

  const debugArticleProcessing = useCallback(async (articles) => {
    console.log('🔍 Starting debug mode...');

    for (let i = 0; i < articles.length; i++) {
      const article = articles[i];

      console.log(`\n🔍 DEBUG Article ${i + 1}/${articles.length}:`);
      console.log(`   📝 Name: ${article.fileName}`);
      console.log(`   📏 Text Length: ${article.text?.length || 0}`);

      if (!article.text || article.text.length < 50) {
        console.log(`   ⏭️ SKIPPING: ${!article.text ? 'No text' : 'Too short'}`);
        continue;
      }

      try {
        const startTime = Date.now();
        const chunks = await Promise.race([
          createTextChunks(article.text, { strategy: 'simple' }),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('TIMEOUT')), 5000)
          )
        ]);

        const duration = Date.now() - startTime;
        console.log(`   ✅ SUCCESS: ${chunks.length} chunks in ${duration}ms`);

        if (i === articles.length - 1) {
          console.log(`   🎯 LAST ARTICLE - Extra details:`);
          console.log(`      Preview: "${article.text.substring(0, 100)}..."`);
          console.log(`      Chunks: ${chunks.map(c => c.size).join(', ')}`);
