import { AsyncPager } from "@/utils/AsyncPager ";
import { getDateRangeFilter, ITEMS_PER_PAGE } from "@/utils/auditUtils";


/**
 * Service class for handling SharePoint audit log operations
 */
export class AuditService {
  constructor(sp) {
    this.sp = sp;
  }

  /**
   * Build filter conditions based on current filters
   */
  buildFilterConditions(selectedFilter, dateRange) {
    const filterConditions = [];
    
    // Apply activity type filter
    if (selectedFilter && selectedFilter !== 'Activity') {
      filterConditions.push(`ActionType eq '${selectedFilter}'`);
    }
    
    // Apply date range filter
    const dateFilter = getDateRangeFilter(dateRange);
    if (dateFilter.startDate && dateFilter.endDate) {
      const startISO = dateFilter.startDate.toISOString();
      const endISO = dateFilter.endDate.toISOString();
      filterConditions.push(`Created ge datetime'${startISO}' and Created le datetime'${endISO}'`);
    }
    
    return filterConditions.length > 0 ? filterConditions.join(' and ') : null;
  }

  /**
   * Fetch total count for display purposes
   */
  async fetchTotalCount(selectedFilter, dateRange) {
    if (!this.sp?.web) return 0;
    
    try {
      const combinedFilter = this.buildFilterConditions(selectedFilter, dateRange);
      
      // Build count query
      let countQuery = this.sp.web.lists.getByTitle("AuditLogs").items.select("Id");
      
      if (combinedFilter) {
        countQuery = countQuery.filter(combinedFilter);
      }
      
      const totalCountResult = await countQuery();
      return totalCountResult.length;
    } catch (err) {
      console.error('Error fetching total count:', err);
      throw new Error('Failed to fetch total count');
    }
  }

  /**
   * Create pager with current filters
   */
  async createPager(selectedFilter, dateRange) {
    if (!this.sp?.web) throw new Error('SharePoint not initialized');

    try {
      const combinedFilter = this.buildFilterConditions(selectedFilter, dateRange);
      
      // Build main query for items using async iterator
      let itemsQuery = this.sp.web.lists.getByTitle("AuditLogs").items
        .select("Id", "Title", "Details", "ActionType", "UserName", "Created");
      
      // Apply filters first
      if (combinedFilter) {
        itemsQuery = itemsQuery.filter(combinedFilter);
      }

      // Apply ordering and pagination using async iterator
      itemsQuery = itemsQuery
        .orderBy("Created", false) // newest first
        .top(ITEMS_PER_PAGE);

      // Create new pager with the async iterable
      return new AsyncPager(itemsQuery);
    } catch (err) {
      console.error('Error creating pager:', err);
      throw new Error('Failed to create pager');
    }
  }

  /**
   * Initialize pager and get total count
   */
  async initializePagerWithCount(selectedFilter, dateRange) {
    const [pager, totalCount] = await Promise.all([
      this.createPager(selectedFilter, dateRange),
      this.fetchTotalCount(selectedFilter, dateRange)
    ]);

    return { pager, totalCount };
  }
}