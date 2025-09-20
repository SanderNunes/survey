import React from 'react';

export const ArticleQuote = ({ quoteText, authorName, authorTitle }) => {
  return (
    <div className="bg-white rounded-lg shadow-md p-8 w-full">
      <div className="mb-6">
        <div className="w-12 h-12 rounded-full border-2 border-primary-500 flex items-center justify-center">
          <svg className="w-6 h-6 text-primary-500" fill="currentColor" viewBox="0 0 24 24">
            <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-10zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h4v10h-10z" />
          </svg>
        </div>
      </div>
      <div className="mb-8">
        <p className="text-gray-700 text-lg leading-relaxed">
          {quoteText}
        </p>
      </div>
      <div>
        <h3 className="text-gray-900 font-semibold text-lg mb-1">{authorName}</h3>
        <p className="text-gray-500 text-sm">{authorTitle}</p>
      </div>
    </div>
  );
};
