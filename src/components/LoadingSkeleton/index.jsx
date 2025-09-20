import React, { memo } from 'react';
import Logo  from '@/assets/AfricellLogo.png';


/**
 * Loading skeleton component
 */
const LoadingSkeleton = memo(() => (
  <div className="max-w-4xl mx-auto p-6">
    <img src={Logo} alt="Africell Logo" className="w-auto h-auto mx-auto mb-6 animate-bounce" />
  </div>
));

export default LoadingSkeleton;
