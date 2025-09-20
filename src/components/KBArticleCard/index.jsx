import { Award, BookOpen, Lightbulb, Target, FileText } from 'lucide-react';
import React from 'react';
import { NavLink } from 'react-router-dom';
import ArticleRating from '../ArticleRating';

const KnowledgeArticleCard = ({ article }) => {
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
    <NavLink to={`/home/articles/${article.slug}`}>
      <article className="bg-white rounded-lg overflow-hidden transition-all duration-300 group cursor-pointer relative mb-16">
        <div className="relative overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl">
  <div className="relative w-full aspect-[16/7]">
    <img
      src={article.coverImage}
      alt={article.title}
      className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:opacity-90 transition-opacity duration-300 rounded-xl"
    />
    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent rounded-xl"></div>
    <div className="absolute bottom-3 left-3 right-3 rounded-lg"></div>
  </div>
</div>


        <div className="p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              {getTypeIcon(article.type)}
              <span className="text-sm font-medium text-primary-600">{article.type}</span>
              <div className="text-xs text-primary-500">
                {formatDate(article.publishedAt)}
              </div>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-1 text-yellow-500 mb-1">
                <ArticleRating
                  size={16}
                  key={article.metrics.rating}
                  articleId={article.id}
                  initialRating={article.metrics.rating} />
                <span className="text-sm text-gray-600 ml-1">{article.metrics.rating}</span>
              </div>
            </div>
          </div>

          <h2 className="text-4xl font-semibold text-gray-900 mb-3 line-clamp-2 group-hover:text-primary-700 transition-colors leading-snug">
            {article.title}
          </h2>

          <p className="text-gray-600 mb-4 line-clamp-3 text-sm leading-relaxed">
            {article.summary}
          </p>

          <div className="flex items-center justify-between pt-3 ">
            <NavLink to={`/home/articles/${article.slug}`} className="border border-primary text-primary hover:bg-primary-100 hover:border-primary-100 px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-1">
              <BookOpen className="w-3 h-3" />
              Read Now
            </NavLink>
          </div>
        </div>
      </article>
    </NavLink>
  );
};

export default KnowledgeArticleCard
