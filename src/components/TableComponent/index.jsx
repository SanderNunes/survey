import {
  Typography,
  Button,
  Chip,
  Avatar,
  IconButton,
  Tooltip,
  Input,
  Menu,
  Select,
} from "@material-tailwind/react";
import {
  EditIcon,
  PlusIcon,
  Search,
  Filter,
  MoreVertical,
  Edit2,
  Trash2,
  Eye,
  Calendar,
  User,
  Tag,
  ChevronDown,
  BrushCleaningIcon,
  ChevronRight
} from "lucide-react";
import { useMemo, useState, useEffect } from "react";
import { NavLink } from "react-router-dom";
import SelectDropdown from "../SelectDropdown";
import { useTranslation } from 'react-i18next'; // Add this import

export default function TableComponent({
  Title,
  Subtitle,
  TABLE_HEAD,
  TABLE_ROWS,
  itemsPerPage = 10,
  enablePagination = true,
  enableBulkActions = false,
  enableFilters = false,
  enableSelection = false,
  filterOptions = {},
  bulkActions = [],
  actions = {
    create: '',
    edit: null, // Function to handle edit: (row, index) => {}
    delete: null, // Function to handle delete: (row, index) => {}
    view: null, // Function to handle view: (row, index) => {}
    custom: [] // Array of custom actions: [{ label, onClick, icon }]
  },
  loading = false,
  emptyStateMessage,
  searchableColumns = [], // Array of column keys that should be searchable
  onBulkAction = null, // Function to handle bulk actions: (action, selectedIds) => {}
  onFilterChange = null, // Function to handle filter changes: (filters) => {}
  customRowActions = [], // Custom row actions for dropdown menu
  statusColors = {}, // Custom status colors mapping
  renderCell = null, // Custom cell renderer: (value, row, column) => {}
  ariaLabel, // Accessibility label for the table
}) {
  const { t } = useTranslation(); // Add this hook
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRows, setSelectedRows] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({});
  const [bulkAction, setBulkAction] = useState('');

  // Use translated empty state message if not provided
  const defaultEmptyStateMessage = emptyStateMessage || t('table.search.noData');

  // Initialize filters from filterOptions
  useEffect(() => {
    const initialFilters = {};
    Object.keys(filterOptions).forEach(key => {
      initialFilters[key] = 'all';
    });
    setFilters(initialFilters);
  }, [filterOptions]);

  // Helper function to get nested values from objects
  const getNestedValue = (obj, key) => {
    if (!obj || !key) return '';
    return key.split('.').reduce((o, k) => (o && o[k] !== undefined) ? o[k] : '', obj);
  };

  // Get searchable columns - if not specified, search all columns
  const getSearchableColumns = () => {
    if (searchableColumns.length > 0) {
      return searchableColumns;
    }
    return TABLE_HEAD.filter(col => !isActionColumn(col)).map(col => getColumnKey(col));
  };

  // Filter data based on search and filters
  const filteredData = useMemo(() => {
    if (!TABLE_ROWS) return [];

    let filtered = [...TABLE_ROWS];

    // Apply search filter
    if (searchTerm.trim()) {
      const searchColumns = getSearchableColumns();
      filtered = filtered.filter(item =>
        searchColumns.some(columnKey => {
          const value = getNestedValue(item, columnKey);
          return value && value.toString().toLowerCase().includes(searchTerm.toLowerCase());
        })
      );
    }

    // Apply other filters
    Object.entries(filters).forEach(([filterKey, filterValue]) => {
      if (filterValue !== 'all' && filterValue !== '') {
        filtered = filtered.filter(item => {
          const itemValue = getNestedValue(item, filterKey);
          return itemValue === filterValue;
        });
      }
    });

    return filtered;
  }, [TABLE_ROWS, searchTerm, filters, TABLE_HEAD]);

  // Reset to first page when search or filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filters]);

  // Notify parent of filter changes
  useEffect(() => {
    if (onFilterChange) {
      onFilterChange({ searchTerm, ...filters });
    }
  }, [searchTerm, filters, onFilterChange]);

  // Pagination logic
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = enablePagination
    ? filteredData.slice(startIndex, startIndex + itemsPerPage)
    : filteredData;

  // Selection handlers
  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedRows(filteredData.map(row => row.id));
    } else {
      setSelectedRows([]);
    }
  };

  const handleSelectRow = (rowId, checked) => {
    if (checked) {
      setSelectedRows(prev => [...prev, rowId]);
    } else {
      setSelectedRows(prev => prev.filter(id => id !== rowId));
    }
  };

  // Bulk action handler
  const handleBulkAction = () => {
    if (!bulkAction || selectedRows.length === 0) return;

    if (onBulkAction) {
      onBulkAction(bulkAction, selectedRows);
    }

    setBulkAction('');
    setSelectedRows([]);
  };

  // Filter handler
  const handleFilterChange = (filterKey, value) => {
    setFilters(prev => ({
      ...prev,
      [filterKey]: value
    }));
  };

  // Clear all filters
  const clearFilters = () => {
    const clearedFilters = {};
    Object.keys(filterOptions).forEach(key => {
      clearedFilters[key] = 'all';
    });
    setFilters(clearedFilters);
    setSearchTerm('');
  };

  // Generate page numbers for pagination
  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        pages.push(1, 2, 3, '...', totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1, '...', totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
      }
    }
    return pages;
  };

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const handleEdit = (row, index) => {
    if (actions.edit && typeof actions.edit === 'function') {
      actions.edit(row, index);
    }
  };

  const handleDelete = (row, index) => {
    if (actions.delete && typeof actions.delete === 'function') {
      actions.delete(row, index);
    }
  };

  const handleView = (row, index) => {
    if (actions.view && typeof actions.view === 'function') {
      actions.view(row, index);
    }
  };

  // Get status color based on status value
  const getStatusColor = (status) => {
    if (statusColors[status]) {
      return statusColors[status];
    }

    // Default status colors
    switch (status?.toLowerCase()) {
      case 'published':
      case 'publicado':
        return 'bg-green-100 text-green-800';
      case 'draft':
      case 'rascunho':
        return 'bg-gray-100 text-gray-800';
      case 'scheduled':
      case 'agendado':
        return 'bg-primary-100 text-primary-800';
      case 'archived':
      case 'arquivado':
        return 'bg-red-100 text-red-800';
      case 'active':
      case 'ativo':
        return 'bg-green-100 text-green-800';
      case 'inactive':
      case 'inativo':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Render cell content based on column configuration
  const renderCellContent = (row, column, value) => {
    // Use custom cell renderer if provided
    if (renderCell) {
      const customContent = renderCell(value, row, column);
      if (customContent !== undefined) {
        return customContent;
      }
    }

    // If column has a custom render function
    if (typeof column === 'object' && column.render) {
      return column.render(value, row);
    }

    // Handle special column types
    if (typeof column === 'object' && column.type) {
      switch (column.type) {
        case 'status':
          return (
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(value)}`}>
              {value?.charAt(0).toUpperCase() + value?.slice(1)}
            </span>
          );
        case 'tags':
          return (
            <div className="flex flex-wrap gap-1">
              {Array.isArray(value) ? value.map((tag, index) => (
                <span key={index} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                  <Tag className="w-3 h-3 mr-1" />
                  {tag}
                </span>
              )) : null}
            </div>
          );
        case 'date':
          return (
            <div className="flex items-center">
              <Calendar className="w-4 h-4 text-gray-400 mr-2" />
              <span className="text-sm text-gray-900">{value}</span>
            </div>
          );
        case 'stats':
          return (
            <div className="text-sm text-gray-900">
              <div className="flex items-center">
                <Eye className="w-4 h-4 text-gray-400 mr-1" />
                {value?.views || 0}
              </div>
              {value?.ratings && (
                <div className="text-xs text-gray-500 mt-1">
                  {t('table.values.ratings', { count: value.ratings })}
                </div>
              )}
            </div>
          );
      }
    }

    // Default rendering logic
    if (value === null || value === undefined) {
      return t('table.values.dash');
    }

    if (typeof value === "boolean") {
      return value ? t('table.values.yes') : t('table.values.no');
    }

    if (typeof value === "object") {
      // Handle arrays
      if (Array.isArray(value)) {
        return value.join(", ");
      }
      // Handle objects (convert to string)
      return JSON.stringify(value);
    }

    return value.toString();
  };

  // Get column key for accessing data
  const getColumnKey = (column) => {
    return typeof column === 'string' ? column : column.key;
  };

  // Get column label for display
  const getColumnLabel = (column) => {
    return typeof column === 'string' ? column : (column.label || column.key);
  };

  // Check if column is action column
  const isActionColumn = (column) => {
    return typeof column === 'object' && column.isAction === true;
  };

  if (loading) {
    return (
      <div className="w-full px-2">
        <div className="flex justify-center items-center py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4"></div>
            <Typography>{t('table.loading')}</Typography>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full" role="region" aria-label={ariaLabel}>
      {/* Header Section */}
      <div className="mb-4 flex flex-col justify-between gap-8 md:flex-row md:items-center px-8">
        <div className="flex items-center gap-2 w-full">
          <Typography type="h6">{Title}</Typography>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white mx-6 my-6 rounded-lg shadow-sm overflow-hidden">
        <div className="grid grid-cols-1 p-6">
          <div className="flex justify-between">
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Filters Toggle */}
              {enableFilters && Object.keys(filterOptions).length > 0 && (
                <Button
                  variant="ghost"
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-secondary-100 transition-colors"
                  aria-expanded={showFilters}
                  aria-controls="filters-section"
                >
                  <Filter className="w-4 h-4" />
                  {t('table.filters.title')}
                  <ChevronRight className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-90' : ''}`} />
                </Button>
              )}

              {/* Expanded Filters */}
              {enableFilters && showFilters && Object.keys(filterOptions).length > 0 && (
                <div
                  id="filters-section"
                  className="rounded-lg flex items-end gap-2"
                  role="group"
                  aria-label={t('table.filters.title')}
                >
                  <div className="flex flex-wrap gap-4">
                    {Object.entries(filterOptions).map(([filterKey, options]) => (
                      <div key={filterKey}>
                        <SelectDropdown
                          value={filters[filterKey] || 'all'}
                          onChange={handleFilterChange}
                          options={options}
                          filterKey={filterKey}
                          placeholder={t(`table.filters.all${filterKey}`, filterKey)}
                          className="w-full px-3 py-2 border border-gray-100 focus:border-primary rounded-md focus:outline-none focus:ring-2 focus:ring-secondary"
                          aria-label={`Filter by ${filterKey}`}
                        />
                      </div>
                    ))}
                  </div>
                  <Button
                    variant="ghost"
                    onClick={clearFilters}
                    aria-label={t('table.filters.clearFilters')}
                    title={t('table.filters.clearFilters')}
                  >
                    <BrushCleaningIcon className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>

            <div className="flex w-full shrink-0 gap-2 md:w-max">
              <div className="w-full md:w-72">
                <Input
                  placeholder={t('table.search.placeholder')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  aria-label={t('table.search.placeholder')}
                >
                  <Input.Icon placement="end">
                    <Search className="h-4 w-4" />
                  </Input.Icon>
                </Input>
              </div>
              {actions.create && (
                typeof actions.create === 'string' ? (
                  <NavLink
                    to={actions.create}
                    className="flex items-center gap-3 text-white hover:bg-alternative-300 bg-alternative-400 px-3 py-2 rounded-full whitespace-nowrap border-none"
                    aria-label={t('table.actions.create')}
                  >
                    <PlusIcon strokeWidth={2} className="h-4 w-4" />
                  </NavLink>
                ) : (
                  <Button
                    onClick={actions.create}
                    className="flex items-center gap-3 text-white hover:bg-alternative-300 bg-alternative-400 px-3 py-2 rounded-full whitespace-nowrap border-none"
                    aria-label={t('table.actions.create')}
                  >
                    <PlusIcon strokeWidth={2}  className="h-4 w-4" />
                  </Button>
                )
              )}
            </div>
          </div>

          {/* Bulk Actions */}
          {enableBulkActions && selectedRows.length > 0 && (
            <div className="mt-4 p-3 border border-primary-200 rounded-lg">
              <div className="flex items-center gap-4">
                <span className="text-sm text-primary-800">
                  {t('table.bulk.selected', { count: selectedRows.length })}
                </span>
                <Select
                  value={bulkAction}
                  onChange={(e) => setBulkAction(e)}
                  onValueChange={(e) => setBulkAction(e)}
                  label={t('table.bulk.chooseAction')}
                  size="md"
                  variant="outlined"
                  className="hover:border-none focus:border-none capitalize"
                  labelProps={{
                    className: "before:content-none after:content-none",
                  }}
                  containerProps={{
                    className: "min-w-0 w-full capitalize",
                  }}
                >
                  <Select.Trigger
                    className="capitalize hover:border-none focus:border-none"
                    placeholder={t('table.bulk.chooseAction')}
                    value={bulkAction}
                  />
                  <Select.List>
                    <Select.Option value={``} className='capitalize'>
                      {t('table.bulk.chooseAction')}
                    </Select.Option>
                    {bulkActions.map(action => (
                      <Select.Option key={action.value} value={action.value} className='capitalize'>
                        {action.label}
                      </Select.Option>
                    ))}
                  </Select.List>
                </Select>
                <Button
                  onClick={handleBulkAction}
                  variant="ghost"
                  disabled={!bulkAction}
                  className="disabled:text-gray-400 text-primary-500 px-3 py-1 rounded-md text-sm font-medium transition-colors"
                >
                  {t('table.bulk.apply')}
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full" role="table">
            <thead className="border-b border-gray-200">
              <tr>
                {enableSelection && (
                  <th className="w-4 px-6 py-3">
                    <input
                      type="checkbox"
                      checked={selectedRows.length === filteredData.length && filteredData.length > 0}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      aria-label="Select all rows"
                    />
                  </th>
                )}
                {TABLE_HEAD.map((head, index) => (
                  <th
                    key={getColumnKey(head) || index}
                    className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider"
                    scope="col"
                  >
                    {getColumnLabel(head)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={TABLE_HEAD.length + (enableSelection ? 1 : 0)} className="px-6 py-12">
                    <div className="text-center">
                      <div className="text-gray-500">
                        <Search className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                        <h3 className="text-lg font-medium mb-2">
                          {filteredData.length === 0 && searchTerm ?
                            t('table.search.noResults') :
                            t('table.search.noData')
                          }
                        </h3>
                        <p className="text-sm">
                          {filteredData.length === 0 && searchTerm ?
                            t('table.search.noResultsDesc') :
                            defaultEmptyStateMessage
                          }
                        </p>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedData.map((row, rowIndex) => (
                  <tr key={row.id || `row-${rowIndex}`} className="hover:bg-gray-50 transition-colors">
                    {enableSelection && (
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          checked={selectedRows.includes(row.id)}
                          onChange={(e) => handleSelectRow(row.id, e.target.checked)}
                          className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                          aria-label={`Select row ${rowIndex + 1}`}
                        />
                      </td>
                    )}
                    {TABLE_HEAD.map((column, colIndex) => {
                      const columnKey = getColumnKey(column);

                      // Handle action column
                      if (isActionColumn(column)) {
                        return (
                          <td className="px-6 py-4" key={`action-${rowIndex}-${colIndex}`}>
                            <div className="relative">
                              <Menu>
                                <Menu.Trigger as={Button} variant='ghost' aria-label="Row actions">
                                  <MoreVertical className="w-4 h-4 text-gray-400" />
                                </Menu.Trigger>
                                <Menu.Content>
                                  {actions.view && (
                                    <Menu.Item
                                      className='hover:bg-secondary hover:text-primary'
                                      onClick={() => handleView(row, rowIndex)}
                                    >
                                      <Eye className="w-4 h-4 mr-2" />
                                      {t('table.actions.view')}
                                    </Menu.Item>
                                  )}
                                  {actions.edit && (
                                    <Menu.Item
                                      className='hover:bg-secondary hover:text-primary'
                                      onClick={() => handleEdit(row, rowIndex)}
                                    >
                                      <Edit2 className="w-4 h-4 mr-2" />
                                      {t('table.actions.edit')}
                                    </Menu.Item>
                                  )}
                                  {customRowActions.map((action, actionIndex) => (
                                    <Menu.Item
                                      key={actionIndex}
                                      className='hover:bg-secondary hover:text-primary'
                                      onClick={() => action.onClick(row, rowIndex)}
                                    >
                                      {action.icon && <action.icon className="w-4 h-4 mr-2" />}
                                      {action.label}
                                    </Menu.Item>
                                  ))}
                                  {actions.delete && (
                                    <Menu.Item
                                      className='hover:bg-red-50 hover:text-red-600'
                                      onClick={() => handleDelete(row, rowIndex)}
                                    >
                                      <Trash2 className="w-4 h-4 mr-2" />
                                      {t('table.actions.delete')}
                                    </Menu.Item>
                                  )}
                                </Menu.Content>
                              </Menu>
                            </div>
                          </td>
                        );
                      }

                      // Handle regular data column
                      const value = getNestedValue(row, columnKey);
                      return (
                        <td className="px-6 py-4" key={`cell-${rowIndex}-${colIndex}`}>
                          <div className="text-sm text-gray-900">
                            {renderCellContent(row, column, value)}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {enablePagination && totalPages > 1 && (
        <div className="bg-white mx-6 mb-6 px-6 py-3 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-700">
              {t('table.pagination.showing')} <span className="font-medium">{startIndex + 1}</span> {t('table.pagination.to')}{' '}
              <span className="font-medium">
                {Math.min(startIndex + itemsPerPage, filteredData.length)}
              </span>{' '}
              {t('table.pagination.of')} <span className="font-medium">{filteredData.length}</span> {t('table.pagination.results')}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label={t('table.pagination.previous')}
              >
                {t('table.pagination.previous')}
              </button>

              <div className="hidden sm:flex sm:items-center">
                <div className="flex gap-1" role="navigation" aria-label="Pagination">
                  {getPageNumbers().map((page, index) => (
                    <button
                      key={index}
                      onClick={() => typeof page === 'number' && handlePageChange(page)}
                      disabled={page === '...'}
                      className={`px-3 py-1 rounded-md text-sm transition-colors ${page === currentPage
                        ? 'bg-primary text-white'
                        : 'border border-gray-300 hover:bg-gray-50'
                        }`}
                      aria-label={typeof page === 'number' ? `Go to page ${page}` : 'More pages'}
                      aria-current={page === currentPage ? 'page' : undefined}
                    >
                      {page}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label={t('table.pagination.next')}
              >
                {t('table.pagination.next')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
