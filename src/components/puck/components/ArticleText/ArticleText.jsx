import React from 'react';

export const ArticleText = ({
  showSubtitle,
  subtitle,
  content
}) => {
  return (
    <div className="m-5">
      {showSubtitle && (
        <h4 className="text-primary-600 font-medium text-xl py-3">
          {subtitle}
        </h4>
      )}
      <div
        className="text-gray-700 text-lg text-justify"
        dangerouslySetInnerHTML={{ __html: content }}
      />
    </div>
  );
};
