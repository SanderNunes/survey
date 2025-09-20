import { Card, Typography } from "@material-tailwind/react"
import { Eye, MoveUpRight, TrendingUpIcon } from "lucide-react"
import { useTranslation } from 'react-i18next'; // Add this import

export function MetricCard({
  title,
  value,
  percentage,
  color,
  subtitle,
  isLoading = false,
  showFromLastMonth = true
}) {
  const { t } = useTranslation(); // Add this hook

  // Loading skeleton
  if (isLoading) {
    return (
      <Card className="h-[11rem] grid grid-cols-1 bg-white/80 backdrop-blur-sm p-3 rounded-2xl shadow-md border border-gray-100/50 transition-all duration-300">
        <Card.Header className="flex flex-row items-end gap-6 space-y-0 pb-2">
          <div className="bg-gray-200 w-16 h-16 flex justify-center items-center rounded-full animate-pulse">
            <TrendingUpIcon className="text-gray-400" />
          </div>
          <div className="flex-1">
            <div className="h-5 bg-gray-200 rounded animate-pulse mb-2"></div>
            <div className="h-8 bg-gray-200 rounded animate-pulse w-20"></div>
          </div>
        </Card.Header>
        <Card.Body>
          <div className="flex justify-between">
            <div className="flex-1">
              <div className="w-16 h-0.5 bg-gray-200 mb-2 animate-pulse"></div>
              <div className="h-3 bg-gray-200 rounded animate-pulse w-24"></div>
            </div>
            <div className="flex items-center justify-center border border-gray-200 rounded-2xl w-12 h-12 animate-pulse">
              <MoveUpRight size={20} className="text-gray-400" />
            </div>
          </div>
        </Card.Body>
      </Card>
    );
  }

  // Determine percentage color based on value
  const getPercentageColor = () => {
    if (!percentage) return 'text-gray-500';
    const numericValue = parseFloat(percentage.replace(/[+%]/g, ''));
    if (numericValue > 0) return 'text-green-600';
    if (numericValue < 0) return 'text-red-600';
    return 'text-gray-500';
  };

  return (
    <Card className="h-[11rem] grid grid-cols-1 bg-white/80 backdrop-blur-sm p-3 rounded-2xl shadow-md border border-gray-100/50 transition-all duration-300 hover:shadow-lg">
      <Card.Header className="flex flex-row items-end gap-6 space-y-0 pb-2">
        <div className={`bg-${color}-100 w-16 h-16 flex justify-center items-center rounded-full text-${color}-600 transition-colors duration-200`}>
          <TrendingUpIcon />
        </div>
        <div className="flex-1">
          <Typography
            type='p'
            className="text-lg font-medium text-gray-700 leading-tight"
          >
            {title}
          </Typography>
          <div className="text-2xl font-bold text-gray-900 mt-1">
            {value || '0'}
          </div>
        </div>
      </Card.Header>
      <Card.Body>
        <div className="flex justify-between items-end">
          <div className="flex-1">
            <div className={`w-16 border border-${color}-300 mb-2`}></div>
            <div className="space-y-1">
              {percentage && (
                <p className={`text-xs font-medium ${getPercentageColor()}`}>
                  {percentage}% {showFromLastMonth && t('analytics.metrics.fromLastMonth')}
                </p>
              )}
              {subtitle && (
                <p className="text-xs text-gray-500">
                  {subtitle}
                </p>
              )}
            </div>
          </div>
          <div className={`flex items-center justify-center border border-primary-500 rounded-2xl w-12 h-12 text-primary-500 hover:bg-primary-50 transition-colors duration-200 cursor-pointer`}>
            <MoveUpRight size={20} />
          </div>
        </div>
      </Card.Body>
    </Card>
  )
}
