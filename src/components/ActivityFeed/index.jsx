import React, { useEffect, useState } from 'react';
import FallBackAvatar from '../FallBackAvatar';
import { useSharePoint } from '@/hooks/useSharePoint';
import { useAuth } from '@/hooks/useAuth';
import { getActionColor, getActionIcon } from '@/utils/auditUtils';
import { useAuditLogs } from '@/hooks/useAuditLogs';
import { ChevronDown, Activity, Clock } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next'; // Add this import


const getActivityIcon = (type) => {
  const iconMap = {
    create: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
      </svg>
    ),
    complete: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    ),
    comment: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    ),
    upload: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
      </svg>
    ),
    assign: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    )
  };
  return iconMap[type] || iconMap.create;
};

const ActivityFeed = () => {
  const { t } = useTranslation(); // Add this hook
  const { userProfile } = useAuth();
  const { sp } = useSharePoint();
  const {
    logs,
    loading,
    initializePager
  } = useAuditLogs(sp);

  const [activitiesToShow, setActivitiesToShow] = useState([]);

  useEffect(() => {
    if (sp?.web) {
      initializePager('Activity', 'Past 7 days');
    }
  }, [sp]);

  // Set activities to show based on logs availability
  useEffect(() => {
    if (logs && logs.length > 0) {
      setActivitiesToShow(logs.slice(0, 4));
    }
  }, [logs, loading, t]);



  // Format activity for display
  const formatActivity = (log) => {
    if (log.Title && log.Details) {
      // Real audit log format
      return {
        title: log.Title,
        details: log.Details,
        user: log.UserName,
        actionType: log.ActionType
      };
    } else {
      // Sample activity format
      return {
        title: `${log.user.name} ${log.action}`,
        details: log.content,
        user: log.user.name,
        actionType: log.type
      };
    }
  };

  // Loading skeleton component
  const LoadingSkeleton = () => (
    <div className="space-y-4">
      {[...Array(4)].map((_, index) => (
        <div key={index} className="flex items-start gap-4 p-5">
          <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse flex-shrink-0"></div>
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4"></div>
            <div className="h-3 bg-gray-200 rounded animate-pulse w-full"></div>
            <div className="h-3 bg-gray-200 rounded animate-pulse w-1/3"></div>
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
            <div className="w-1 h-5 rounded-full bg-gradient-to-t from-red-300 to-red-700"></div>
          </div>
          <h2 className="text-xl font-bold text-gray-900 tracking-tight">
            {t('activityFeed.title')}
          </h2>
        </div>

        <NavLink
          to={'/home/system-audit'}
          className="group flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 rounded-xl transition-all duration-200 hover:scale-105 hover:bg-gray-50"
        >
          {t('activityFeed.viewAll')}
          <ChevronDown className="w-4 h-4 transition-transform group-hover:translate-y-0.5" />
        </NavLink>
      </div>

      {/* Activities List */}
      <div className="space-y-2">
        {loading ? (
          <LoadingSkeleton />
        ) : activitiesToShow.length > 0 ? (
          activitiesToShow.map((log, index) => {
            const activity = formatActivity(log);

            return (
              <div
                key={log.id || index}
                className="group p-5 rounded-lg hover:bg-gray-50/70 transition-all duration-200 cursor-pointer"
                style={{
                  animationDelay: `${index * 50}ms`,
                  animation: 'fadeInUp 0.4s ease-out forwards'
                }}
              >
                <div className="flex items-start gap-4">
                  {/* Action Icon */}
                  <div className="flex-shrink-0">
                    <div className={`w-8 h-8 rounded-full ${getActionColor(activity.actionType)} flex items-center justify-center text-white shadow-sm group-hover:scale-105 transition-transform duration-200`}>
                      {getActionIcon(activity.actionType) || getActivityIcon(activity.actionType)}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-gray-900 mb-1 group-hover:text-gray-800 transition-colors line-clamp-2">
                      {activity.title}
                    </h4>
                    <p className="text-sm text-gray-600 leading-relaxed mb-1 line-clamp-2">
                      {activity.details}
                    </p>
                    {activity.user && (
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <span>{t('activityFeed.labels.by')}</span>
                        <span className="font-medium">{activity.user}</span>
                        {log.Created && (
                          <>
                            <span>•</span>
                            <Clock className="w-3 h-3" />
                            <span>{new Date(log.Created).toLocaleDateString()}</span>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          /* Empty state */
          <div className="text-center py-8">
            <div className="w-12 h-12 mx-auto mb-3 text-gray-300">
              <Activity className="w-full h-full" />
            </div>
            <p className="text-gray-500 text-sm">
              {t('activityFeed.labels.noActivities')}
            </p>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
};

export default ActivityFeed;
