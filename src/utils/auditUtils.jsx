import { Plus, Edit, AlertCircle } from 'lucide-react';

/**
 * Get date range filter object based on selected range
 */
export const getDateRangeFilter = (range) => {
  const now = new Date();
  const startDate = new Date();

  switch (range) {
    case 'Past 7 days':
      startDate.setDate(now.getDate() - 7);
      break;
    case 'Past 30 days':
      startDate.setDate(now.getDate() - 30);
      break;
    case 'Past 3 months':
      startDate.setMonth(now.getMonth() - 3);
      break;
    case 'Past year':
      startDate.setFullYear(now.getFullYear() - 1);
      break;
    default:
      return {};
  }

  return { startDate, endDate: now };
};

/**
 * Get appropriate icon for action type
 */
export const getActionIcon = (actionType) => {
 const iconMap = {
    Add: <Plus className="w-4 h-4" />,
    Edit: <Edit className="w-4 h-4" />,
    Block: <AlertCircle className="w-4 h-4" />,
    Delete: <AlertCircle className="w-4 h-4" />
  };
  return iconMap[actionType] || <Plus className="w-4 h-4" />;
  // return '';
};

/**
 * Get appropriate color for action type
 */
export const getActionColor = (actionType) => {
  const colorMap = {
    Add: "bg-green-300",
    Modify: "bg-primary-300",
    Create: "bg-orange-300",
    Delete: "bg-red-400",
    View: "bg-primary-300"
  };
  return colorMap[actionType] || "bg-gray-300";
};

/**
 * Format date for display
 */
export const formatDate = (dateString) => {
  const date = new Date(dateString);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) {
    return "Today";
  } else if (date.toDateString() === yesterday.toDateString()) {
    return "Yesterday";
  } else {
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }
};

/**
 * Format time for display
 */
export const formatTime = (dateString) => {
  return new Date(dateString).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
};

/**
 * Group logs by date
 */
export const groupLogsByDate = (logs) => {
  const grouped = {};
  logs.forEach(log => {
    const dateKey = formatDate(log.Created);
    if (!grouped[dateKey]) {
      grouped[dateKey] = [];
    }
    grouped[dateKey].push(log);
  });
  return grouped;
};

/**
 * Get display string for date range
 */
export const getDateRangeDisplay = (dateRange) => {
  const dateFilter = getDateRangeFilter(dateRange);
  if (!dateFilter.startDate || !dateFilter.endDate) return '';

  return `${dateFilter.startDate.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  })} → ${dateFilter.endDate.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  })}`;
};

// Constants
export const FILTER_OPTIONS = ['Activity', 'View', 'Modify', 'Delete', 'Upload', 'Create'];
export const DATE_RANGE_OPTIONS = ['Past 7 days', 'Past 30 days', 'Past 3 months', 'Past year'];
export const ITEMS_PER_PAGE = 5;
