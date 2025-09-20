import ActivityFeed from '@/components/ActivityFeed';
import { MetricCard } from '@/components/MetricCard';
import QuickLinks from '@/components/QuickLinks';
import TopContent from '@/components/TopContents';
import { useSharePoint } from '@/hooks/useSharePoint';
import DashboardLayout from '@/layouts/Dashboard';
import { Card, Typography } from '@material-tailwind/react';
import { Eye } from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next'; // Add this import

export default function Analytics() {
  const { t } = useTranslation(); // Add this hook
  const { allArticles, getAllArticles, getCourses } = useSharePoint();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [previousMetrics, setPreviousMetrics] = useState({
    articles: 0,
    courses: 0,
    views: 0,
    engagement: 0
  });

  // Calculate metrics with percentage changes
  const calculateMetrics = useCallback(() => {
    const currentArticles = allArticles.length || 0;
    const currentCourses = courses.length || 0;

    // Calculate recent activity (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentArticles = allArticles.filter(article =>
      article.created_at && new Date(article.created_at) > thirtyDaysAgo
    ).length;

    const recentCourses = courses.filter(course =>
      course.created_at && new Date(course.created_at) > thirtyDaysAgo
    ).length;

    // Calculate total views from articles (assuming articles have a 'views' property)
    const totalViews = allArticles.reduce((sum, article) => sum + (article.views || 0), 0);

    // Calculate monthly growth rate for articles
    const monthlyGrowthRate = currentArticles > 0 ? ((recentArticles / currentArticles) * 100).toFixed(1) : 0;

    // Calculate percentage changes based on previous metrics
    const articlesChange = previousMetrics.articles > 0
      ? (((currentArticles - previousMetrics.articles) / previousMetrics.articles) * 100).toFixed(1)
      : recentArticles > 0 ? monthlyGrowthRate : 0;

    const coursesChange = previousMetrics.courses > 0
      ? (((currentCourses - previousMetrics.courses) / previousMetrics.courses) * 100).toFixed(1)
      : recentCourses > 0 ? ((recentCourses / currentCourses) * 100).toFixed(1) : 0;

    const viewsChange = previousMetrics.views > 0
      ? (((totalViews - previousMetrics.views) / previousMetrics.views) * 100).toFixed(1)
      : totalViews > 0 ? '15.0' : 0; // Default growth estimate for new data

    // Calculate content freshness (percentage of recent content)
    const contentFreshness = currentArticles > 0 ? ((recentArticles / currentArticles) * 100).toFixed(1) : 0;

    return {
      currentArticles,
      currentCourses,
      totalViews,
      recentArticles,
      contentFreshness,
      monthlyGrowthRate,
      articlesChange: articlesChange >= 0 ? `+${articlesChange}` : articlesChange,
      coursesChange: coursesChange >= 0 ? `+${coursesChange}` : coursesChange,
      viewsChange: viewsChange >= 0 ? `+${viewsChange}` : viewsChange,
      freshnessChange: contentFreshness >= 20 ? `+${contentFreshness}` : contentFreshness
    };
  }, [allArticles, courses, previousMetrics]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null); // Clear previous errors
      const items = await getCourses();
      await getAllArticles();
      setCourses(items);
    } catch (err) {
      console.error("Failed to fetch courses:", err);
      setError(t('analytics.errors.failedToFetch')); // Use translated error message
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [getCourses, getAllArticles]);

  // Load previous metrics from localStorage on component mount
  useEffect(() => {
    const savedMetrics = localStorage.getItem('dashboardMetrics');
    if (savedMetrics) {
      setPreviousMetrics(JSON.parse(savedMetrics));
    }
  }, []);

  // Save current metrics for next comparison
  useEffect(() => {
    if (allArticles.length > 0 || courses.length > 0) {
      const currentMetrics = {
        articles: allArticles.length,
        courses: courses.length,
        views: allArticles.reduce((sum, article) => sum + (article.views || 0), 0),
        timestamp: new Date().toISOString()
      };

      // Save metrics after a delay to allow for comparison
      const timer = setTimeout(() => {
        localStorage.setItem('dashboardMetrics', JSON.stringify(currentMetrics));
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [allArticles, courses]);

  const metrics = calculateMetrics();

  // Error state
  if (error) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Card className="p-6 text-center">
            <Typography variant="h6" color="red" className="mb-2">
              {t('analytics.errors.loadingError')}
            </Typography>
            <Typography variant="small" color="gray">
              {error}
            </Typography>
            <button
              onClick={fetchData}
              className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              {t('common.retry', 'Retry')}
            </button>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className='h-full flex flex-col'>
        {/* Metrics Grid - Responsive */}
        <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8'>
          <MetricCard
            title={t('analytics.metrics.totalArticles')}
            value={metrics.currentArticles}
            percentage={`${metrics.articlesChange}%`}
            isLoading={loading}
            color={'blue'}
          />
          <MetricCard
            title={t('analytics.metrics.totalCourses')}
            value={metrics.currentCourses}
            percentage={`${metrics.coursesChange}%`}
            isLoading={loading}
            color={'red'}
          />
          <MetricCard
            title={t('analytics.metrics.recentArticles')}
            value={metrics.recentArticles}
            percentage={`${metrics.monthlyGrowthRate}%`}
            subtitle={t('analytics.metrics.last30Days')}
            isLoading={loading}
            color={'orange'}
          />
          <MetricCard
            title={t('analytics.metrics.contentFreshness')}
            value={`${metrics.contentFreshness}%`}
            percentage={`${metrics.freshnessChange}%`}
            subtitle={t('analytics.metrics.recentContentRatio')}
            isLoading={loading}
            color={'green'}
          />
        </div>

        {/* Dashboard Components Grid - Responsive */}
        <div className='grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-3 gap-4 lg:gap-2 h-full'>
          {/* Mobile/Tablet: Stack vertically, Desktop: 3 columns */}
          <div className='lg:col-span-1'>
            <ActivityFeed />
          </div>
          <div className='lg:col-span-1'>
            <TopContent />
          </div>
          <div className='lg:col-span-1'>
            <QuickLinks />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
