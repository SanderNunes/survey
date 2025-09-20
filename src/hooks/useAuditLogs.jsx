import { AuditService } from '@/services/audit.service';
import { useState, useCallback, useMemo } from 'react';

/**
 * Custom hook for managing audit logs state and operations
 */
export const useAuditLogs = (sp) => {
  // State management
  const [logs, setLogs] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Paging state
  const [pager, setPager] = useState(null);
  const [currentPageNumber, setCurrentPageNumber] = useState(0);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [hasPrevPage, setHasPrevPage] = useState(false);

  // Memoized service instance
  const auditService = useMemo(() => {
    return sp ? new AuditService(sp) : null;
  }, [sp]);

  /**
   * Update pagination state from pager
   */
  const updatePaginationState = useCallback((pagerInstance) => {
    setCurrentPageNumber(pagerInstance.currentPageNumber);
    setHasNextPage(pagerInstance.hasNext);
    setHasPrevPage(pagerInstance.hasPrev);
  }, []);

  /**
   * Load current page from pager
   */
  const loadCurrentPage = useCallback(async (pagerInstance = null) => {
    const currentPager = pagerInstance || pager;
    if (!currentPager) return;

    setLoading(true);
    setError(null);

    try {
      const items = await currentPager.current();
      setLogs(items || []);
      updatePaginationState(currentPager);
    } catch (err) {
      console.error('Error loading current page:', err);
      setError('Failed to load audit logs. Please try again.');
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [pager, updatePaginationState]);

  /**
   * Initialize pager and load first page
   */
  const initializePager = useCallback(async (selectedFilter, dateRange) => {
    if (!auditService) return;

    setLoading(true);
    setError(null);

    try {
      const { pager: newPager, totalCount } = await auditService.initializePagerWithCount(
        selectedFilter, 
        dateRange
      );
      
      setPager(newPager);
      setTotalCount(totalCount);
      
      await loadCurrentPage(newPager);
    } catch (err) {
      console.error('Error initializing pager:', err);
      setError(err.message || 'Failed to load audit logs. Please try again.');
      setLoading(false);
    }
  }, [auditService, loadCurrentPage]);

  /**
   * Navigate to next page
   */
  const handleNextPage = useCallback(async () => {
    if (!pager || !hasNextPage || loading) return;

    setLoading(true);
    setError(null);

    try {
      const items = await pager.next();
      setLogs(items || []);
      updatePaginationState(pager);
    } catch (err) {
      console.error('Error loading next page:', err);
      setError('Failed to load next page. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [pager, hasNextPage, loading, updatePaginationState]);

  /**
   * Navigate to previous page
   */
  const handlePrevPage = useCallback(async () => {
    if (!pager || !hasPrevPage || loading) return;

    setLoading(true);
    setError(null);

    try {
      const items = await pager.prev();
      setLogs(items || []);
      updatePaginationState(pager);
    } catch (err) {
      console.error('Error loading previous page:', err);
      setError('Failed to load previous page. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [pager, hasPrevPage, loading, updatePaginationState]);

  /**
   * Refresh current data
   */
  const handleRefresh = useCallback(async (selectedFilter, dateRange) => {
    await initializePager(selectedFilter, dateRange);
  }, [initializePager]);

  return {
    // State
    logs,
    totalCount,
    loading,
    error,
    currentPageNumber,
    hasNextPage,
    hasPrevPage,
    
    // Actions
    initializePager,
    handleNextPage,
    handlePrevPage,
    handleRefresh
  };
};