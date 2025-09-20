import React, { useState, useRef, useEffect } from 'react';
import { Upload, X, Image as ImageIcon, CheckCircle, AlertCircle } from 'lucide-react';
import { useSharePoint } from '@/hooks/useSharePoint';
import { useParams } from 'react-router-dom';

export const TitleField = ({
  field,
  onChange,
  value,
}) => {
  const { slug } = useParams()
  const { article, getArticle } = useSharePoint();


  useEffect(() => {
    const fetchArticle = async () => {
      try {
        await getArticle({ slug });
        onChange(article?.Title)
      } catch (err) {
        console.error('Error fetching article:', err);
      }
    };

    if (slug) {
      fetchArticle();
    }
  }, [getArticle, slug, onChange, article]);

  return (
    <div className="space-y-2">
      <label className="flex gap-3 text-sm font-medium text-gray-700">
        {field.label}
        {
          !article ?
            (<div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-500 mb-2"></div>) :
            null
        }
      </label>

      <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-800 text-sm">
        <div className="flex items-center space-x-2">
          <span>{article?.Title}</span>
        </div>
      </div>

      {/* Optional: Show raw date value */}
      <div className="text-xs text-gray-400">
        {value}
      </div>
    </div>
  );
};
