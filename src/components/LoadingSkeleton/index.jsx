import React, { memo } from 'react';
import { Signal } from 'lucide-react';

/**
 * Loading skeleton component
 */
const LoadingSkeleton = memo(() => (
  <div className="max-w-4xl mx-auto p-6">
    <div className="flex flex-col items-center justify-center gap-3 mb-6">
      <Signal className="w-16 h-16 text-primary animate-bounce" />
      <span className="text-primary font-semibold text-lg tracking-wide">Telecom Market Insights</span>
    </div>
  </div>
));

export default LoadingSkeleton;
