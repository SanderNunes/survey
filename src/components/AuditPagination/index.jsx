import React, { memo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next'; // Add this import

/**
 * Pagination component with internationalization support
 */
const AuditPagination = memo(({
  currentPageNumber,
  totalCount,
  hasNextPage,
  hasPrevPage,
  loading,
  onPrevPage,
  onNextPage
}) => {
  const { t, i18n } = useTranslation(); // Add this hook

  // Format numbers according to locale
  const formatNumber = (number) => {
    const locale = i18n.language.startsWith('pt') ? 'pt-BR' : 'en-US';
    return number.toLocaleString(locale);
  };

  // Don't render if there are no navigation options
  if (!hasNextPage && !hasPrevPage) return null;

  // Generate page info text
  const getPageInfo = () => {
    if (totalCount > 0) {
      return t('pagination.pageInfoWithTotal', {
        page: currentPageNumber,
        total: formatNumber(totalCount)
      });
    } else {
      return t('pagination.pageInfo', { page: currentPageNumber });
    }
  };

  return (
    <div className="mt-8 flex items-center justify-between">
      <div className="text-sm text-gray-700">
        {getPageInfo()}
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={onPrevPage}
          disabled={!hasPrevPage || loading}
          className={`flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            !hasPrevPage || loading
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
          }`}
          aria-label={t('pagination.previous')}
          title={!hasPrevPage ? undefined : t('pagination.previous')}
        >
          <ChevronLeft className="w-4 h-4" />
          {t('pagination.previous')}
        </button>

        {/* Current Page Display */}
        <div
          className="px-3 py-2 bg-primary-500 text-white rounded-lg text-sm font-medium"
          aria-label={t('pagination.pageInfo', { page: currentPageNumber })}
        >
          {currentPageNumber}
        </div>

        <button
          onClick={onNextPage}
          disabled={!hasNextPage || loading}
          className={`flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            !hasNextPage || loading
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
          }`}
          aria-label={t('pagination.next')}
          title={!hasNextPage ? undefined : t('pagination.next')}
        >
          {t('pagination.next')}
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Loading indicator */}
      {loading && (
        <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            {t('pagination.loading')}
          </div>
        </div>
      )}
    </div>
  );
});

AuditPagination.displayName = 'AuditPagination';

export default AuditPagination;
