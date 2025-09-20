import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Search, Calendar, Clock, Tag, BookOpen, Users, Award, TrendingUp, Filter, FileText, Lightbulb, Target, ChevronLeft, ChevronRight } from 'lucide-react';
import { useSharePoint } from '@/hooks/useSharePoint';
import { useTranslation } from 'react-i18next'; // Add this import
import moment from 'moment';
import { NavLink } from 'react-router-dom';
import subbannerkb from '@/assets/subbannerkb.png'
import { Breadcrumb, Typography } from '@material-tailwind/react';
import { formatDate } from '@/utils/auditUtils';
import KnowledgeArticleCard from '@/components/KBArticleCard';
import ArticleSideBar from '@/components/articleSidebar';

const LoadingSpinner = () => {
  const { t } = useTranslation();

  return (
    <div className="flex justify-center items-center py-12">
      <div className="flex items-center gap-3">
        <div className="w-6 h-6 border-3 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
        <span className="text-gray-600 font-medium">{t('articlesFeed.loadingMessage')}</span>
      </div>
    </div>
  );
};

const Pagination = ({ currentPage, totalPages, onPageChange, totalItems, itemsPerPage }) => {
  const { t } = useTranslation();
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  // Generate page numbers to show
  const getPageNumbers = () => {
    const pages = [];
    const maxPagesToShow = 5;

    let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
    let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);

    // Adjust startPage if we're near the end
    if (endPage - startPage + 1 < maxPagesToShow) {
      startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    return pages;
  };

  const pageNumbers = getPageNumbers();

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-6">
      {/* Results info */}
      <div className="text-sm text-gray-600">
        {t('articlesFeed.showingResults', { start: startItem, end: endItem, total: totalItems })}
      </div>

      {/* Pagination controls */}
      <div className="flex items-center gap-2">
        {/* Previous button */}
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:text-gray-500"
        >
          <ChevronLeft className="w-4 h-4" />
          {t('common.previous')}
        </button>

        {/* Page numbers */}
        <div className="flex items-center gap-1">
          {/* First page if not in range */}
          {pageNumbers[0] > 1 && (
            <>
              <button
                onClick={() => onPageChange(1)}
                className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:text-gray-700"
              >
                1
              </button>
              {pageNumbers[0] > 2 && (
                <span className="px-2 py-2 text-sm text-gray-500">{t('pagination.ellipsis')}</span>
              )}
            </>
          )}

          {/* Page number buttons */}
          {pageNumbers.map((pageNum) => (
            <button
              key={pageNum}
              onClick={() => onPageChange(pageNum)}
              className={`px-3 py-2 text-sm font-medium rounded-lg ${
                pageNum === currentPage
                  ? 'text-white bg-primary-600 border border-primary-600'
                  : 'text-gray-500 bg-white border border-gray-300 hover:bg-gray-50 hover:text-gray-700'
              }`}
            >
              {pageNum}
            </button>
          ))}

          {/* Last page if not in range */}
          {pageNumbers[pageNumbers.length - 1] < totalPages && (
            <>
              {pageNumbers[pageNumbers.length - 1] < totalPages - 1 && (
                <span className="px-2 py-2 text-sm text-gray-500">{t('pagination.ellipsis')}</span>
              )}
              <button
                onClick={() => onPageChange(totalPages)}
                className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:text-gray-700"
              >
                {totalPages}
              </button>
            </>
          )}
        </div>

        {/* Next button */}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:text-gray-500"
        >
          {t('common.next')}
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

const ArticlesFeedPage = () => {
  const { t } = useTranslation(); // Add this hook
  const [articles, setArticles] = useState([]);
  const [displayedArticles, setDisplayedArticles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredArticles, setFilteredArticles] = useState([]);
  const { publishArticles, getAllPublishArticles } = useSharePoint()


  const ARTICLES_PER_PAGE = 5;

  // Fetch all articles on component mount
  useEffect(() => {
    const fetchAllArticles = async () => {
      setLoading(true);
      try {
        await getAllPublishArticles('Published');
      } finally {
        setLoading(false);
      }
    }
    fetchAllArticles()
  }, [getAllPublishArticles]);

  // Map and set articles when publishArticles changes
  useEffect(() => {
    const mappedArticles = publishArticles.map(article => {
      const tag = article?.Tags ? JSON.parse(article?.Tags) || [] : []
      const at =   article?.ArticleContent ? JSON.parse(article?.ArticleContent) : article?.ArticleContent
      const att =   at?.content?.find(cnt => cnt.type == "ArticleHeader")

      return {
        id: article.Id,
        title: article.Title,
        summary: article.Summary,
        coverImage: `https://africellcloud.sharepoint.com${att?.props?.coverImage}`,
        category: article.Category,
        type: article.ArticleType,
        level: article.ArticleLevel,
        tags: tag,
        readTime: article.ReadTime,
        publishedAt: article.Modified,
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
    setArticles(mappedArticles);
    setCurrentPage(1); // Reset to first page when articles change
  }, [publishArticles]);

  // Handle search functionality
  const handleSearch = useCallback((query) => {
    setSearchQuery(query);
    setCurrentPage(1); // Reset to first page when searching

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

  // Get articles to display based on search and pagination
  const { articlesToDisplay, totalPages, totalItems } = useMemo(() => {
    const articlesSource = searchQuery.trim() ? filteredArticles : articles;
    const startIndex = (currentPage - 1) * ARTICLES_PER_PAGE;
    const endIndex = startIndex + ARTICLES_PER_PAGE;

    return {
      articlesToDisplay: articlesSource.slice(startIndex, endIndex),
      totalPages: Math.ceil(articlesSource.length / ARTICLES_PER_PAGE),
      totalItems: articlesSource.length
    };
  }, [articles, filteredArticles, searchQuery, currentPage, ARTICLES_PER_PAGE]);

  // Update displayed articles when pagination or search changes
  useEffect(() => {
    setDisplayedArticles(articlesToDisplay);
  }, [articlesToDisplay]);


  // Handle page change
  const handlePageChange = (page) => {
    setCurrentPage(page);
    // Scroll to top when page changes
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Clear search
  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setFilteredArticles([]);
    setCurrentPage(1);
  }, []);

  return (
    <div className="container">
      {/* Header */}
      <div className='relative flex items-center py-6 h-[421.37px]'>
        <img src={subbannerkb} className='absolute top-6 z-0' alt={t('knowledgeBase.bannerAlt')} />
        <div className='ml-32 grid grid-cols-1 z-10 text-primaryDark-600 gap-3'>
          <Typography type='h2'>
            {t('articlesFeed.pageTitle')}
          </Typography>
        </div>
      </div>

      <div className="py-8">
        {/* Search Results Info */}
        {searchQuery.trim() && (
          <div className="mb-6 p-4 bg-primary-50 border border-primary-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Search className="w-5 h-5 text-primary-600" />
                <span className="text-primary-800 font-medium">
                  {t('articlesFeed.searchResultsFor')} "{searchQuery}"
                </span>
                <span className="text-primary-600 text-sm">
                  ({t('articlesFeed.articlesFound', { count: totalItems })})
                </span>
              </div>
              <button
                onClick={clearSearch}
                className="text-primary-600 hover:text-primary-800 text-sm font-medium"
              >
                {t('common.clearSearch')}
              </button>
            </div>
          </div>
        )}

        {/* Loading state while fetching initial data */}
        {loading && articles.length === 0 ? (
          <div className="text-center py-16">
            <LoadingSpinner />
            <p className="text-gray-600 mt-4">{t('articlesFeed.loadingArticles')}</p>
          </div>
        ) : totalItems > 0 ? (
          <>
            {/* Articles Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              <div className='col-span-2'>
                <div className="space-y-6">
                  {displayedArticles.map((article) => (
                    <KnowledgeArticleCard key={article.id} article={article} />
                  ))}
                </div>
              </div>
              <div className=''>
                <ArticleSideBar
                  displayedArticles={displayedArticles}
                  allArticles={articles}
                  onSearch={handleSearch}
                  searchQuery={searchQuery}
                  searchResults={filteredArticles}
                />
              </div>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
                totalItems={totalItems}
                itemsPerPage={ARTICLES_PER_PAGE}
              />
            )}
          </>
        ) : (
          /* No articles found */
          <div className="text-center py-16">
            <div className="w-24 h-24 mx-auto mb-6 text-gray-300">
              <Search className="w-full h-full" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {searchQuery.trim() ? t('articlesFeed.noSearchResults') : t('articlesFeed.noArticlesFound')}
            </h3>
            <p className="text-gray-600 mb-4">
              {searchQuery.trim()
                ? t('articlesFeed.noSearchResultsMessage', { query: searchQuery })
                : t('articlesFeed.noArticlesMessage')
              }
            </p>
            {searchQuery.trim() && (
              <button
                onClick={clearSearch}
                className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
              >
                {t('common.clearSearch')}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ArticlesFeedPage;
