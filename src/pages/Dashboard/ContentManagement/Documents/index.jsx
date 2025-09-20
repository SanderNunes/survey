import { useSharePoint } from '@/hooks/useSharePoint';
import DashboardLayout from '@/layouts/Dashboard';
import { Button, Chip, Typography, Input } from '@material-tailwind/react';
import {
  Archive,
  FileIcon,
  FileSpreadsheet,
  FileText,
  Image,
  MoreHorizontal,
  Presentation,
  Search,
  ChevronRight,
  ChevronDown,
  Grid3X3,
  List,
  ArrowLeft,
  Home,
  Filter
} from 'lucide-react';
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import FolderIcon from '@/assets/FolderIcon.svg?react';
import PPTIcon from '@/assets/PPTIcon.svg?react';
import DocIcon from '@/assets/DocIcon.svg?react';
import PDFIcon from '@/assets/PDFIcon.svg?react';
import ImageIcon from '@/assets/ImageIcon.svg?react';
import ExcelIcon from '@/assets/ExcelIcon.svg?react';
import UploadFile from '@/components/uploadFile';
import { useTranslation } from 'react-i18next'; // Add this import

const SHAREPOINT_URL = import.meta.env.VITE_APP_Knowledge_Base_SITE_TENANT;

export default function DocumentManagementPage() {
  const { t, i18n } = useTranslation(); // Add this hook
  const { getFiles, files } = useSharePoint();
  const [selected, setSelected] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [showSearch, setShowSearch] = useState(false);

  // Get localized date formatting
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';

    const locale = i18n.language.startsWith('pt') ? 'pt-BR' : 'en-US';
    const date = new Date(dateString);

    return date.toLocaleDateString(locale, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  useEffect(() => {
    fetchFiles();
  }, [getFiles]);

  const fetchFiles = async () => {
    await getFiles();
  };


  // Group files by FileCategory with translated category names
  const categorizedFiles = useMemo(() => {
    const categories = {};
    files.forEach(file => {
      let category = file.FileCategory || t('documents.categories.uncategorized');

      // Translate common category names if needed
      if (category === 'Uncategorized') {
        category = t('documents.categories.uncategorized');
      }

      if (!categories[category]) {
        categories[category] = [];
      }
      categories[category].push(file);
    });

    return categories;
  }, [files, t]);

  // Get unique categories for navigation
  const categories = useMemo(() => {
    return Object.keys(categorizedFiles).sort();
  }, [categorizedFiles]);

  // Filter files based on search query and selected category
  const filteredFiles = useMemo(() => {
    let filesToShow = [];

    if (selectedCategory) {
      filesToShow = categorizedFiles[selectedCategory] || [];
    } else {
      filesToShow = files;
    }

    if (searchQuery.trim()) {
      filesToShow = filesToShow.filter(file =>
        file.Name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (file.FileCategory && file.FileCategory.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    return filesToShow;
  }, [files, categorizedFiles, selectedCategory, searchQuery]);

  const getFileIcon = (type, viewMode = 'grid') => {
    const iconSize = viewMode === 'list' ? 'w-4 h-4' : 'w-10 h-10';

    switch (type?.toLowerCase()) {
      case 'docx':
      case 'doc':
        return <DocIcon width={viewMode === 'list' ? 16 : 40} height={viewMode === 'list' ? 16 : 40} className="text-gray-700" />;
      case 'xlsx':
      case 'xls':
        return <ExcelIcon className={`${iconSize} text-green-600`} />;
      case 'pptx':
      case 'ppt':
        return <PPTIcon className={`${iconSize} text-orange-600`} />;
      case 'png':
      case 'jpg':
      case 'jpeg':
      case 'gif':
      case 'bmp':
        return <ImageIcon className={`${iconSize} text-purple-600`} />;
      case 'pdf':
        return <PDFIcon className={`${iconSize} text-red-600`} />;
      default:
        return <FileIcon className={`${iconSize} text-gray-600`} />;
    }
  };

  const getCategoryIcon = (category, fileCount) => {
    const fileCountText = t('documents.fileCount.single', { count: fileCount });

    return (
      <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200 hover:border-gray-300 cursor-pointer transition-all">
        <div className="flex items-center">
          <FolderIcon className="w-8 h-8 text-yellow-500 mr-3" />
          <div>
            <Typography variant="h6" className="font-semibold text-gray-900">
              {category}
            </Typography>
            <Typography variant="small" className="text-gray-500">
              {fileCountText}
            </Typography>
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-gray-400" />
      </div>
    );
  };

  const FileListItem = ({ file, viewMode, isSelected, onSelect }) => {
    if (viewMode === 'grid') {
      return (
        <div
          className={`relative p-1 rounded-lg cursor-pointer w-40 h-36 border transition-all ${
            isSelected ? 'bg-primary-50 border-primary-200' : 'border-transparent hover:border-gray-200 hover:'
          }`}
          onClick={(e) => {
            if (!isSelected) e.preventDefault();
            onSelect(file.id);
          }}
        >
          <a
            href={isSelected ? `${SHAREPOINT_URL}${file.ServerRelativeUrl}` : '#'}
            target={isSelected ? '_blank' : '_self'}
            rel="noopener noreferrer"
            className="block h-full"
            aria-label={`${t('documents.actions.preview')} ${file.Name}`}
          >
            <div className="flex flex-col items-center text-center h-full">
              <div className="mb-2 p-3 rounded-lg flex-shrink-0">
                {getFileIcon(file.Type, viewMode)}
              </div>
              <div className="text-sm font-normal text-gray-900 text-wrap w-full flex-1 flex items-center justify-center" title={file.Name}>
                {file.Name.replace(/_/g, " ")}
              </div>
            </div>
            <Chip
              variant="ghost"
              size="sm"
              className="absolute top-1 right-1 rounded-full capitalize bg-gray-100 text-gray-600 text-xs"
            >
              {file.FileCategory || t('documents.categories.uncategorized')}
            </Chip>
          </a>
        </div>
      );
    }

    return (
      <div
        className={`flex items-center py-3 px-4 hover:bg-gray-50 cursor-pointer border-b border-gray-100 transition-colors ${
          isSelected ? 'bg-primary-50 border-primary-200' : ''
        }`}
        onClick={() => onSelect(file.id)}
      >
        <div className="flex items-center flex-1 min-w-0">
          <div className="mr-4">
            {getFileIcon(file.Type, viewMode)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-gray-900 truncate" title={file.Name}>
              {file.Name.replace(/_/g, " ")}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {file.FileCategory || t('documents.categories.uncategorized')}
            </div>
          </div>
          <div className="hidden md:block w-24 text-right text-sm text-gray-500">
            {file.Type?.toUpperCase()}
          </div>
          <div className="hidden lg:block w-32 text-right text-sm text-gray-500">
            {formatDate(file.Modified)}
          </div>
          <button
            className="ml-3 p-1 hover:bg-gray-200 rounded transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              // Handle menu action
            }}
            aria-label="More options"
          >
            <MoreHorizontal className="w-4 h-4 text-gray-400" />
          </button>
        </div>
      </div>
    );
  };

  const handleCategorySelect = useCallback((category) => {
    setSelectedCategory(category);
    setSelected(null); // Clear file selection when changing category
  }, []);

  const handleBackToCategories = useCallback(() => {
    setSelectedCategory(null);
    setSelected(null);
    setSearchQuery('');
  }, []);

  const renderBreadcrumb = () => {
    return (
      <div className="flex items-center text-sm text-gray-600 mb-4">
        <button
          onClick={handleBackToCategories}
          className="flex items-center hover:text-primary-600 transition-colors"
          aria-label={t('documents.breadcrumb.allCategories')}
        >
          <Home className="w-4 h-4 mr-1" />
          {t('documents.breadcrumb.allCategories')}
        </button>
        {selectedCategory && (
          <>
            <ChevronRight className="w-3 h-3 mx-2 text-gray-400" />
            <span className="text-gray-900 font-medium capitalize">{selectedCategory}</span>
          </>
        )}
      </div>
    );
  };

  const renderSearchAndFilters = () => {
    const searchPlaceholder = selectedCategory
      ? t('documents.search.placeholderInCategory', { category: selectedCategory })
      : t('documents.search.placeholder');

    return (
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            type="text"
            placeholder={searchPlaceholder}
            className="pl-10 !border-gray-300 focus:!border-none"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            containerProps={{ className: "min-w-0" }}
            aria-label={t('documents.search.placeholder')}
          />
        </div>

        {selectedCategory && (
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-gray-100 rounded-md p-1">
              <button
                className={`p-2 rounded transition-colors ${viewMode === 'grid' ? 'bg-white' : 'hover:bg-gray-200'}`}
                onClick={() => setViewMode('grid')}
                aria-label={t('documents.viewModes.grid')}
                title={t('documents.viewModes.grid')}
              >
                <Grid3X3 className="w-4 h-4" />
              </button>
              <button
                className={`p-2 rounded transition-colors ${viewMode === 'list' ? 'bg-white' : 'hover:bg-gray-200'}`}
                onClick={() => setViewMode('list')}
                aria-label={t('documents.viewModes.list')}
                title={t('documents.viewModes.list')}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderCategoriesView = () => {
    const filteredCategories = categories.filter(category =>
      !searchQuery.trim() ||
      category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      categorizedFiles[category].some(file =>
        file.Name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    );

    return (
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {filteredCategories.map((category) => (
          <div key={category} onClick={() => handleCategorySelect(category)} className='capitalize'>
            {getCategoryIcon(category, categorizedFiles[category].length)}
          </div>
        ))}
      </div>
    );
  };

  const renderFilesView = () => {
    if (filteredFiles.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-12 text-gray-500">
          <FolderIcon className="w-16 h-16 mb-4 text-gray-300" />
          <Typography variant="h6" className="mb-2">
            {searchQuery ? t('documents.emptyState.noFiles') : t('documents.emptyState.noFilesInCategory')}
          </Typography>
          <Typography variant="small" className="text-center">
            {searchQuery
              ? t('documents.emptyState.searchHint')
              : t('documents.emptyState.categoryEmpty')
            }
          </Typography>
        </div>
      );
    }

    if (viewMode === 'grid') {
      return (
        <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {filteredFiles.map((file) => (
            <FileListItem
              key={file.id || file.Name}
              file={file}
              viewMode={viewMode}
              onSelect={setSelected}
              isSelected={selected === file?.id}
            />
          ))}
        </div>
      );
    }

    return (
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {/* List Header */}
        <div className="bg-gray-50 border-b border-gray-200 px-4 py-3">
          <div className="flex items-center text-xs font-medium text-gray-700 uppercase tracking-wider">
            <div className="flex-1">{t('documents.table.headers.name')}</div>
            <div className="hidden md:block w-24 text-right">{t('documents.table.headers.type')}</div>
            <div className="hidden lg:block w-32 text-right">{t('documents.table.headers.modified')}</div>
            <div className="w-8"></div>
          </div>
        </div>

        {/* File List */}
        <div>
          {filteredFiles.map((file) => (
            <FileListItem
              key={file.id || file.Name}
              file={file}
              viewMode={viewMode}
              onSelect={setSelected}
              isSelected={selected === file?.id}
            />
          ))}
        </div>
      </div>
    );
  };

  return (
    <DashboardLayout>
      <div>
        <div className="mb-4 flex flex-col justify-between gap-8 md:flex-row md:items-center">
          <div>
            <Typography type="h6">{t('documents.title')}</Typography>
            <Typography className="mt-1 text-gray-600">
              {t('documents.subtitle')}
            </Typography>
          </div>
          <div className="flex w-full shrink-0 gap-2 md:w-max">
            <UploadFile fetchFiles={fetchFiles} />
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-lg border border-gray-100 p-6">
          {/* Breadcrumb */}
          {renderBreadcrumb()}

          {/* Search and Filters */}
          {renderSearchAndFilters()}

          {/* Content Area */}
          <div className="min-h-[400px]">
            {selectedCategory ? renderFilesView() : renderCategoriesView()}
          </div>

          {/* Stats Footer */}
          <div className="flex justify-between items-center pt-4 mt-6 border-t border-gray-200 text-sm text-gray-600">
            <div>
              {selectedCategory ? (
                <span>
                  {t('documents.stats.filesInCategory', {
                    count: filteredFiles.length,
                    category: selectedCategory
                  })}
                </span>
              ) : (
                <span>
                  {t('documents.stats.categoriesAndFiles', {
                    categoryCount: categories.length,
                    fileCount: files.length
                  })}
                </span>
              )}
            </div>
            {searchQuery && (
              <div>
                <Button
                  variant="text"
                  size="sm"
                  onClick={() => setSearchQuery('')}
                  className="text-primary-600 hover:bg-primary-50"
                >
                  {t('documents.search.clearSearch')}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
