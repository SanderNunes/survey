import { Award, BookOpen, FileText, Lightbulb, Target } from 'lucide-react';
import React from 'react';

export const ArticleHeader = ({
  coverImage,
  title,
  type,
  publishedAt,
  rating,
  showRating
}) => {
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'Guide': return <BookOpen className="w-4 h-4 text-primary-500" />;
      case 'Best Practice': return <Award className="w-4 h-4 text-primary-500" />;
      case 'Case Study': return <Target className="w-4 h-4 text-primary-500" />;
      case 'Tutorial': return <Lightbulb className="w-4 h-4 text-primary-500" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  return (
    <article className="bg-white rounded-lg overflow-hidden transition-all duration-300 group cursor-pointer relative">
      <div className="relative overflow-hidden p-3">
  <div className="relative w-full aspect-[16/7]">
    <img
      src={`https://africellcloud.sharepoint.com/${coverImage}`}
      alt={title}
      className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:opacity-90 transition-opacity duration-300 rounded-xl"
    />
  </div>
</div>
      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            {getTypeIcon(type)}
            {/* <span className="text-sm font-medium text-primary-600">{type}</span> */}
            <div className="text-xs text-primary-500">
              {formatDate(publishedAt)}
            </div>
          </div>
          {showRating && (
            <div className="text-right">
              <div className="hidden items-center gap-1 text-yellow-500 mb-1">
                <span className="text-sm text-gray-600 ml-1">({rating})</span>
              </div>
            </div>
          )}
        </div>
        <h2 className="text-4xl font-semibold text-gray-900 mb-3 line-clamp-2 group-hover:text-primary-700 transition-colors leading-snug">
          {title}
        </h2>
      </div>
    </article>
  );
};
