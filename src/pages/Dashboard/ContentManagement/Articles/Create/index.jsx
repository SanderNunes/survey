import EditorContainer from '@/components/EditorContainer';
import React, { useState, useEffect } from 'react';
import {
  Save,
  Eye,
  Edit3,
  Image,
  Tag,
  Clock,
  Star,
  TrendingUp,
  Calendar,
  BarChart3,
  X,
  Plus,
  AlertCircle,
  CheckCircle,
  Edit,
  ArrowLeft,
  EyeIcon,
  TableOfContents,
  ViewIcon,
  TelescopeIcon
} from 'lucide-react';
import { createSlug } from '@/utils/constants';
import { useSharePoint } from '@/hooks/useSharePoint';
import { NavLink, useNavigate, useParams } from 'react-router-dom';
import { Button, Chip } from '@material-tailwind/react';
import ErrorBoundary from '@/components/UI/ErrorBoundary';
import { Toaster } from 'react-hot-toast';
import DashboardLayout from '@/layouts/Dashboard';
import { useTranslation } from 'react-i18next'; // Add this import
import { useAuth } from '@/hooks/useAuth';
import CSSTooltip from '@/components/CSSTooltip';

const CreateArticlePage = ({ articleId, onSave, onCancel, view = 'save' }) => {
  const { t } = useTranslation(); // Add this hook
  const [isEditing, setIsEditing] = useState(view === 'save');
  const [loading, setSaving] = useState(false);
  const [contentMode, setContentMode] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null); // 'success', 'error', null
  const [errors, setErrors] = useState({});
  const { AddArticle, article, getArticle, updateArticleMetadata, logAuditEvent } = useSharePoint();
  const { userProfile } = useAuth();
  const { slug } = useParams();
  const navigate = useNavigate()

  const [formData, setFormData] = useState({
    title: '',
    summary: '',
    coverImage: '',
    category: '',
    type: '',
    level: '',
    tags: [],
    readTime: 0,
    publishedAt: '',
    updatedAt: '',
    slug: '',
    metrics: {
      views: 0,
      rating: 0
    },
    featured: false,
    trending: false
  });

  // Get translated options
  const getCategoryOptions = () => [
    t('createArticle.categories.customerExperience')
  ];

  const getTypeOptions = () => [
    t('createArticle.types.tutorial'),
    t('createArticle.types.guide'),
    t('createArticle.types.news'),
    t('createArticle.types.review'),
    t('createArticle.types.opinion'),
    t('createArticle.types.caseStudy'),
    t('createArticle.types.bestPractice'),
    t('createArticle.types.framework'),
    t('createArticle.types.template')
  ];

  const getLevelOptions = () => [
    t('createArticle.levels.beginner'),
    t('createArticle.levels.intermediate'),
    t('createArticle.levels.advanced'),
    t('createArticle.levels.expert')
  ];

  const fetchArticle = async () => {
    try {
      await getArticle({ slug });
    } catch (err) {
      console.error(t('createArticle.messages.fetchError', { error: err.message }));
    }
  };

  useEffect(() => {
    if (slug) {
      fetchArticle();
    }
  }, [getArticle, slug]);

  useEffect(() => {
    const tag = article?.Tags ? JSON.parse(article?.Tags) || [] : [];
    const at =   article?.ArticleContent ? JSON.parse(article?.ArticleContent) : article?.ArticleContent
    const att =   at?.content?.find(cnt => cnt.type == "ArticleHeader")

    setFormData({
      title: article?.Title || '',
      summary: article?.Summary || '',
      coverImage: att?.props?.coverImage || '',
      category: article?.Category || '',
      type: article?.ArticleType || '',
      level: article?.ArticleLevel || '',
      tags: tag,
      readTime: article?.ReadTime || 0,
      publishedAt: article?.Created || '',
      updatedAt: article?.Modified || '',
      slug: article?.ArticleSlug || '',
      metrics: {
        views: article?.ArticleViews || 0,
        rating: article?.ArticleRating || 0
      },
      featured: article?.Featured || false,
      trending: article?.Trending || false
    });
  }, [article]);

  const handleInputChange = (field, value) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: null
      }));
    }
  };

  const handleTagAdd = (newTag) => {
    if (newTag && !formData.tags.includes(newTag)) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag]
      }));
    }
  };

  const handleTagRemove = (tagToRemove) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };
  const handleFeature = async () => {
    await updateArticleMetadata(article.Id, { Featured: true });
    await logAuditEvent({
      title: `modified status to published of article ${article.Title}`,
      userEmail: userProfile?.mail,
      userName: userProfile?.displayName,
      actionType: "Modify",
      details: `User updated status to published in article "${article.Title}".`,
    });
    if (slug) {
      fetchArticle();
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.title.trim()) newErrors.title = t('createArticle.validation.titleRequired');
    if (!formData.summary.trim()) newErrors.summary = t('createArticle.validation.summaryRequired');
    if (!formData.category) newErrors.category = t('createArticle.validation.categoryRequired');
    if (!formData.type) newErrors.type = t('createArticle.validation.typeRequired');
    if (!formData.level) newErrors.level = t('createArticle.validation.levelRequired');
    if (!formData.slug.trim()) newErrors.slug = t('createArticle.validation.slugRequired');

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setSaving(true);
    setSaveStatus(null);

    try {
      if (slug) {
        // Edit article
        const data = {
          Title: formData.title,
          Summary: formData.summary,
          CoverImageURL: formData.coverImage,
          Category: formData.category,
          ArticleType: formData.type,
          ArticleLevel: formData.level,
          Tags: JSON.stringify(formData.tags),
          ArticleSlug: formData.slug,
          ReadTime: formData.readTime
        };


        await updateArticleMetadata(article.Id, data);
        setSaveStatus('success');
        await logAuditEvent({
          title: `modified article ${formData.title}`,
          userEmail: userProfile?.mail,
          userName: userProfile?.displayName,
          actionType: "Modify",
          details: `User updated fields in article "${formData.title}".`,
        });

        // You could show a toast notification here

      } else {
        // Add article
        await AddArticle(formData);
        setSaveStatus('success');
        await logAuditEvent({
          title: `created article ${formData.title}`,
          userEmail: userProfile?.mail,
          userName: userProfile?.displayName,
          actionType: "Create",
          details: `User created a new article titled "${formData.title}".`,
        });

      }

      setIsEditing(false);
    } catch (error) {
      setSaveStatus('error');
      console.error(t('createArticle.messages.saveError', { error: error.message }));
    } finally {
      setSaving(false);
      navigate(`/home/content-management/articles/view/${formData.slug}`)
    }
  };

  const TagInput = () => {
    const [newTag, setNewTag] = useState('');

    const handleSubmit = (e) => {
      e.preventDefault();
      if (newTag.trim()) {
        handleTagAdd(newTag.trim());
        setNewTag('');
      }
    };

    return (
      <div className="space-y-2">
        <div className="flex flex-wrap gap-2 mb-2">
          {formData.tags?.length > 0 ? formData.tags?.map((tag, index) => (
            <span
              key={index}
              className="inline-flex items-center px-3 py-1 rounded-full text-sm text-primary-800"
            >
              {tag}
              {isEditing && (
                <button
                  type="button"
                  onClick={() => handleTagRemove(tag)}
                  className="ml-2 text-primary-600 hover:text-primary-800"
                  aria-label={`Remove tag ${tag}`}
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </span>
          )) : null}
        </div>
        {isEditing && (
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              type="text"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              placeholder={t('createArticle.fields.tagsPlaceholder')}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:border-transparent"
            />
            <button
              type="submit"
              className="px-3 py-2 text-primary rounded-md hover:bg-secondary transition-colors"
              aria-label="Add tag"
            >
              <Plus className="w-4 h-4" />
            </button>
          </form>
        )}
      </div>
    );
  };

  if (contentMode) {
    return (
      <ErrorBoundary>
        <div className="min-h-screen bg-gray-50">
          <EditorContainer initialConfig="full" data={article} setContentMode={setContentMode} />
          <Toaster position="top-right" />
        </div>
      </ErrorBoundary>
    );
  }




  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto p-6 bg-white">
        {/* Header */}
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-800">
            {/* {(isEditing && slug) ? t('createArticle.titles.edit') : t('createArticle.titles.create')} */}
            {(isEditing && slug) ? t('createArticle.titles.edit') : ''}
          </h2>
          <div className='flex gap-2'>
            <>
              <CSSTooltip text={t('navigation.goBack')} position="top">
                <NavLink
                  to={'/home/content-management/articles'}
                  className="flex justify-center items-center gap-3 text-white w-11 h-11 hover:bg-alternative-300 bg-alternative-400 px-3 py-2 rounded-full whitespace-nowrap"
                  aria-label={t('navigation.backToArticles')}
                >
                  <ArrowLeft strokeWidth={2} className="h-5 w-5" />
                </NavLink>
              </CSSTooltip>

              {slug && (
                <>
                  <CSSTooltip text={t('navigation.edit')} position="top">
                    <Button
                      variant='ghost'
                      onClick={() => setIsEditing(!isEditing)}
                      className={`flex justify-center items-center gap-3 w-11 h-11 ${isEditing ? 'text-white hover:bg-alternative-300 bg-alternative-400' : 'text-white hover:bg-alternative-300 bg-alternative-400'} px-3 py-2 rounded-full whitespace-nowrap`}
                      aria-label={isEditing ? t('navigation.switchToViewMode') : t('navigation.switchToEditMode')}
                    >
                      {isEditing ? <EyeIcon className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}
                    </Button>
                  </CSSTooltip>

                  <CSSTooltip text={t('navigation.view')} position="top">
                    <NavLink
                      to={`/home/articles/${slug}`}
                      className={`flex justify-center items-center gap-3 w-11 h-11 ${isEditing ? 'text-white hover:bg-alternative-300 bg-alternative-400' : 'text-white hover:bg-alternative-300 bg-alternative-400'} px-3 py-2 rounded-full whitespace-nowrap`}
                      aria-label={isEditing ? t('navigation.switchToViewMode') : t('navigation.switchToEditMode')}
                    >
                      <ViewIcon className="w-4 h-4" />
                    </NavLink>
                  </CSSTooltip>

                  <CSSTooltip text={t('navigation.feature')} position="top">
                    <Button
                      variant='ghost'
                      onClick={handleFeature}
                      className={`flex justify-center items-center gap-3 w-11 h-11 ${isEditing ? 'text-white hover:bg-alternative-300 bg-alternative-400' : 'text-white hover:bg-alternative-300 bg-alternative-400'} px-3 py-2 rounded-full whitespace-nowrap`}
                      aria-label={isEditing ? t('navigation.switchToViewMode') : t('navigation.switchToEditMode')}
                    >
                      <TelescopeIcon className="w-4 h-4" />
                    </Button>
                  </CSSTooltip>
                </>
              )}
            </>
          </div>
        </div>

        {/* Main Content */}
        <div className="space-y-8">
          {/* Basic Information */}
          <div className="rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">
              {t('createArticle.sections.basicInfo')}
            </h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Title */}
              <div className="lg:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('createArticle.fields.titleRequired')}
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => {
                      handleInputChange('title', e.target.value);
                      handleInputChange('slug', createSlug(e.target.value));
                    }}
                    className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:border-transparent ${errors.title ? 'border-red-300' : 'border-gray-300'}`}
                    placeholder={t('createArticle.fields.titlePlaceholder')}
                  />
                ) : (
                  <p className="text-gray-900 font-medium">{formData.title}</p>
                )}
                {errors.title && <p className="text-red-600 text-sm mt-1">{errors.title}</p>}
              </div>

              {/* Summary */}
              <div className="lg:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('createArticle.fields.summaryRequired')}
                </label>
                {isEditing ? (
                  <textarea
                    value={formData.summary}
                    onChange={(e) => handleInputChange('summary', e.target.value)}
                    rows={4}
                    className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:border-transparent ${errors.summary ? 'border-red-300' : 'border-gray-300'}`}
                    placeholder={t('createArticle.fields.summaryPlaceholder')}
                  />
                ) : (
                  <p className="text-gray-700">{formData.summary}</p>
                )}
                {errors.summary && <p className="text-red-600 text-sm mt-1">{errors.summary}</p>}
              </div>

              {/* Slug */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('createArticle.fields.slugRequired')}
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.slug}
                    readOnly
                    className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:border-transparent ${errors.slug ? 'border-red-300' : 'border-gray-300'}`}
                    placeholder={t('createArticle.fields.slugPlaceholder')}
                  />
                ) : (
                  <p className="text-gray-900 font-mono px-3 py-2 rounded">
                    {formData.slug}
                  </p>
                )}
                {errors.slug && <p className="text-red-600 text-sm mt-1">{errors.slug}</p>}
              </div>

              {/* Cover Image */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Image className="w-4 h-4 inline mr-1" />
                  {t('createArticle.fields.coverImageRequired')}
                </label>
                {isEditing ? (
                  <input
                    type="url"
                    value={formData.coverImage}
                    readOnly
                    onChange={(e) => handleInputChange('coverImage', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:border-transparent"
                    placeholder={t('createArticle.fields.coverImagePlaceholder')}
                  />
                ) : (
                  <div className="space-y-2">
                    <p className="text-gray-700 text-sm break-all">{formData.coverImage}</p>
                    {formData.coverImage && (
                      <img
                        src={`https://africellcloud.sharepoint.com/${formData.coverImage}`}
                        alt="Cover"
                        className="w-32 h-20 object-cover rounded border"
                      />
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Classification */}
          <div className="rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">
              {t('createArticle.sections.classification')}
            </h2>

            <div className={`grid grid-cols-1 ${!isEditing ? 'md:grid-cols-4' : 'md:grid-cols-3'} gap-6`}>
              {!isEditing ? (
                <>
                  {/* Category */}
                  <div className='flex items-center'>
                    <Chip className='text-primary-600 font-normal bg-primary-200 border-none'>
                      <Chip.Label>{formData?.featured ? t('createArticle.fields.featured') : t('createArticle.fields.notFeatured')}</Chip.Label>
                    </Chip>

                  </div>
                </>)
                : null}
              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('createArticle.fields.categoryRequired')}
                </label>
                {isEditing ? (
                  <select
                    value={formData.category}
                    onChange={(e) => handleInputChange('category', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:border-transparent ${errors.category ? 'border-red-300' : 'border-gray-300'}`}
                  >
                    <option value="">{t('createArticle.fields.categoryPlaceholder')}</option>
                    {getCategoryOptions().map((option, index) => (
                      <option key={index} value={option}>{option}</option>
                    ))}
                  </select>
                ) : (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-purple-100 text-purple-800">
                    {formData.category}
                  </span>
                )}
                {errors.category && <p className="text-red-600 text-sm mt-1">{errors.category}</p>}
              </div>

              {/* Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('createArticle.fields.typeRequired')}
                </label>
                {isEditing ? (
                  <select
                    value={formData.type}
                    onChange={(e) => handleInputChange('type', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:border-transparent ${errors.type ? 'border-red-300' : 'border-gray-300'}`}
                  >
                    <option value="">{t('createArticle.fields.typePlaceholder')}</option>
                    {getTypeOptions().map((option, index) => (
                      <option key={index} value={option}>{option}</option>
                    ))}
                  </select>
                ) : (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-green-100 text-green-800">
                    {formData.type}
                  </span>
                )}
                {errors.type && <p className="text-red-600 text-sm mt-1">{errors.type}</p>}
              </div>

              {/* Level */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('createArticle.fields.levelRequired')}
                </label>
                {isEditing ? (
                  <select
                    value={formData.level}
                    onChange={(e) => handleInputChange('level', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:border-transparent ${errors.level ? 'border-red-300' : 'border-gray-300'}`}
                  >
                    <option value="">{t('createArticle.fields.levelPlaceholder')}</option>
                    {getLevelOptions().map((option, index) => (
                      <option key={index} value={option}>{option}</option>
                    ))}
                  </select>
                ) : (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-orange-100 text-orange-800">
                    {formData.level}
                  </span>
                )}
                {errors.level && <p className="text-red-600 text-sm mt-1">{errors.level}</p>}
              </div>
            </div>

            {/* Tags */}
            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Tag className="w-4 h-4 inline mr-1" />
                {t('createArticle.fields.tags')}
              </label>
              <TagInput />
            </div>

            {/* Read Time */}
            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Clock className="w-4 h-4 inline mr-1" />
                {t('createArticle.fields.readTime')}
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={formData.readTime}
                  onChange={(e) => handleInputChange('readTime', e.target.value)}
                  className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:border-transparent"
                  placeholder={t('createArticle.fields.readTimePlaceholder')}
                />
              ) : (
                <p className="text-gray-700">{formData.readTime}</p>
              )}
            </div>
          </div>
        </div>

        <div className="flex w-full">
          <div className='w-full'>
            {isEditing ? (
              <Button
                variant='ghost'
                onClick={handleSave}
                disabled={loading}
                className="flex justify-center items-center gap-3 text-primary py-2 rounded-md whitespace-nowrap w-full disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {loading ? (
                  slug ? t('createArticle.buttons.updating') : t('createArticle.buttons.saving')
                ) : (
                  slug ? t('createArticle.buttons.update') : t('createArticle.buttons.save')
                )}
              </Button>
            ) : (
              <Button
                variant='ghost'
                onClick={() => setContentMode(true)}
                className="flex justify-center items-center gap-3 text-primary py-2 rounded-md whitespace-nowrap w-full"
              >
                <TableOfContents className="w-4 h-4" />
                {t('createArticle.buttons.contentEditor')}
              </Button>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default CreateArticlePage;
