import React, { useEffect } from 'react';
import { Calendar } from 'lucide-react';

export const PublishDateField = ({ field, onChange, value }) => {
  useEffect(() => {
    // Set current date if no value exists
    if (!value) {
      const now = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
      onChange(now);
    }
  }, [value, onChange]);

  const formatDate = (dateString) => {
    if (!dateString) return 'Not set';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        {field.label}
      </label>

      <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-800 text-sm">
        <div className="flex items-center space-x-2">
          <Calendar className="w-4 h-4 text-gray-500" />
          <span>{formatDate(value)}</span>
        </div>
      </div>

      {/* Optional: Show raw date value */}
      <div className="text-xs text-gray-400">
        {value}
      </div>
    </div>
  );
};
