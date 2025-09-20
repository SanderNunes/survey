import React from 'react';
import { FileText, BarChart, Plus, MessageSquare, Settings, ChevronDown, UploadIcon } from "lucide-react";
import FallBackAvatar from '../FallBackAvatar';
import { NavLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next'; // Add this import

const QuickLinks = () => {
  const { t } = useTranslation(); // Add this hook
  const navigate = useNavigate();

  // Define links with translation keys
  const links = [
    {
      id: 1,
      nameKey: "quickLinks.actions.createCourse",
      to: "/home/content-management/courses/create",
      icon: Plus,
      color: "text-gray-500",
      bgColor: "bg-gray-50",
      descriptionKey: "quickLinks.descriptions.createCourseDesc",
      userKey: "quickLinks.users.quickAction",
      time: ""
    },
    {
      id: 3,
      nameKey: "quickLinks.actions.createArticle",
      to: "/home/content-management/articles/create",
      icon: Plus,
      color: "text-gray-500",
      bgColor: "bg-gray-50",
      descriptionKey: "quickLinks.descriptions.createArticleDesc",
      userKey: "quickLinks.users.contentHub",
      time: ""
    },
    {
      id: 5,
      nameKey: "quickLinks.actions.uploadDocument",
      to: "/home/content-management/documents",
      icon: UploadIcon,
      color: "text-gray-500",
      bgColor: "bg-gray-50",
      descriptionKey: "quickLinks.descriptions.uploadDocumentDesc",
      userKey: "quickLinks.users.system",
      time: " "
    }
  ];

  const handleLinkClick = (to) => {
    // Handle navigation
    navigate(to);
  };

  return (
    <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-md border border-gray-100/50 transition-all duration-300">
      {/* Enhanced Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-1 h-5 rounded-full bg-gradient-to-t from-primary-300 to-pink-300"></div>
          </div>
          <h2 className="text-xl font-bold text-gray-900 tracking-tight">
            {t('quickLinks.title')}
          </h2>
        </div>
      </div>

      <div className="space-y-2">
        {links.map((link, index) => (
          <div
            key={link.id}
            className="group p-5 rounded-lg transition-all duration-200 cursor-pointer hover:bg-gray-50 hover:shadow-sm border border-transparent hover:border-gray-200"
            style={{
              animationDelay: `${index * 50}ms`,
              animation: 'fadeInUp 0.4s ease-out forwards'
            }}
            onClick={() => handleLinkClick(link.to)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleLinkClick(link.to);
              }
            }}
            aria-label={t(link.descriptionKey)}
          >
            <div className="flex items-start gap-4">
              {/* Avatar/Icon */}
              <div className="relative flex-shrink-0">
                <div className={`w-10 h-10 rounded-full ${link.bgColor} flex items-center justify-center group-hover:scale-105 transition-transform duration-200`}>
                  <link.icon className={`w-5 h-5 ${link.color} group-hover:text-gray-700 transition-colors duration-200`} />
                </div>

                {/* Status indicator */}
                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-white rounded-full flex items-center justify-center text-gray-600 shadow-sm border border-gray-200 group-hover:border-gray-300 transition-colors duration-200">
                  <svg className="w-3 h-3 group-hover:translate-x-0.5 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm text-gray-900 leading-relaxed mb-1 group-hover:text-gray-800 transition-colors duration-200">
                      <span className="font-medium">{t(link.nameKey)}</span>
                    </p>

                    {/* Description */}
                    <p className="text-xs text-gray-500 leading-relaxed group-hover:text-gray-600 transition-colors duration-200">
                      {t(link.descriptionKey)}
                    </p>

                    {/* User/Source - Optional display */}
                    {link.userKey && (
                      <p className="text-xs text-gray-400 mt-1">
                        {t(link.userKey)}
                      </p>
                    )}
                  </div>

                  {/* Time/Status */}
                  {link.time && (
                    <p className="text-xs text-gray-500 ml-4 flex-shrink-0">
                      {link.time}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty state if no links */}
      {links.length === 0 && (
        <div className="text-center py-8">
          <div className="w-12 h-12 mx-auto mb-3 text-gray-300">
            <Plus className="w-full h-full" />
          </div>
          <p className="text-gray-500 text-sm">
            {t('quickLinks.noLinksAvailable', 'No quick links available')}
          </p>
        </div>
      )}

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

export default QuickLinks;
