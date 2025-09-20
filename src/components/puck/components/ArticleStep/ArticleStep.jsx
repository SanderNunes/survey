import { Check } from 'lucide-react';
import React from 'react';

export const ArticleStep = ({
  listType = "ordered",
  title = "Default Title",
  items = []
}) => {
  const isOrdered = listType === 'ordered';

  // Ensure items is always an array
  const safeItems = Array.isArray(items) ? items : [];


  return (
    <div className="p-6">
      <div className="">
        {isOrdered ? (
          <ol className="space-y-3">
            {safeItems.map((item, index) => (
              <li key={index} className="flex items-start pb-4">
                <span className="flex-shrink-0 w-6 h-6 bg-primary-500 text-white rounded-full flex items-center justify-center text-sm font-medium mr-3 mt-0.5">
                  {index + 1}
                </span>
                <span className="text-gray-700 leading-relaxed whitespace-pre-line"  dangerouslySetInnerHTML={{ __html: item }}></span>
              </li>
            ))}
          </ol>
        ) : (
          <ul className="space-y-3">
            {safeItems.map((item, index) => (
              <li key={index} className="flex items-center pb-4">
                <Check className="w-5 h-5 text-primary-500 mr-3 flex-shrink-0" />
                <span className="text-gray-700 whitespace-pre-line"  dangerouslySetInnerHTML={{ __html: item }}></span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};
