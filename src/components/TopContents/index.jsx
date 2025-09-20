import React, { useEffect, useState } from 'react';
import FallBackAvatar from '../FallBackAvatar';
import { NavLink } from 'react-router-dom';
import { ChevronDown, Eye, Clock } from 'lucide-react';
import { useSharePoint } from '@/hooks/useSharePoint';
import moment from 'moment';
import { Timeline, Typography } from '@material-tailwind/react';
import { useTranslation } from 'react-i18next'; // Add this import

const TopContent = () => {
  const { t, i18n } = useTranslation(); // Add this hook
  const { allArticles, getAllArticles } = useSharePoint();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAllArticles = async () => {
      setLoading(true);
      try {
        await getAllArticles();
      } catch (error) {
        console.error('Error fetching articles:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchAllArticles();
  }, [getAllArticles]);

  // Configure moment locale based on current language
  useEffect(() => {
    if (i18n.language.startsWith('pt')) {
      moment.locale('pt-br');
    } else {
      moment.locale('en');
    }
  }, [i18n.language]);

  // Custom time ago function using translations
  const getTimeAgo = (date) => {
    const now = moment();
    const then = moment.utc(date).local();
    const diff = now.diff(then);
    const duration = moment.duration(diff);

    const years = Math.floor(duration.asYears());
    const months = Math.floor(duration.asMonths());
    const weeks = Math.floor(duration.asWeeks());
    const days = Math.floor(duration.asDays());
    const hours = Math.floor(duration.asHours());
    const minutes = Math.floor(duration.asMinutes());

    if (years >= 1) {
      return years === 1 ? t('topContent.timeAgo.yearAgo') : t('topContent.timeAgo.yearsAgo', { count: years });
    } else if (months >= 1) {
      return months === 1 ? t('topContent.timeAgo.monthAgo') : t('topContent.timeAgo.monthsAgo', { count: months });
    } else if (weeks >= 1) {
      return weeks === 1 ? t('topContent.timeAgo.weekAgo') : t('topContent.timeAgo.weeksAgo', { count: weeks });
    } else if (days >= 1) {
      return days === 1 ? t('topContent.timeAgo.dayAgo') : t('topContent.timeAgo.daysAgo', { count: days });
    } else if (hours >= 1) {
      return hours === 1 ? t('topContent.timeAgo.hourAgo') : t('topContent.timeAgo.hoursAgo', { count: hours });
    } else if (minutes >= 1) {
      return minutes === 1 ? t('topContent.timeAgo.minuteAgo') : t('topContent.timeAgo.minutesAgo', { count: minutes });
    } else {
      return t('topContent.timeAgo.justNow');
    }
  };

  const topContent = allArticles ? allArticles.slice(0, 6).map((article, index) => {
    return {
      id: article.Id,
      title: article.Title,
      date: getTimeAgo(article.Created), // Use custom time ago function
      category: article.Category,
      tags: article.Tags ? JSON.parse(article.Tags) : [],
      views: article.ArticleViews || 0,
      ratings: article.ArticleRating || 0,
      slug: article.ArticleSlug,
      color: `bg-green-${Math.min(index + 1, 9)}00` // Ensure valid Tailwind class
    };
  }) : [];

  const formatViews = (views) => {
    if (views >= 1000000) {
      return `${(views / 1000000).toFixed(1)}M`;
    }
    if (views >= 1000) {
      return `${(views / 1000).toFixed(1)}k`;
    }
    return views.toString();
  };

  const renderStars = (rating) => {
    if (!rating || rating === 0) return null;

    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;

    return (
      <div className="flex items-center gap-0.5">
        {[...Array(fullStars)].map((_, i) => (
          <svg key={i} className="w-3 h-3 text-yellow-400 fill-current" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
        {hasHalfStar && (
          <svg className="w-3 h-3 text-yellow-400" viewBox="0 0 20 20">
            <defs>
              <linearGradient id="half-star">
                <stop offset="50%" stopColor="currentColor" />
                <stop offset="50%" stopColor="transparent" />
              </linearGradient>
            </defs>
            <path fill="url(#half-star)" d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        )}
      </div>
    );
  };

  // Loading skeleton component
  const LoadingSkeleton = () => (
    <div className="space-y-1">
      {[...Array(6)].map((_, index) => (
        <div key={index} className="relative flex items-start p-4 rounded-xl">
          <div className="relative flex-shrink-0 mt-2 mr-4">
            <div className="w-3 h-3 rounded-full bg-gray-200 animate-pulse"></div>
          </div>
          <div className="flex-1 min-w-0 space-y-2">
            <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4"></div>
            <div className="flex items-center gap-4">
              <div className="h-3 bg-gray-200 rounded animate-pulse w-16"></div>
              <div className="h-3 bg-gray-200 rounded animate-pulse w-20"></div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-md border border-gray-100/50 transition-all duration-300">
      {/* Enhanced Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-1 h-5 rounded-full bg-gradient-to-t from-blue-300 to-pink-300"></div>
          </div>
          <h2 className="text-xl font-bold text-gray-900 tracking-tight">
            {t('topContent.title')}
          </h2>
        </div>

        <NavLink
          to={'/home/content-management/articles'}
          className="group flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 rounded-xl transition-all duration-200 hover:scale-105 hover:bg-gray-50"
        >
          {t('topContent.viewAll')}
          <ChevronDown className="w-4 h-4 transition-transform group-hover:translate-y-0.5" />
        </NavLink>
      </div>

      {/* Content List */}
      <div className="relative">
        {loading ? (
          <LoadingSkeleton />
        ) : topContent.length > 0 ? (
          <div className="space-y-1">
            {topContent.map((content, index) => (
              <NavLink
                key={content.id}
                to={`/home/articles/${content.slug}`}
                className="group relative block"
              >
                <div className="relative flex items-start p-4 rounded-xl hover:bg-gray-50/70 transition-all duration-200 cursor-pointer">
                  {/* Enhanced Connecting Line */}
                  {index < topContent.length - 1 && (
                    <div className="absolute left-6 top-12 w-0.5 h-8 bg-gradient-to-b from-gray-300 to-transparent"></div>
                  )}

                  {/* Enhanced Dot with Glow Effect */}
                  <div className="relative flex-shrink-0 mt-2 mr-4">
                    <div className={`w-3 h-3 rounded-full ${content.color} shadow-sm`}></div>
                    <div className="absolute inset-0 w-3 h-3 rounded-full bg-gradient-to-r from-blue-400 to-blue-400 opacity-30 animate-pulse"></div>
                    <div className="absolute -inset-1 w-5 h-5 rounded-full bg-gradient-to-r from-blue-400/20 to-blue-400/20 group-hover:animate-ping"></div>
                  </div>

                  {/* Enhanced Content */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="text-sm font-semibold text-gray-900 leading-relaxed group-hover:text-gray-600 transition-colors line-clamp-2">
                        {content.title}
                      </h3>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <div className="flex items-center gap-1">
                        <Eye className="w-3 h-3" />
                        <span className="font-medium">{formatViews(content.views)}</span>
                        <span className="text-gray-400">{t('topContent.metrics.views')}</span>
                      </div>
                      <span>•</span>
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>{content.date}</span>
                      </div>
                      {content.ratings > 0 && (
                        <>
                          <span>•</span>
                          {renderStars(content.ratings)}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </NavLink>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="w-12 h-12 mx-auto mb-3 text-gray-300">
              <Clock className="w-full h-full" />
            </div>
            <p className="text-gray-500 text-sm">
              {t('topContent.noContent')}
            </p>
          </div>
        )}
      </div>

      {/* Footer Stats */}
      {!loading && topContent.length > 0 && (
        <div className="mt-6 pt-4 border-t border-gray-100">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>{t('topContent.metrics.totalArticles')}: {topContent.length}</span>

          </div>
        </div>
      )}
    </div>
  );
};

export default TopContent;
