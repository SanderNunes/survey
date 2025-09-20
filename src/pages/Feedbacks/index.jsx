import React, { useState, useEffect, useCallback } from 'react';
import {
  Save,
  Eye,
  Edit3,
  Calendar,
  Clock,
  Users,
  MapPin,
  Bell,
  AlertCircle,
  CheckCircle,
  Edit,
  ArrowLeft,
  EyeIcon,
  ViewIcon,
  X,
  Plus,
  MessageSquare,
  Bug,
  Lightbulb,
  Upload,
  Image as ImageIcon
} from 'lucide-react';
import { useSharePoint } from '@/hooks/useSharePoint';
import { NavLink, useNavigate, useParams } from 'react-router-dom';
import { Button, Chip, Typography } from '@material-tailwind/react';
import ErrorBoundary from '@/components/UI/ErrorBoundary';
import { Toaster } from 'react-hot-toast';
import DashboardLayout from '@/layouts/Dashboard';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import CSSTooltip from '@/components/CSSTooltip';

const FeedbackFormPage = ({ feedbackId, onSave, onCancel, view = 'save' }) => {
  const { t } = useTranslation();
  const [isEditing, setIsEditing] = useState(view === 'save');
  const [loading, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null);
  const [errors, setErrors] = useState({});
  const { createFeedback, updateFeedback, getFeedbackById, logAuditEvent, role } = useSharePoint();
  const { userProfile } = useAuth();
  const { feedbackId: feedbackIdParam } = useParams();
  const navigate = useNavigate();

  // Use either URL param or prop
  const currentFeedbackId = feedbackIdParam || feedbackId;

  const [formData, setFormData] = useState({
    title: '',
    feedbackType: '',
    description: '',
    priority: '',
    status: ''
  });

  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [feedbackData, setFeedbackData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [dataInitialized, setDataInitialized] = useState(false);
  const isAdmin = role === 'admin';

  // Get dropdown options with English values and translated labels
  const getFeedbackTypeOptions = () => [
    { value: 'Bug Report', label: t('feedback.types.bugReport'), icon: Bug },
    { value: 'Feature Request', label: t('feedback.types.featureRequest'), icon: Lightbulb },
    { value: 'General Suggestion', label: t('feedback.types.generalSuggestion'), icon: MessageSquare },
    { value: 'Usability Issue', label: t('feedback.types.usabilityIssue'), icon: Users },
    { value: 'Performance Issue', label: t('feedback.types.performanceIssue'), icon: Clock },
  ];

  const getPriorityOptions = () => [
    { value: 'Low', label: t('feedback.priority.low'), color: 'bg-green-100 text-green-800' },
    { value: 'Medium', label: t('feedback.priority.medium'), color: 'bg-yellow-100 text-yellow-800' },
    { value: 'High', label: t('feedback.priority.high'), color: 'bg-orange-100 text-orange-800' },
    { value: 'Critical', label: t('feedback.priority.critical'), color: 'bg-red-100 text-red-800' },
  ];

  const getStatusOptions = () => [
    { value: 'New', label: t('feedback.status.new'), color: 'bg-blue-100 text-blue-800' },
    { value: 'In Review', label: t('feedback.status.inReview'), color: 'bg-purple-100 text-purple-800' },
    { value: 'In Progress', label: t('feedback.status.inProgress'), color: 'bg-yellow-100 text-yellow-800' },
    { value: 'Resolved', label: t('feedback.status.resolved'), color: 'bg-green-100 text-green-800' },
    { value: 'Closed', label: t('feedback.status.closed'), color: 'bg-gray-100 text-gray-800' },
    { value: "Won't Fix", label: t('feedback.status.wontFix'), color: 'bg-red-100 text-red-800' },
  ];

  // Helper function to get display label and color for a value
  const getDisplayLabel = (options, value) => {
    const option = options.find(opt => opt.value === value);
    return option ? option.label : value;
  };

  const getDisplayColor = (options, value) => {
    const option = options.find(opt => opt.value === value);
    return option?.color || 'bg-gray-100 text-gray-800';
  };

  // Initialize form data from feedback data
  const initializeFormData = useCallback((feedback) => {
    if (!feedback) return;

    console.log('Populating form with feedback data:', feedback);

    const newFormData = {
      title: feedback.Title || '',
      feedbackType: feedback.FeedbackType || '',
      description: feedback.Description || '',
      priority: feedback.Priority || '',
      status: feedback.Status || 'New'
    };

    setFormData(newFormData);
    setDataInitialized(true);

    // Set editing state based on view prop
    if (view === 'edit') {
      setIsEditing(true);
    } else if (view === 'view') {
      setIsEditing(false);
    }
  }, [view]);

  const fetchFeedback = useCallback(async () => {
    if (!currentFeedbackId) {
      setDataInitialized(true);
      return;
    }

    setIsLoading(true);
    setDataInitialized(false);

    try {
      console.log('Fetching feedback with ID:', currentFeedbackId);
      const feedback = await getFeedbackById(currentFeedbackId);
      console.log('Fetched feedback data:', feedback);

      if (feedback) {
        setFeedbackData(feedback);
        initializeFormData(feedback);
      } else {
        console.warn('No feedback data returned');
        setDataInitialized(true);
      }
    } catch (err) {
      console.error('Error fetching feedback:', err);
      console.error(t('feedback.messages.fetchError', { error: err.message }));
      setDataInitialized(true);
    } finally {
      setIsLoading(false);
    }
  }, [currentFeedbackId, getFeedbackById, initializeFormData, t]);

  // Fetch feedback data when component mounts or feedbackId changes
  useEffect(() => {
    fetchFeedback();
  }, [fetchFeedback]);

  // Handle case where feedbackData changes but form isn't initialized yet
  useEffect(() => {
    if (feedbackData && !dataInitialized) {
      initializeFormData(feedbackData);
    }
  }, [feedbackData, dataInitialized, initializeFormData]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: null
      }));
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setErrors(prev => ({ ...prev, image: t('feedback.validation.invalidImageType') }));
        return;
      }

      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        setErrors(prev => ({ ...prev, image: t('feedback.validation.imageTooLarge') }));
        return;
      }

      setSelectedImage(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target.result);
      };
      reader.readAsDataURL(file);

      // Clear any previous image errors
      if (errors.image) {
        setErrors(prev => ({ ...prev, image: null }));
      }
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    // Clear the file input
    const fileInput = document.getElementById('image-upload');
    if (fileInput) {
      fileInput.value = '';
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.title.trim()) newErrors.title = t('feedback.validation.titleRequired');
    if (!formData.description.trim()) newErrors.description = t('feedback.validation.descriptionRequired');
    
    // Only validate these fields for admin users
    if (isAdmin) {
      if (!formData.feedbackType) newErrors.feedbackType = t('feedback.validation.feedbackTypeRequired');
      if (!formData.priority) newErrors.priority = t('feedback.validation.priorityRequired');
      if (!formData.status) newErrors.status = t('feedback.validation.statusRequired');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setSaving(true);
    setSaveStatus(null);

    try {
      const feedbackDataToSave = {
        title: formData.title,
        feedbackType: formData.feedbackType,
        description: formData.description,
        priority: formData.priority,
        status: formData.status,
        image: selectedImage
      };

      if (currentFeedbackId) {
        // Edit feedback
        await updateFeedback(currentFeedbackId, feedbackDataToSave);
        setSaveStatus('success');
        await logAuditEvent({
          title: `modified feedback ${formData.title}`,
          userEmail: userProfile?.mail,
          userName: userProfile?.displayName,
          actionType: "Modify",
          details: `User updated feedback titled "${formData.title}".`,
        });
      } else {
        // Create feedback
        await createFeedback(feedbackDataToSave);
        setSaveStatus('success');
        await logAuditEvent({
          title: `created feedback ${formData.title}`,
          userEmail: userProfile?.mail,
          userName: userProfile?.displayName,
          actionType: "Create",
          details: `User created a new feedback titled "${formData.title}".`,
        });
      }

      setIsEditing(false);
      // Navigate back to feedback management after a short delay
      setTimeout(() => {
        navigate('/home/feedback-management');
      }, 1500);
    } catch (error) {
      setSaveStatus('error');
      console.error('Save error:', error);
      console.error(t('feedback.messages.saveError', { error: error.message }));
    } finally {
      setSaving(false);
    }
  };

  // Show loading state while fetching feedback
  if (currentFeedbackId && (isLoading || !dataInitialized)) {
    return (
      <>
        <div className="max-w-6xl mx-auto p-6 bg-white">
          <div className="flex justify-center items-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-gray-600">Loading feedback...</p>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="container">
        
        {/* Content */}
        <div className="py-8 bg-white rounded-lg">
        {/* Header */}
        <div className="flex justify-between items-center mb-6 px-6">
          <h2 className="text-2xl font-bold text-gray-800">
            {(isEditing && currentFeedbackId) ? t('feedback.titles.edit') :
             currentFeedbackId ? t('feedback.titles.view') :
             t('feedback.titles.create')}
          </h2>
          <div className='flex gap-2'>
              <CSSTooltip text={t('navigation.goBack')} position="top">
                { role === 'admin' ?
              <NavLink
                to={'/home/content-management/feedbacks'}
                className="flex justify-center items-center gap-3 text-white w-11 h-11 hover:bg-alternative-300 bg-alternative-400 px-3 py-2 rounded-full whitespace-nowrap"
                aria-label={t('navigation.backToFeedback')}
              >
                    <ArrowLeft strokeWidth={2} className="h-5 w-5" />
              </NavLink>

                    :
                    <NavLink
                to={'/home/feedbacks'}
                className="flex justify-center items-center gap-3 text-white w-11 h-11 hover:bg-alternative-300 bg-alternative-400 px-3 py-2 rounded-full whitespace-nowrap"
                aria-label={t('navigation.backToFeedback')}
              >
                    <ArrowLeft strokeWidth={2} className="h-5 w-5" />
              </NavLink>
                    }
            </CSSTooltip>

            {currentFeedbackId && (
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
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="space-y-8 px-6">
          {/* Basic Information */}
          <div className="rounded-lg p-6 ">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">
              {t('feedback.sections.basicInfo')}
            </h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Title */}
              <div className="lg:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('feedback.fields.titleRequired')}
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => handleInputChange('title', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:border-transparent ${errors.title ? 'border-red-300' : 'border-gray-300'}`}
                    placeholder={feedbackData?.Title || t('feedback.fields.titlePlaceholder')}
                  />
                ) : (
                  <p className="text-gray-900 font-medium">{formData.title || '-'}</p>
                )}
                {errors.title && <p className="text-red-600 text-sm mt-1">{errors.title}</p>}
              </div>

              {/* Feedback Type - Only show for admin users */}
              {isAdmin && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('feedback.fields.feedbackTypeRequired')}
                  </label>
                  {isEditing ? (
                    <select
                      value={formData.feedbackType}
                      onChange={(e) => handleInputChange('feedbackType', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:border-transparent ${errors.feedbackType ? 'border-red-300' : 'border-gray-300'}`}
                    >
                      <option value="">{t('feedback.fields.feedbackTypePlaceholder')}</option>
                      {getFeedbackTypeOptions().map((option, index) => (
                        <option key={index} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  ) : (
                    <div className="flex items-center gap-2">
                      {getFeedbackTypeOptions().find(opt => opt.value === formData.feedbackType)?.icon && (
                        React.createElement(getFeedbackTypeOptions().find(opt => opt.value === formData.feedbackType).icon, { className: "w-4 h-4" })
                      )}
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-purple-100 text-purple-800">
                        {getDisplayLabel(getFeedbackTypeOptions(), formData.feedbackType) || '-'}
                      </span>
                    </div>
                  )}
                  {errors.feedbackType && <p className="text-red-600 text-sm mt-1">{errors.feedbackType}</p>}
                </div>
              )}

              {/* Priority - Only show for admin users */}
              {isAdmin && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('feedback.fields.priorityRequired')}
                  </label>
                  {isEditing ? (
                    <select
                      value={formData.priority}
                      onChange={(e) => handleInputChange('priority', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:border-transparent ${errors.priority ? 'border-red-300' : 'border-gray-300'}`}
                    >
                      <option value="">{t('feedback.fields.priorityPlaceholder')}</option>
                      {getPriorityOptions().map((option, index) => (
                        <option key={index} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  ) : (
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm ${getDisplayColor(getPriorityOptions(), formData.priority)}`}>
                      {getDisplayLabel(getPriorityOptions(), formData.priority) || '-'}
                    </span>
                  )}
                  {errors.priority && <p className="text-red-600 text-sm mt-1">{errors.priority}</p>}
                </div>
              )}

              {/* Status - Only show for admin users */}
              {isAdmin && (
                <div className="lg:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('feedback.fields.statusRequired')}
                  </label>
                  {isEditing ? (
                    <select
                      value={formData.status}
                      onChange={(e) => handleInputChange('status', e.target.value)}
                      className={`w-full max-w-xs px-3 py-2 border rounded-md focus:ring-2 focus:border-transparent ${errors.status ? 'border-red-300' : 'border-gray-300'}`}
                    >
                      <option value="">{t('feedback.fields.statusPlaceholder')}</option>
                      {getStatusOptions().map((option, index) => (
                        <option key={index} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  ) : (
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm ${getDisplayColor(getStatusOptions(), formData.status)}`}>
                      {getDisplayLabel(getStatusOptions(), formData.status) || '-'}
                    </span>
                  )}
                  {errors.status && <p className="text-red-600 text-sm mt-1">{errors.status}</p>}
                </div>
              )}

              {/* Description */}
              <div className="lg:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('feedback.fields.descriptionRequired')}
                </label>
                {isEditing ? (
                  <textarea
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    rows={6}
                    className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:border-transparent ${errors.description ? 'border-red-300' : 'border-gray-300'}`}
                    placeholder={feedbackData?.Description || t('feedback.fields.descriptionPlaceholder')}
                  />
                ) : (
                  <div className="p-4 rounded-md">
                    <p className="text-gray-700 whitespace-pre-wrap">{formData.description || '-'}</p>
                  </div>
                )}
                {errors.description && <p className="text-red-600 text-sm mt-1">{errors.description}</p>}
              </div>
            </div>
          </div>

          {/* Image Section */}
          <div className="rounded-lg p-6 ">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">
              <ImageIcon className="w-5 h-5 inline mr-2" />
              {t('feedback.sections.attachments')}
            </h2>

            {isEditing ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('feedback.fields.image')}
                  </label>
                  <div className="flex items-center space-x-4">
                    <label className="cursor-pointer">
                      <input
                        id="image-upload"
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="hidden"
                      />
                      <div className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50">
                        <Upload className="w-4 h-4" />
                        {t('feedback.buttons.selectImage')}
                      </div>
                    </label>
                    {selectedImage && (
                      <button
                        type="button"
                        onClick={removeImage}
                        className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-md"
                      >
                        <X className="w-4 h-4" />
                        {t('feedback.buttons.removeImage')}
                      </button>
                    )}
                  </div>
                  {errors.image && <p className="text-red-600 text-sm mt-1">{errors.image}</p>}
                  <p className="text-gray-500 text-sm mt-1">
                    {t('feedback.fields.imageHelp')}
                  </p>
                </div>

                {/* Image Preview */}
                {imagePreview && (
                  <div className="mt-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">{t('feedback.labels.preview')}</p>
                    <div className="relative inline-block">
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="max-w-xs max-h-64 rounded-md border border-gray-300"
                      />
                      <button
                        type="button"
                        onClick={removeImage}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div>
                {feedbackData?.Image ? (
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">{t('feedback.labels.attachedImage')}</p>
                    <img
                      src={feedbackData.Image}
                      alt="Feedback attachment"
                      className="max-w-xs max-h-64 rounded-md border border-gray-300"
                    />
                  </div>
                ) : (
                  <p className="text-gray-500 italic">{t('feedback.labels.noAttachment')}</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Save Button */}
        <div className="flex w-full mt-8 px-6">
          <div className='w-full'>
            {isEditing && (
              <Button
                variant='ghost'
                onClick={handleSave}
                disabled={loading}
                className="flex justify-center items-center gap-3 text-primary py-2 rounded-md whitespace-nowrap w-full disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {loading ? (
                  currentFeedbackId ? t('feedback.buttons.updating') : t('feedback.buttons.saving')
                ) : (
                  currentFeedbackId ? t('feedback.buttons.update') : t('feedback.buttons.save')
                )}
              </Button>
            )}
          </div>
        </div>

        {/* Save Status */}
        {saveStatus && (
          <div className={`mt-4 mx-6 p-4 rounded-md ${saveStatus === 'success' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
            <div className="flex items-center">
              {saveStatus === 'success' ? (
                <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
              )}
              <p className={`text-sm ${saveStatus === 'success' ? 'text-green-700' : 'text-red-700'}`}>
                {saveStatus === 'success'
                  ? t('feedback.messages.saveSuccess')
                  : t('feedback.messages.saveError')
                }
              </p>
            </div>
          </div>
        )}
        </div>
      </div>
      <Toaster position="top-right" />
    </>
  );
};

export default FeedbackFormPage;