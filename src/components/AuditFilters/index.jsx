import React, { memo } from 'react';
import { Filter, Calendar, ChevronDown, Loader2, RefreshCw } from 'lucide-react';
import { DATE_RANGE_OPTIONS, FILTER_OPTIONS, getDateRangeDisplay } from '@/utils/auditUtils';
import { Button, Chip, Select, Typography } from '@material-tailwind/react';
import { useTranslation } from 'react-i18next'; // Add this import

/**
 * Filter dropdown component using Material Tailwind Select with i18n support
 */
const FilterDropdown = memo(({ value, onChange, options, disabled, placeholder, label }) => {
  const { t } = useTranslation(); // Add this hook

  return (
    <div className="min-w-[100px]">
      <Select
        value={value}
        onChange={(val) => onChange(val)}
        onValueChange={(val) => onChange(val)}
        disabled={disabled}
        label={label}
        size="md"
        variant="outlined"
        className="!border-primary-gray-200 focus:!border-primary-500"
        labelProps={{
          className: "before:content-none after:content-none",
        }}
        containerProps={{
          className: "min-w-0",
        }}
      >
        <Select.Trigger className="w-72" placeholder={placeholder} />
        <Select.List>
          {options.map(option => (
            <Select.Option key={option} value={option}>
              {option}
            </Select.Option>
          ))}
        </Select.List>
      </Select>
    </div>
  );
});
FilterDropdown.displayName = 'FilterDropdown';

/**
 * Enhanced date range display with i18n support
 */
const getLocalizedDateRangeDisplay = (dateRange, t) => {
  const dateRangeMap = {
    'today': t('audit.dateRanges.today'),
    'yesterday': t('audit.dateRanges.yesterday'),
    'last7Days': t('audit.dateRanges.last7Days'),
    'last30Days': t('audit.dateRanges.last30Days'),
    'thisMonth': t('audit.dateRanges.thisMonth'),
    'lastMonth': t('audit.dateRanges.lastMonth'),
    'custom': t('audit.dateRanges.custom')
  };

  return dateRangeMap[dateRange] || getDateRangeDisplay(dateRange);
};

/**
 * Enhanced filter options with i18n support
 */
const getLocalizedFilterOptions = (t) => {
  return [
    t('audit.activities.all'),
    t('audit.activities.login'),
    t('audit.activities.logout'),
    t('audit.activities.create'),
    t('audit.activities.update'),
    t('audit.activities.delete'),
    t('audit.activities.view'),
    t('audit.activities.download')
  ];
};

/**
 * Enhanced date range options with i18n support
 */
const getLocalizedDateRangeOptions = (t) => {
  return [
    t('audit.dateRanges.today'),
    t('audit.dateRanges.yesterday'),
    t('audit.dateRanges.last7Days'),
    t('audit.dateRanges.last30Days'),
    t('audit.dateRanges.thisMonth'),
    t('audit.dateRanges.lastMonth'),
    t('audit.dateRanges.custom')
  ];
};

/**
 * Main audit filters component with Material Tailwind styling and i18n support
 */
const AuditFilters = memo(({
  selectedFilter,
  dateRange,
  loading,
  onFilterChange,
  onDateRangeChange,
  onClearFilters
}) => {
  const { t, i18n } = useTranslation(); // Add this hook

  // Format numbers according to locale
  const formatNumber = (number) => {
    const locale = i18n.language.startsWith('pt') ? 'pt-BR' : 'en-US';
    return number.toLocaleString(locale);
  };

  // Get localized options
  const localizedFilterOptions = getLocalizedFilterOptions(t);
  const localizedDateRangeOptions = getLocalizedDateRangeOptions(t);

  return (
    <div className="flex flex-wrap gap-4 items-end p-4 bg-white rounded-lg border border-gray-100">
      <div className="flex items-center gap-2 mb-2">
        <Filter className="w-5 h-5 text-primary-gray-600" />
      </div>

      <div className="flex flex-wrap gap-3 items-end flex-1">
        {/* Activity Filter */}
        <FilterDropdown
          value={selectedFilter}
          onChange={onFilterChange}
          options={FILTER_OPTIONS}
          disabled={loading}
          label={t('audit.filters.activityType')}
          placeholder={t('audit.filters.selectActivity')}
        />

        {/* Date Range */}
        <FilterDropdown
          value={dateRange}
          onChange={onDateRangeChange}
          options={DATE_RANGE_OPTIONS}
          disabled={loading}
          label={t('audit.filters.dateRange')}
          placeholder={t('audit.filters.selectDateRange')}
        />

        {/* Date Range Display Chip */}
        <div className="flex items-end pb-2">
          <Chip
            variant="ghost"
            size="sm"
            className="rounded-full"
          >
            <Chip.Label>
              {getLocalizedDateRangeDisplay(dateRange, t)}
            </Chip.Label>
          </Chip>
        </div>

        {/* Clear Filters Button */}
        {(selectedFilter !== localizedFilterOptions[0] || dateRange !== localizedDateRangeOptions[0]) && (
          <div className="flex items-end pb-2">
            <button
              variant="text"
              size="sm"
              onClick={onClearFilters}
              disabled={loading}
              className="text-primary-600"
            >
              {t('audit.actions.clearFilters')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
});
AuditFilters.displayName = 'AuditFilters';

/**
 * Header component with Material Tailwind typography and buttons with i18n support
 */
const AuditHeader = memo(({
  totalCount,
  currentPageNumber,
  loading,
  onRefresh,
  onExport
}) => {
  const { t, i18n } = useTranslation(); // Add this hook

  // Format numbers according to locale
  const formatNumber = (number) => {
    const locale = i18n.language.startsWith('pt') ? 'pt-BR' : 'en-US';
    return number.toLocaleString(locale);
  };

  return (
    <div className="flex justify-between items-start mb-6 p-4 bg-white rounded-lg border border-gray-100">
      <div>
        <Typography variant="h3" className="font-bold mb-2">
          {t('audit.title')}
        </Typography>
        <Typography variant="small" className="font-normal opacity-70">
          {t('audit.subtitle')}
        </Typography>
      </div>

      <div className="flex items-center gap-4">
        {loading && (
          <div className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-primary-500" />
            <Typography variant="small" className="font-normal">
              {t('audit.status.loading')}
            </Typography>
          </div>
        )}

        <div className="text-right">
          <Typography variant="small" className="font-medium">
            {totalCount > 0 ? (
              t('audit.status.pageInfo', { page: currentPageNumber })
            ) : (
              t('audit.status.noEntries')
            )}
          </Typography>
          {totalCount > 0 && (
            <Typography variant="small" className="opacity-70">
              {t('audit.status.totalEntries', { count: totalCount })}
            </Typography>
          )}
        </div>

        {/* Action Buttons */}
        {/* <div className="flex items-center gap-2">
          {onRefresh && (
            <button
              variant="outlined"
              size="sm"
              color='primary'
              onClick={onRefresh}
              disabled={loading}
              className="flex items-center gap-2"
              title={t('audit.actions.refresh')}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              {t('audit.actions.refresh')}
            </button>
          )}

          {onExport && totalCount > 0 && (
            <Button
              variant="filled"
              size="sm"
              onClick={onExport}
              disabled={loading}
              className="flex items-center gap-2"
              title={t('audit.actions.export')}
            >
              {t('audit.actions.export')}
            </Button>
          )}
        </div> */}
      </div>
    </div>
  );
});
AuditHeader.displayName = 'AuditHeader';

export { AuditFilters, AuditHeader };
