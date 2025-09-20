import React, { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/layouts/Dashboard';
import { useSharePoint } from '@/hooks/useSharePoint';
import { useAuditLogs } from '@/hooks/useAuditLogs';
import { AuditFilters, AuditHeader } from '@/components/AuditFilters';
import ErrorMessage from '@/components/ErrorMessage';
import AuditLogsList from '@/components/AuditLogsList';
import AuditPagination from '@/components/AuditPagination';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import EmptyState from '@/components/EmptyState';


/**
 * Main SystemAudit component
 */
const SystemAudit = () => {
  const { sp } = useSharePoint();

  // Filter states
  const [selectedFilter, setSelectedFilter] = useState('Activity');
  const [dateRange, setDateRange] = useState('Past 7 days');

  // Use custom hook for audit logs management
  const {
    logs,
    totalCount,
    loading,
    error,
    currentPageNumber,
    hasNextPage,
    hasPrevPage,
    initializePager,
    handleNextPage,
    handlePrevPage,
    handleRefresh
  } = useAuditLogs(sp);

  // // Initialize data when filters change
  useEffect(() => {
    if (sp?.web) {
      initializePager(selectedFilter, dateRange);
    }
  }, [sp, selectedFilter, dateRange]);

  console.log({selectedFilter});


  // Filter change handlers
  const handleFilterChange = useCallback((filter) => {
    setSelectedFilter(filter);
  }, []);

  const handleDateRangeChange = useCallback((range) => {
    setDateRange(range);
  }, []);

  // Refresh handler
  const handleRefreshClick = useCallback(() => {
    handleRefresh(selectedFilter, dateRange);
  }, [handleRefresh, selectedFilter, dateRange]);

  // Loading skeleton for initial load
  if (!sp?.web) {
    return (
      <DashboardLayout>
        <LoadingSkeleton />
      </DashboardLayout>
    );
  }


  return (
    <DashboardLayout>
      <div className="mb-16">
        {/* Header */}
        <div className="mb-6">
          <AuditHeader
            totalCount={totalCount}
            currentPageNumber={currentPageNumber}
            loading={loading}
            onRefresh={handleRefreshClick}
          />

          {/* Filters */}
          <AuditFilters
            selectedFilter={selectedFilter}
            dateRange={dateRange}
            loading={loading}
            onFilterChange={handleFilterChange}
            onDateRangeChange={handleDateRangeChange}
          />
        </div>

        {/* Error Message */}
        <ErrorMessage error={error} />

        {/* Content */}
        {!loading && totalCount === 0 ? (
          <EmptyState type='auditLogs' />
        ) : (
          <>
            <AuditLogsList logs={logs} />

            <AuditPagination
              currentPageNumber={currentPageNumber}
              totalCount={totalCount}
              hasNextPage={hasNextPage}
              hasPrevPage={hasPrevPage}
              loading={loading}
              onPrevPage={handlePrevPage}
              onNextPage={handleNextPage}
            />
          </>
        )}

        {/* Animation Styles */}
        <style jsx>{`
          @keyframes fadeInUp {
            from {
              opacity: 0;
              transform: translateY(10px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}</style>
      </div>
    </DashboardLayout>
  );
};

export default SystemAudit;
