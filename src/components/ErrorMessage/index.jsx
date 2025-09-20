import React, { memo } from 'react';
import { AlertCircle } from 'lucide-react';

/**
 * Error message component
 */
const ErrorMessage = memo(({ error }) => {
  if (!error) return null;

  return (
    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
      <div className="flex items-center gap-2 text-red-800">
        <AlertCircle className="w-5 h-5" />
        <span className="font-medium">Error</span>
      </div>
      <p className="mt-1 text-sm text-red-700">{error}</p>
    </div>
  );
});

ErrorMessage.displayName = 'ErrorMessage';

export default ErrorMessage;