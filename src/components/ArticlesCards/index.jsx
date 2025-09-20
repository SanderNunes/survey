import React from "react";
import { useTranslation } from "react-i18next";

export const ArcticlesCards = ({ category, title, helpfull = 0, link, color, loading }) => {
  const { t } = useTranslation();

  return (
    <div className="max-w-full w-full p-4 bg-white rounded-lg transition-all duration-300 ease-in-out hover:shadow-md hover:-translate-y-1">
      <div
        className="w-10 h-10 rounded-md flex items-center justify-center mb-4"
        style={{ backgroundColor: color }}
      >
        <svg
          className="w-5 h-5 text-white"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-2m3-2a2 2 0 00-2-2h-4a2 2 0 000 4h4a2 2 0 002-2z"
          />
        </svg>
      </div>

      <div className="mb-2">
        <p className="text-sm font-semibold text-gray-800">{category}:</p>
        <p className="text-sm font-semibold text-gray-900 capitalize">{title}</p>
        <p className="text-sm text-gray-500 mt-1">
            {t('home.helpfullarticles', {helpfull})}
        </p>
      </div>

      <div className="w-full bg-gray-200 rounded-full h-1.5 my-4">
        <div className="bg-orange-500 h-1.5 rounded-full" style={{ width: `${(Number(helpfull) / 5) * 100}%` }}></div>
      </div>

      <a
        href={link}
        className="text-accent text-sm font-medium flex items-center gap-1 hover:underline cursor-pointer"
      >
        {t('home.explore')}
        <svg
          className="w-4 h-4 mt-[1px]"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </a>
    </div>

  );
}
export const LoadingArticlesCards = () => {
  return (
    <div className="max-w-full w-full p-4 bg-white rounded-lg animate-pulse">
      <div className="w-10 h-10 bg-gray-200 rounded-md mb-4" />
      <div className="h-4 bg-gray-200 rounded w-1/2 mb-2" />
      <div className="h-4 bg-gray-200 rounded w-full mb-2" />
      <div className="h-3 bg-gray-200 rounded w-3/4 mb-4" />
      <div className="w-full bg-gray-100 rounded-full h-1.5 my-4">
        <div className="bg-gray-300 h-1.5 rounded-full" style={{ width: '50%' }}></div>
      </div>
      <div className="h-4 bg-gray-300 rounded w-1/3" />
    </div>
  );
}
