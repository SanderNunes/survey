/* eslint-disable no-unused-vars */
import { useSharePoint } from '@/hooks/useSharePoint';
import { FilterIcon, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import moment from 'moment';
import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import LoadingSkeleton from '@/components/LoadingSkeleton';

const ITEMS_PER_PAGE = 8;

export default function SearchResultsPage() {
  const [activeTab, setActiveTab] = useState('');
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const query = params.get("q");
  const { searchSharePointFolder, searchSharePointList } = useSharePoint();
  const [results, setResults] = useState({});
  const [tabs, setTabs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const { t, i18n } = useTranslation();

  // Ensure moment date format follows current language
  useEffect(() => {
    moment.locale(i18n.language);
  }, [i18n.language]);

  useEffect(() => {
    const handleSearch = async () => {
      if (!query?.trim()) return;
      setLoading(true);
      try {
        const [documentsData, articleListData] = await Promise.all([
          searchSharePointFolder(
            'https://africellcloud.sharepoint.com/sites/KnowledgeBase',
            "/Shared Documents/",
            query,
          ),
          searchSharePointList(
            'https://africellcloud.sharepoint.com/sites/KnowledgeBase',
            "ArticlesList",
            query,
          )
        ]);

        const combinedData = [...documentsData, ...articleListData];
        const filtered = combinedData.filter(
          item => !['cellito_rag_cache', 'Cellito RAG Cache'].includes(item.Title)
        );
        const categorized = categorizeFiles(filtered);

        setTabs(Object.keys(categorized));
        setActiveTab(Object.keys(categorized)[0] || '');
        setResults(categorized);
      } catch (err) {
        console.error(t("search.error"), err);
      } finally {
        setLoading(false);
      }
    };
    handleSearch();
  }, [query]);

  function categorizeFiles(files) {
    return files.reduce((acc, file) => {
      const category = file.AfricellFileCategory || file.ContentType || t('search.uncategorized');
      const modifiedDate = moment(file.LastModifiedTime).format('DD MMMM YYYY');
      const author = `${file.Author.split(";")[1] || file.Author}, ${modifiedDate}`;

      let coverImage = file.PictureThumbnailURL;
      try {
        const articleContent = file?.ArticleContent ? JSON.parse(file.ArticleContent) : null;
        const headerBlock = articleContent?.content?.find(cnt => cnt.type === "ArticleHeader");
        if (!coverImage && headerBlock?.props?.coverImage) {
          coverImage = `https://africellcloud.sharepoint.com${headerBlock.props.coverImage}`;
        }
      } catch { }

      const item = {
        title: file.Title,
        author,
        image: coverImage || '/default-image.png',
        ...file
      };

      if (!acc[category]) acc[category] = [];
      if (item.title !== "KnowledgeBase - Documents") {
        acc[category].push(item);
      }
      return acc;
    }, {});
  }

  const paginatedResults = results[activeTab]?.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE
  ) || [];

  if (loading) {
    return (
      <div className="flex items-center justify-center w-screen h-screen bg-gray-50 animate-fadeIn">
        <LoadingSkeleton />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen font-sans bg-gray-50">
      <div className="max-w-6xl w-full mx-auto px-6 py-8">
        <h1 className="text-2xl font-bold mb-6">
          {t('search.resultsFor')} <span className="text-primary-600">"{query}"</span>
        </h1>

        {/* Tabs */}
        <div className="flex gap-6 border-b border-gray-200 mb-6">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => { setActiveTab(tab); setPage(1); }}
              className={`pb-3 text-sm font-medium capitalize border-b-2 transition-colors duration-200
                                ${activeTab === tab
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
            >
              {t(`search.tabs.${tab.toLowerCase()}`, { defaultValue: tab + "s" })}
            </button>
          ))}
        </div>

        {/* Results Grid */}
        {paginatedResults.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {paginatedResults.map((item, i) => (
              <a
                key={i}
                href={item.Path || `/home/articles/${item.slug}`}
                className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden border border-gray-100"
              >
                <div
                  className="h-40 bg-gray-200 bg-center bg-cover"
                  style={{ backgroundImage: `url(${item.image})` }}
                />
                <div className="p-4">
                  <h2 className="text-sm font-semibold text-gray-900 line-clamp-2">{item.title}</h2>
                  <p className="mt-1 text-xs text-gray-500">{item.author}</p>
                </div>
              </a>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-sm">{t('search.noResults')}</p>
        )}

        {/* Pagination */}
        {results[activeTab]?.length > ITEMS_PER_PAGE && (
          <div className="flex justify-center items-center gap-4 mt-8">
            <button
              onClick={() => setPage(prev => Math.max(prev - 1, 1))}
              disabled={page === 1}
              className="p-2 rounded-lg border border-gray-300 hover:bg-gray-100 disabled:opacity-50"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="text-sm text-gray-600">
              {t('search.pagination', {
                current: page,
                total: Math.ceil(results[activeTab]?.length / ITEMS_PER_PAGE)
              })}
            </span>
            <button
              onClick={() => setPage(prev => prev + 1)}
              disabled={page >= Math.ceil(results[activeTab]?.length / ITEMS_PER_PAGE)}
              className="p-2 rounded-lg border border-gray-300 hover:bg-gray-100 disabled:opacity-50"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
