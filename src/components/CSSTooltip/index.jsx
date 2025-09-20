import React, { useState } from 'react';
import { Info, User, Star, Heart } from 'lucide-react';

// Basic CSS-only tooltip component
const CSSTooltip = ({ text, children, position = 'top' }) => {
  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2'
  };

  const arrowClasses = {
    top: 'top-full left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-b-transparent border-t-gray-800',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-t-transparent border-b-gray-800',
    left: 'left-full top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-r-transparent border-l-gray-800',
    right: 'right-full top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-l-transparent border-r-gray-800'
  };

  return (
    <div className="relative inline-block group">
      {children}
      <div className={`absolute ${positionClasses[position]} opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10`}>
        <div className="bg-gray-800 text-white text-sm px-2 py-1 rounded whitespace-nowrap">
          {text}
        </div>
        <div className={`absolute w-0 h-0 border-4 ${arrowClasses[position]}`}></div>
      </div>
    </div>
  );
};

export default CSSTooltip;
