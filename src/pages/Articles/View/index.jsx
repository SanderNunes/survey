import ArticleRating from '@/components/ArticleRating';
import ArticleSideBar from '@/components/articleSidebar';
import ArticleSkeleton from '@/components/ArticleSkeleton';
import { PuckRenderer } from '@/components/puck/editor/PuckRenderer';
import { useSharePoint } from '@/hooks/useSharePoint';
import CourseRating from '@/pages/Academy/CourseRating';
import { motion, AnimatePresence } from 'framer-motion';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';

export default function ArticleViewPage() {
  const { t } = useTranslation()
  const [articleContent, setArticleContent] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [articles, setArticles] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredArticles, setFilteredArticles] = useState([]);
  const { publishArticles, article, getArticle, getAllPublishArticles, getUserRating, updateArticleMetadata, updateTrendingArticles } = useSharePoint();
  const [isDone, setIsDone] = useState(false)
  const [userRating, setUserRating] = useState(0);
  const [loading, setLoading] = useState(false);
  const { slug } = useParams();





  useEffect(() => {
    const fetchArticle = async () => {
      try {
        setIsLoading(true);
        setError(null);
        await getArticle({ slug });
        await getAllPublishArticles('Published')
      } catch (err) {
        setError('Failed to load article');
        console.error('Error fetching article:', err);
      }
    };

    if (slug) {
      fetchArticle();
    }
  }, [getArticle, slug, getAllPublishArticles]);




  const handleView = useCallback(async () => {
    await updateArticleMetadata(article?.Id, {
      ArticleViews: (article.ArticleViews + 1),
      LastViewDate: new Date()
    })

    await updateTrendingArticles();
  }, [article, updateArticleMetadata, updateTrendingArticles]);

  useEffect(() => {
    if (!article?.Id) return;

    setTimeout(() => {
      handleView()
    }, 20 * 1000);
  }, [article, handleView]);

  const handleRating = useCallback(async () => {
    setIsDone(true)
  }, []);

  useEffect(() => {
    if (!article?.Id) return;
    setLoading(true)

    !userRating && getUserRating(article?.Id, true)
      .then(entry => {
        setUserRating(entry?.RatingArticle ?? 0)
        setIsDone(true)
      })

    setLoading(false)
  }, [article, userRating, getUserRating]);

  useEffect(() => {
    const mappedArticles = publishArticles.map(article => {
      const tag = article?.Tags ? JSON.parse(article?.Tags) || [] : []
      const at =   article?.ArticleContent ? JSON.parse(article?.ArticleContent) : article?.ArticleContent
      const att =   at?.content?.find(cnt => cnt.type == "ArticleHeader")

      return {
        id: article.Id,
        title: article.Title,
        summary: article.Summary,
        coverImage: `https://africellcloud.sharepoint.com/${att?.props?.coverImage}`,
        category: article.Category,
        type: article.ArticleType,
        level: article.ArticleLevel,
        tags: tag,
        readTime: article.ReadTime,
        publishedAt: article.Created,
        updatedAt: article.Modified,
        slug: article.ArticleSlug,
        metrics: {
          views: article.ArticleViews,
          rating: article.ArticleRating
        },
        featured: article.Featured,
        trending: article.Trending
      }
    })
    setArticles(mappedArticles)
  }, [publishArticles]);

  useEffect(() => {
    const contentArticle = async () => {
      try {
        if (article?.ArticleContent) {
          const content = JSON.parse(article.ArticleContent);
          setArticleContent(content);
        }
      } catch (err) {
        setError('Failed to parse article content');
        console.error('Error parsing article content:', err);
      } finally {
        setIsLoading(false);
      }
    };

    if (article) {
      contentArticle();
    }
  }, [article]);

  const handleSearch = useCallback((query) => {
    setSearchQuery(query);

    if (!query.trim()) {
      setFilteredArticles([]);
      return;
    }

    const searchTerm = query.toLowerCase().trim();
    const filtered = articles.filter(article => {
      return (
        article.title?.toLowerCase().includes(searchTerm) ||
        article.summary?.toLowerCase().includes(searchTerm) ||
        article.category?.toLowerCase().includes(searchTerm) ||
        article.type?.toLowerCase().includes(searchTerm) ||
        article.tags?.some(tag => tag.toLowerCase().includes(searchTerm))
      );
    });

    setFilteredArticles(filtered);
  }, [articles]);

  // Error state
  if (error) {
    return (
      <AnimatePresence mode="wait">
        <motion.div
          key="error"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.4 }}
          className="flex items-center justify-center min-h-64"
        >
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, duration: 0.3 }}
            className="text-center"
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-red-500 text-lg font-medium mb-2"
            >
              Oops! Something went wrong
            </motion.div>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-gray-600 mb-4"
            >
              {error}
            </motion.div>
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              whileHover={{ scale: 1.05, transition: { duration: 0.2 } }}
              whileTap={{ scale: 0.95 }}
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-primary-500 text-white rounded-md hover:bg-primary-600 transition-colors"
            >
              Try Again
            </motion.button>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    );
  }

  // Loading state
  if (isLoading || !articleContent) {
    return (
      <AnimatePresence mode="wait">
        <motion.div
          key="loading"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="max-w-4xl mx-auto px-4 py-8"
        >
          <ArticleSkeleton />
        </motion.div>
      </AnimatePresence>
    );
  }

  return (
    <div className="container py-16 pb-32">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <div className='col-span-2'>
          <AnimatePresence mode="wait">
            <motion.div
              key="content"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{
                duration: 0.6,
                ease: "easeOut"
              }}
            >
              <PuckRenderer data={articleContent} />
            </motion.div>

            <div className='grid grid-cols-1 mt-16'>
              <h3 className='text-primary text-center font-medium text-lg p-5'>{t('articles.articleHelpfulness')}</h3>
              <div className='flex justify-center'>
              <ArticleRating
                key={userRating}
                articleId={article.Id}
                initialRating={userRating}
                onRating={handleRating}
                loading={loading} />
              </div>
            </div>
          </AnimatePresence>

        </div>
        <div className=''>
          <ArticleSideBar
            displayedArticles={articles}
            onSearch={handleSearch}
            searchQuery={searchQuery}
            searchResults={filteredArticles} />
        </div>
      </div>
    </div>
  )
}
