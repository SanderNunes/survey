import { formatDate } from '@/utils/auditUtils';
import { Calendar, Search, X } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next'; // Add this import

export default function ArticleSideBar({
  displayedArticles,
  allArticles = [],
  onSearch,
  searchQuery = '',
  searchResults = []
}) {
  const { t } = useTranslation(); // Add this hook
  const [localSearchTerm, setLocalSearchTerm] = useState(searchQuery);

  // Update local search when prop changes
  useEffect(() => {
    setLocalSearchTerm(searchQuery);
  }, [searchQuery]);


  // Handle search input change with debouncing
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setLocalSearchTerm(value);
    // Clear existing timeout
    if (window.searchTimeout) {
      clearTimeout(window.searchTimeout);
    }

    // Set new timeout for debounced search
    window.searchTimeout = setTimeout(() => {
      if (onSearch) {
        onSearch(value);
      }
    }, 300);
  };

  // Handle search button click
  const handleSearchClick = () => {
    if (onSearch) {
      onSearch(localSearchTerm);
    }
  };

  // Handle clear search
  const handleClearSearch = () => {
    setLocalSearchTerm('');
    if (onSearch) {
      onSearch('');
    }
  };

  // Handle Enter key press
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      if (onSearch) {
        onSearch(localSearchTerm);
      }
    }
  };

  return (
    <div>
      <div className="w-full bg-white grid grid-cols-1 gap-4">

        {/* Search Section */}
        <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-md border border-gray-100/50 transition-all duration-300">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('sidebar.searchHere')}</h2>

          <div className="relative">
            <input
              type="text"
              placeholder={t('sidebar.searchPlaceholder')}
              value={localSearchTerm}
              onChange={handleSearchChange}
              onKeyPress={handleKeyPress}
              className="w-full px-4 py-3 pr-20 bg-white border border-gray-200 rounded-lg text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200"
            />

            {/* Search and Clear buttons */}
            <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
              {localSearchTerm && (
                <button
                  onClick={handleClearSearch}
                  className="p-1 hover:bg-gray-100 rounded transition-colors duration-200"
                  title={t('sidebar.clearSearchTitle')}
                >
                  <X className="w-4 h-4 text-gray-400 hover:text-gray-600" />
                </button>
              )}
              <button
                onClick={handleSearchClick}
                className="p-1 hover:bg-gray-100 rounded transition-colors duration-200"
                title={t('sidebar.searchTitle')}
              >
                <Search className="w-4 h-4 text-gray-400 hover:text-primary-500" />
              </button>
            </div>
          </div>

          {/* Search Results Info */}
          {searchQuery && (
            <div className="mt-3 text-sm text-gray-600">
              {searchResults.length > 0 ? (
                <span className="text-primary-600">
                  {t('sidebar.found', { count: searchResults.length, query: searchQuery })}
                </span>
              ) : (
                <span className="text-gray-500">
                  {t('sidebar.noResultsFor', { query: searchQuery })}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Popular Posts Section */}
        <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-md border border-gray-100/50 transition-all duration-300">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">
            {searchQuery ? t('sidebar.searchResults') : t('sidebar.popularPosts')}
          </h2>

          <div className="space-y-4">
            {/* Show search results if searching, otherwise show popular posts */}
            {(searchQuery ? searchResults : displayedArticles).slice(0, 6).map((post, index) => (
              <div key={post.id} className="flex items-start space-x-3 group cursor-pointer">
                <NavLink to={`/home/articles/${post.slug}`} className="flex items-start space-x-3 group cursor-pointer w-full">
                  {/* Post Image/Thumbnail */}
                  <div className="relative overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100 w-16 h-16 flex-shrink-0">
                    <img
                      src={post.coverImage}
                      alt={post.title}
                      className="w-full h-full object-cover opacity-80 group-hover:opacity-90 transition-opacity duration-300 rounded-xl"
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent rounded-xl"></div>
                  </div>

                  {/* Post Content */}
                  <div className="flex-1 min-w-0">
                    {/* Date and Category */}
                    <div className="flex items-center text-xs text-primary-500 mb-2">
                      <Calendar className="w-3 h-3 mr-1 flex-shrink-0" />
                      <span className="truncate">{formatDate(post.publishedAt)}</span>
                      {post.category && (
                        <>
                          <span className="mx-1">•</span>
                          <span className="truncate">{post.category}</span>
                        </>
                      )}
                    </div>

                    {/* Title */}
                    <h3 className="text-sm font-medium text-gray-900 leading-tight group-hover:text-primary-600 transition-colors line-clamp-2">
                      {post.title}
                    </h3>

                    {/* Tags (if searching) */}
                    {searchQuery && post.tags && post.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {post.tags.slice(0, 2).map((tag, tagIndex) => (
                          <span
                            key={tagIndex}
                            className="inline-block px-2 py-1 bg-primary-50 text-primary-700 text-xs rounded-full"
                          >
                            {tag}
                          </span>
                        ))}
                        {post.tags.length > 2 && (
                          <span className="text-xs text-gray-500">
                            {t('sidebar.moreTagsCount', { count: post.tags.length - 2 })}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </NavLink>
              </div>
            ))}

            {/* No results message */}
            {searchQuery && searchResults.length === 0 && (
              <div className="text-center py-8">
                <Search className="w-8 h-8 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">{t('sidebar.noArticlesFound')}</p>
                <button
                  onClick={handleClearSearch}
                  className="text-primary-600 hover:text-primary-700 text-sm font-medium mt-2"
                >
                  {t('common.clearSearch')}
                </button>
              </div>
            )}

            {/* Show message when no articles to display */}
            {!searchQuery && displayedArticles.length === 0 && (
              <div className="text-center py-8">
                <Calendar className="w-8 h-8 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">{t('sidebar.noArticlesAvailable')}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
