import React, { useMemo, useState, useEffect } from 'react';
import { FileSpreadsheet, ChevronLeft, ChevronRight, Filter, X } from 'lucide-react';

// Pagination Component
const Pagination = ({ currentPage, totalPages, onPageChange, itemsPerPage, totalItems, onItemsPerPageChange }) => {
  const pageNumbers = [];
  const maxVisiblePages = 5;

  let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
  let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

  if (endPage - startPage + 1 < maxVisiblePages) {
    startPage = Math.max(1, endPage - maxVisiblePages + 1);
  }

  for (let i = startPage; i <= endPage; i++) {
    pageNumbers.push(i);
  }

  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  return (
    <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-gray-200 sm:px-6">
      <div className="flex items-center space-x-2">
        <span className="text-sm text-gray-700">Show</span>
        <select
          value={itemsPerPage}
          onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
          className="text-sm border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
        >
          <option value={5}>5</option>
          <option value={10}>10</option>
          <option value={25}>25</option>
          <option value={50}>50</option>
          <option value={100}>100</option>
        </select>
        <span className="text-sm text-gray-700">per page</span>
      </div>

      <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-gray-700">
            Showing <span className="font-medium">{startItem}</span> to{' '}
            <span className="font-medium">{endItem}</span> of{' '}
            <span className="font-medium">{totalItems}</span> results
          </p>
        </div>
        <div>
          <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
            <button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            {pageNumbers.map((number) => (
              <button
                key={number}
                onClick={() => onPageChange(number)}
                className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${currentPage === number
                    ? 'z-10 bg-primary-50 border-primary-500 text-primary-600'
                    : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                  }`}
              >
                {number}
              </button>
            ))}

            <button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </nav>
        </div>
      </div>

      {/* Mobile pagination */}
      <div className="flex-1 flex justify-between sm:hidden">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Previous
        </button>
        <span className="text-sm text-gray-700 flex items-center">
          Page {currentPage} of {totalPages}
        </span>
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Next
        </button>
      </div>
    </div>
  );
};

// Filter Component
const ColumnFilter = ({
  headers,
  selectedColumn,
  selectedValue,
  uniqueValues,
  onColumnChange,
  onValueChange,
  onClearFilter,
  isMultiSheet,
  selectedSheet,
  onSheetChange,
  availableSheets
}) => {
  return (
    <div className="p-4 ">
  <div className="flex flex-wrap items-center gap-4">

    {/* Sheet Selector */}
    {isMultiSheet && availableSheets?.length > 0 && (
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-gray-700">Table:</label>
        <select
          value={selectedSheet || availableSheets[0]}
          onChange={(e) => onSheetChange(e.target.value)}
          className="text-sm border-gray-300 rounded-md px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          {availableSheets.map((sheet) => (
            <option key={sheet} value={sheet}>{sheet}</option>
          ))}
        </select>
      </div>
    )}

    {/* Column Filter */}
    <div className="flex items-center gap-2">
      <Filter className="h-4 w-4 text-gray-500" />
      <label className="text-sm font-medium text-gray-700">Filter by:</label>
      <select
        value={selectedColumn || ''}
        onChange={(e) => onColumnChange(e.target.value || null)}
        className="text-sm border-gray-300 rounded-md px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      >
        <option value="">No Filter</option>
        {headers.map((header, index) => (
          <option key={index} value={index}>{header}</option>
        ))}
      </select>
    </div>

    {/* Value Filter */}
    {selectedColumn !== null && uniqueValues.length > 0 && (
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-gray-700">Value:</label>
        <select
          value={selectedValue || ''}
          onChange={(e) => onValueChange(e.target.value || null)}
          className="text-sm border-gray-300 rounded-md px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">All Values</option>
          {uniqueValues.map((value, index) => (
            <option key={index} value={value}>{value}</option>
          ))}
        </select>
      </div>
    )}

    {/* Clear Filters */}
    {(selectedColumn !== null || selectedSheet) && (
      <button
        onClick={onClearFilter}
        className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <X className="w-3 h-3" />
        Clear
      </button>
    )}
  </div>
</div>

  );
};

// Main Table Component
export const TableComponent = ({
  title,
  showTitle,
  tableData,
  headerStyle,
  cellStyle,
  borderStyle,
  size,
  enablePagination = true,
  defaultItemsPerPage = 10
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(defaultItemsPerPage);
  const [selectedColumn, setSelectedColumn] = useState(null);
  const [selectedValue, setSelectedValue] = useState(null);
  const [selectedSheet, setSelectedSheet] = useState(null);
  const isMultiSheet = tableData?.isMultiSheet || false;

  const availableSheets = useMemo(() => {
    if (!isMultiSheet || !tableData?.sheetsData) return [];
    return Object.keys(tableData.sheetsData);
  }, [isMultiSheet, tableData]);

  useEffect(() => {
    setSelectedColumn(null);
    setSelectedValue(null);
    if (isMultiSheet && availableSheets.length > 0) {
      setSelectedSheet(availableSheets[0]); // default to first sheet
    } else {
      setSelectedSheet(null);
    }
    setCurrentPage(1);
  }, [tableData, isMultiSheet, availableSheets]);


  const getHeaderStyle = (headerStyle) => {
  const styles = {
    default: "px-4 py-2 font-semibold bg-primary-500 text-white text-center",
    dark: "px-4 py-2 font-semibold bg-primary-800 text-white text-center",
  };
  return styles[headerStyle] || styles.default;
};

const getCellStyle = (cellStyle) => {
  const styles = {
    default: "px-4 py-2 ",
    compact: "px-2 py-1 text-sm ",
    spacious: "px-6 py-3 ",
    bordered: "px-4 py-2 border-b border-gray-200 "
  };
  return styles[cellStyle] || styles.default;
};

const getBorderStyle = (borderStyle) => {
  const styles = {
    default: "border border-gray-200",
    thick: "border-2 border-gray-300",
    none: "",
    colored: "border-2 border-blue-300"
  };
  return styles[borderStyle] || styles.default;
};

const getTableSize = (size) => {
  const sizes = {
    small: "text-sm",
    default: "",
    large: "text-lg"
  };
  return sizes[size] || sizes.default;
};


const visibleHeaders = useMemo(() => {
  if (isMultiSheet && tableData?.sheetsData && selectedSheet) {
    return tableData.sheetsData[selectedSheet]?.headers || [];
  }
  return tableData?.headers || [];
}, [isMultiSheet, tableData, selectedSheet]);

const visibleRows = useMemo(() => {
  if (isMultiSheet && tableData?.sheetsData && selectedSheet) {
    return tableData.sheetsData[selectedSheet]?.rows || [];
  }
  return tableData?.rows || [];
}, [isMultiSheet, tableData, selectedSheet]);




  const uniqueValues = useMemo(() => {
  if (selectedColumn === null || visibleRows.length === 0) return [];
  const values = new Set();
  visibleRows.forEach(row => {
    if (row[selectedColumn] !== undefined && row[selectedColumn] !== '') {
      values.add(String(row[selectedColumn]));
    }
  });
  return Array.from(values).sort();
}, [selectedColumn, visibleRows]);

const filteredRows = useMemo(() => {
  let rows = [...visibleRows];
  if (selectedColumn !== null && selectedValue) {
    rows = rows.filter(row => String(row[selectedColumn]) === selectedValue);
  }
  return rows;
}, [visibleRows, selectedColumn, selectedValue]);

const totalItems = filteredRows.length;
const totalPages = Math.ceil(totalItems / itemsPerPage);

const paginatedRows = useMemo(() => {
  if (!enablePagination) return filteredRows;
  const start = (currentPage - 1) * itemsPerPage;
  return filteredRows.slice(start, start + itemsPerPage);
}, [filteredRows, currentPage, itemsPerPage, enablePagination]);

  const displayRows = useMemo(() => {
    if (isMultiSheet && tableData.hiddenSheetColumn) {
      return paginatedRows // hide sheet col
    }
    return paginatedRows;
  }, [paginatedRows, isMultiSheet, tableData]);

  if (!visibleHeaders.length || !tableData?.rows?.length) {
    return (
      <div className="m-5 p-8 border-2 border-dashed border-gray-300 rounded-lg text-center text-gray-500">
        <FileSpreadsheet className="mx-auto mb-2 h-8 w-8" />
        <p>No table data available</p>
      </div>
    );
  }

  return (
    <div className="m-5">
      {showTitle && title && (
        <h3 className="text-xl font-semibold text-primary-500 mb-4">{title}</h3>
      )}
      <div className="bg-white rounded-lg overflow-hidden">
        <ColumnFilter
          headers={visibleHeaders}
          selectedColumn={selectedColumn}
          selectedValue={selectedValue}
          uniqueValues={uniqueValues}
          onColumnChange={(col) => { setSelectedColumn(col ? Number(col) : null); setSelectedValue(null); }}
          onValueChange={(val) => setSelectedValue(val)}
          onClearFilter={() => { setSelectedColumn(null); setSelectedValue(null); setSelectedSheet(null); }}
          isMultiSheet={isMultiSheet}
          selectedSheet={selectedSheet}
          onSheetChange={(sheet) => setSelectedSheet(sheet)}
          availableSheets={availableSheets}
        />

        <div className="overflow-x-auto">
         <table className={`w-full rounded-lg overflow-hidden ${getBorderStyle(borderStyle)} ${getTableSize(size)}`}>
            <thead>
              <tr>
                {visibleHeaders.map((header, i) => (
                  <th key={i} className={getHeaderStyle(headerStyle)}>
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayRows.map((row, i) => (
                <tr key={i} className="hover:bg-gray-50 text-center">
                  {row.map((cell, j) => (
                   <td key={j} className={getCellStyle(cellStyle)} dangerouslySetInnerHTML={{ __html: cell }}></td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {enablePagination && totalPages > 1 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={(page) => setCurrentPage(page)}
            itemsPerPage={itemsPerPage}
            totalItems={totalItems}
            onItemsPerPageChange={(n) => { setItemsPerPage(n); setCurrentPage(1); }}
          />
        )}
      </div>
    </div>
  );
};
