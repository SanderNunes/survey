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
  Plus
} from 'lucide-react';
import { useSharePoint } from '@/hooks/useSharePoint';
import { NavLink, useNavigate, useParams } from 'react-router-dom';
import { Button, Chip } from '@material-tailwind/react';
import ErrorBoundary from '@/components/UI/ErrorBoundary';
import { Toaster } from 'react-hot-toast';
import DashboardLayout from '@/layouts/Dashboard';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import CSSTooltip from '@/components/CSSTooltip';
import moment from 'moment';
import "moment/dist/locale/pt";
import 'moment/dist/locale/pt-br';
import 'moment/dist/locale/fr';

const CreateEventPage = ({ eventId, onSave, onCancel, view = 'save' }) => {
  const { t } = useTranslation();
  const [isEditing, setIsEditing] = useState(view === 'save');
  const [loading, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null);
  const [errors, setErrors] = useState({});
  const { createEvent, updateEvent, getEventById, logAuditEvent } = useSharePoint();
  const { userProfile } = useAuth();
  const { eventId: eventIdParam } = useParams();
  const navigate = useNavigate();

  // Use either URL param or prop
  const currentEventId = eventIdParam || eventId;

  const [formData, setFormData] = useState({
    title: '',
    category: '',
    startDate: '',
    endDate: '',
    recurrenceType: '',
    description: '',
    eventType: '',
    team: '',
    accessLevel: '',
    notes: '',
    status: '',
    reminder: ''
  });

  const [eventData, setEventData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [dataInitialized, setDataInitialized] = useState(false);

  // Get dropdown options with English values and translated labels
  const getCategoryOptions = () => [
    { value: 'Meeting', label: t('createEvent.categories.meeting') },
    { value: 'Training', label: t('createEvent.categories.training') },
    { value: 'Conference', label: t('createEvent.categories.conference') },
    { value: 'Workshop', label: t('createEvent.categories.workshop') },
    { value: 'Audit', label: t('createEvent.categories.audit') },
    { value: 'Holiday', label: t('createEvent.categories.holiday') },
    { value: 'Mystery Shop', label: t('createEvent.categories.mistery_shop') },
    { value: 'Celebration', label: t('createEvent.categories.celebration') },
    { value: 'Others', label: t('createEvent.categories.others') },
  ];

  const getEventTypeOptions = () => [
    { value: 'Internal', label: t('createEvent.types.internal') },
    { value: 'External', label: t('createEvent.types.external') },
    { value: 'Client', label: t('createEvent.types.client') },
    { value: 'Personal', label: t('createEvent.types.personal') },
    { value: 'Company', label: t('createEvent.types.company') }
  ];

  const getTeamOptions = () => [
    { value: 'PCX - General', label: t('createEvent.team.pcx') },
    { value: 'Quality Assurance', label: t('createEvent.team.quality_assurance') },
    { value: 'Corporate', label: t('createEvent.team.corporate') },
    { value: 'Hybrid', label: t('createEvent.team.hybrid') },
    { value: 'Residential', label: t('createEvent.team.residential') },
    { value: 'Projects', label: t('createEvent.team.projects') },
    { value: 'External', label: t('createEvent.team.external') }
  ];

  const getAccessLevelOptions = () => [
    { value: 'Public', label: t('createEvent.accessLevels.public') },
    { value: 'Private', label: t('createEvent.accessLevels.private') },
    { value: 'Restricted', label: t('createEvent.accessLevels.restricted') },
    { value: 'Confidential', label: t('createEvent.accessLevels.confidential') }
  ];

  const getStatusOptions = () => [
    { value: 'Scheduled', label: t('createEvent.status.scheduled') },
    { value: 'Confirmed', label: t('createEvent.status.confirmed') },
    { value: 'Cancelled', label: t('createEvent.status.cancelled') },
    { value: 'Completed', label: t('createEvent.status.completed') },
    { value: 'Postponed', label: t('createEvent.status.postponed') }
  ];

  const getReminderOptions = () => [
    { value: 'None', label: t('createEvent.reminders.none') },
    { value: '15 Minutes', label: t('createEvent.reminders.fifteenMinutes') },
    { value: '30 Minutes', label: t('createEvent.reminders.thirtyMinutes') },
    { value: '1 Hour', label: t('createEvent.reminders.oneHour') },
    { value: '2 Hours', label: t('createEvent.reminders.twoHours') },
    { value: '1 Day', label: t('createEvent.reminders.oneDay') },
    { value: '1 Week', label: t('createEvent.reminders.oneWeek') }
  ];

  const getRecurrenceOptions = () => [
    { value: 'None', label: t('createEvent.recurrence.none') },
    { value: 'Daily', label: t('createEvent.recurrence.daily') },
    { value: 'Weekly', label: t('createEvent.recurrence.weekly') },
    { value: 'Monthly', label: t('createEvent.recurrence.monthly') },
    { value: 'Quarterly', label: t('createEvent.recurrence.quarterly') },
    { value: 'Semestral', label: t('createEvent.recurrence.semestral') },
    { value: 'Yearly', label: t('createEvent.recurrence.yearly') }
  ];

  // Helper function to get display label for a value
  const getDisplayLabel = (options, value) => {
    const option = options.find(opt => opt.value === value);
    return option ? option.label : value;
  };

  // Helper function to format date for datetime-local input
  const formatDateForInput = useCallback((dateString) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      // Check if date is valid
      if (isNaN(date.getTime())) return '';
      return date.toISOString().slice(0, 10); // Only date part for date input
    } catch (error) {
      console.error('Error formatting date:', error);
      return '';
    }
  }, []);

  // Initialize form data from event data
  const initializeFormData = useCallback((event) => {
    if (!event) return;

    console.log('Populating form with event data:', event);

    const newFormData = {
      title: event.Title || '',
      category: event.Category || '',
      startDate: event.Start_Date,
      endDate: formatDateForInput(event.End_Date),
      recurrenceType: event.Recurrence_Type || '',
      description: event.Description || '',
      eventType: event.Event_Type || '',
      team: event.Team || '',
      accessLevel: event.Access_Level || '',
      notes: event.Notes || '',
      status: event.Status || '',
      reminder: event.Reminder || ''
    };

    setFormData(newFormData);
    setDataInitialized(true);

    // Set editing state based on view prop
    if (view === 'edit') {
      setIsEditing(true);
    } else if (view === 'view') {
      setIsEditing(false);
    }
  }, [formatDateForInput, view]);

  const fetchEvent = useCallback(async () => {
    if (!currentEventId) {
      setDataInitialized(true);
      return;
    }

    setIsLoading(true);
    setDataInitialized(false);

    try {
      console.log('Fetching event with ID:', currentEventId);
      const event = await getEventById(currentEventId);
      console.log('Fetched event data:', event);

      if (event) {
        setEventData(event);
        initializeFormData(event);
      } else {
        console.warn('No event data returned');
        setDataInitialized(true);
      }
    } catch (err) {
      console.error('Error fetching event:', err);
      console.error(t('createEvent.messages.fetchError', { error: err.message }));
      setDataInitialized(true);
    } finally {
      setIsLoading(false);
    }
  }, [currentEventId, getEventById, initializeFormData, t]);

  // Fetch event data when component mounts or eventId changes
  useEffect(() => {
    fetchEvent();
  }, [fetchEvent]);

  // Handle case where eventData changes but form isn't initialized yet
  useEffect(() => {
    if (eventData && !dataInitialized) {
      initializeFormData(eventData);
    }
  }, [eventData, dataInitialized, initializeFormData]);

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

  const validateForm = () => {
    const newErrors = {};

    if (!formData.title.trim()) newErrors.title = t('createEvent.validation.titleRequired');
    if (!formData.category) newErrors.category = t('createEvent.validation.categoryRequired');
    if (!formData.startDate) newErrors.startDate = t('createEvent.validation.startDateRequired');
    if (!formData.eventType) newErrors.eventType = t('createEvent.validation.eventTypeRequired');
    if (!formData.status) newErrors.status = t('createEvent.validation.statusRequired');
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setSaving(true);
    setSaveStatus(null);

    try {
      const eventDataToSave = {
        Title: formData.title,
        Category: formData.category,
        Start_Date: formData.startDate,
        End_Date: formData.endDate || null,
        Recurrence_Type: formData.recurrenceType,
        Description: formData.description,
        Event_Type: formData.eventType,
        Team: formData.team,
        Access_Level: formData.accessLevel,
        Notes: formData.notes,
        Status: formData.status,
        Reminder: formData.reminder
      };

      if (currentEventId) {
        // Edit event
        await updateEvent(currentEventId, eventDataToSave);
        setSaveStatus('success');
        await logAuditEvent({
          title: `modified event ${formData.title}`,
          userEmail: userProfile?.mail,
          userName: userProfile?.displayName,
          actionType: "Modify",
          details: `User updated event titled "${formData.title}".`,
        });
      } else {
        // Create event
        await createEvent(eventDataToSave);
        setSaveStatus('success');
        await logAuditEvent({
          title: `created event ${formData.title}`,
          userEmail: userProfile?.mail,
          userName: userProfile?.displayName,
          actionType: "Create",
          details: `User created a new event titled "${formData.title}".`,
        });
      }

      setIsEditing(false);
      // Navigate back to events management after a short delay
      setTimeout(() => {
        navigate('/home/content-management/events');
      }, 1500);
    } catch (error) {
      setSaveStatus('error');
      console.error('Save error:', error);
      console.error(t('createEvent.messages.saveError', { error: error.message }));
    } finally {
      setSaving(false);
    }
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return '';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (error) {
      return '';
    }
  };

  // Show loading state while fetching event
  if (currentEventId && (isLoading || !dataInitialized)) {
    return (
      <DashboardLayout>
        <div className="max-w-6xl mx-auto p-6 bg-white">
          <div className="flex justify-center items-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-gray-600">Loading event...</p>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto p-6 bg-white">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">
            {(isEditing && currentEventId) ? t('createEvent.titles.edit') :
             currentEventId ? " " :
             t('createEvent.titles.create')}
          </h2>
          <div className='flex gap-2'>
            <CSSTooltip text={t('navigation.goBack')} position="top">
              <NavLink
                to={'/home/content-management/events'}
                className="flex justify-center items-center gap-3 text-white w-11 h-11 hover:bg-alternative-300 bg-alternative-400 px-3 py-2 rounded-full whitespace-nowrap"
                aria-label={t('navigation.backToEvents')}
              >
                <ArrowLeft strokeWidth={2} className="h-5 w-5" />
              </NavLink>
            </CSSTooltip>

            {currentEventId && (
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
        <div className="space-y-8">
          {/* Basic Information */}
          <div className="rounded-lg p-6 ">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">
              {t('createEvent.sections.basicInfo')}
            </h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Title */}
              <div className="lg:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('createEvent.fields.titleRequired')}
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => handleInputChange('title', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:border-transparent ${errors.title ? 'border-red-300' : 'border-gray-300'}`}
                    placeholder={eventData?.Title || t('createEvent.fields.titlePlaceholder')}
                  />
                ) : (
                  <p className="text-gray-900 font-medium">{formData.title || '-'}</p>
                )}
                {errors.title && <p className="text-red-600 text-sm mt-1">{errors.title}</p>}
              </div>

              {/* Description */}
              <div className="lg:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('createEvent.fields.description')}
                </label>
                {isEditing ? (
                  <textarea
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:border-transparent"
                    placeholder={eventData?.Description || t('createEvent.fields.descriptionPlaceholder')}
                  />
                ) : (
                  <p className="text-gray-700">{formData.description || '-'}</p>
                )}
              </div>

              {/* Start Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  {t('createEvent.fields.startDateRequired')}
                </label>
                {isEditing ? (
                  <input
                    type="datetime-local"
                    step="60"
                    value={formData.startDate}
                    onChange={(e) => handleInputChange('startDate', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:border-transparent ${errors.startDate ? 'border-red-300' : 'border-gray-300'}`}
                  />
                ) : (
                  <p className="text-gray-900 capitalize">{moment(formData.startDate).locale(t('lang')).format("LLL")  || '-'}</p>
                )}
                {errors.startDate && <p className="text-red-600 text-sm mt-1">{errors.startDate}</p>}
              </div>

              {/* End Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  {t('createEvent.fields.endDate')}
                </label>
                {isEditing ? (
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => handleInputChange('endDate', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:border-transparent ${errors.endDate ? 'border-red-300' : 'border-gray-300'}`}
                  />
                ) : (
                  <p className="text-gray-900 capitalize">{moment(formData.endDate).locale(t('lang')).format("LL") || '-'}</p>
                )}
                {errors.endDate && <p className="text-red-600 text-sm mt-1">{errors.endDate}</p>}
              </div>
            </div>
          </div>

          {/* Classification */}
          <div className="rounded-lg p-6 ">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">
              {t('createEvent.sections.classification')}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('createEvent.fields.categoryRequired')}
                </label>
                {isEditing ? (
                  <select
                    value={formData.category}
                    onChange={(e) => handleInputChange('category', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:border-transparent ${errors.category ? 'border-red-300' : 'border-gray-300'}`}
                  >
                    <option value="">{t('createEvent.fields.categoryPlaceholder')}</option>
                    {getCategoryOptions().map((option, index) => (
                      <option key={index} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                ) : (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-purple-100 text-purple-800">
                    {getDisplayLabel(getCategoryOptions(), formData.category) || '-'}
                  </span>
                )}
                {errors.category && <p className="text-red-600 text-sm mt-1">{errors.category}</p>}
              </div>

              {/* Event Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('createEvent.fields.eventTypeRequired')}
                </label>
                {isEditing ? (
                  <select
                    value={formData.eventType}
                    onChange={(e) => handleInputChange('eventType', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:border-transparent ${errors.eventType ? 'border-red-300' : 'border-gray-300'}`}
                  >
                    <option value="">{t('createEvent.fields.eventTypePlaceholder')}</option>
                    {getEventTypeOptions().map((option, index) => (
                      <option key={index} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                ) : (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-green-100 text-green-800">
                    {getDisplayLabel(getEventTypeOptions(), formData.eventType) || '-'}
                  </span>
                )}
                {errors.eventType && <p className="text-red-600 text-sm mt-1">{errors.eventType}</p>}
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('createEvent.fields.statusRequired')}
                </label>
                {isEditing ? (
                  <select
                    value={formData.status}
                    onChange={(e) => handleInputChange('status', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:border-transparent ${errors.status ? 'border-red-300' : 'border-gray-300'}`}
                  >
                    <option value="">{t('createEvent.fields.statusPlaceholder')}</option>
                    {getStatusOptions().map((option, index) => (
                      <option key={index} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                ) : (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800">
                    {getDisplayLabel(getStatusOptions(), formData.status) || '-'}
                  </span>
                )}
                {errors.status && <p className="text-red-600 text-sm mt-1">{errors.status}</p>}
              </div>

              {/* Team */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Users className="w-4 h-4 inline mr-1" />
                  {t('createEvent.fields.team')}
                </label>
                {isEditing ? (
                  <select
                    value={formData.team}
                    onChange={(e) => handleInputChange('team', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:border-transparent"
                  >
                    <option value="">{t('createEvent.fields.teamPlaceholder')}</option>
                    {getTeamOptions().map((option, index) => (
                      <option key={index} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                ) : (
                  <p className="text-gray-700">{getDisplayLabel(getTeamOptions(), formData.team) || '-'}</p>
                )}
              </div>

              {/* Access Level */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('createEvent.fields.accessLevel')}
                </label>
                {isEditing ? (
                  <select
                    value={formData.accessLevel}
                    onChange={(e) => handleInputChange('accessLevel', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:border-transparent"
                  >
                    <option value="">{t('createEvent.fields.accessLevelPlaceholder')}</option>
                    {getAccessLevelOptions().map((option, index) => (
                      <option key={index} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                ) : (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-yellow-100 text-yellow-800">
                    {getDisplayLabel(getAccessLevelOptions(), formData.accessLevel) || '-'}
                  </span>
                )}
              </div>

              {/* Reminder */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Bell className="w-4 h-4 inline mr-1" />
                  {t('createEvent.fields.reminder')}
                </label>
                {isEditing ? (
                  <select
                    value={formData.reminder}
                    onChange={(e) => handleInputChange('reminder', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:border-transparent"
                  >
                    <option value="">{t('createEvent.fields.reminderPlaceholder')}</option>
                    {getReminderOptions().map((option, index) => (
                      <option key={index} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                ) : (
                  <p className="text-gray-700">{getDisplayLabel(getReminderOptions(), formData.reminder) || '-'}</p>
                )}
              </div>
            </div>

            {/* Recurrence Type */}
            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('createEvent.fields.recurrenceType')}
              </label>
              {isEditing ? (
                <select
                  value={formData.recurrenceType}
                  onChange={(e) => handleInputChange('recurrenceType', e.target.value)}
                  className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:border-transparent"
                >
                  <option value="">{t('createEvent.fields.recurrenceTypePlaceholder')}</option>
                  {getRecurrenceOptions().map((option, index) => (
                    <option key={index} value={option.value}>{option.label}</option>
                  ))}
                </select>
              ) : (
                <p className="text-gray-700">{getDisplayLabel(getRecurrenceOptions(), formData.recurrenceType) || '-'}</p>
              )}
            </div>

            {/* Notes */}
            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('createEvent.fields.notes')}
              </label>
              {isEditing ? (
                <textarea
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:border-transparent"
                  placeholder={eventData?.Notes || t('createEvent.fields.notesPlaceholder')}
                />
              ) : (
                <p className="text-gray-700">{formData.notes || '-'}</p>
              )}
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex w-full mt-8">
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
                  currentEventId ? t('createEvent.buttons.updating') : t('createEvent.buttons.saving')
                ) : (
                  currentEventId ? t('createEvent.buttons.update') : t('createEvent.buttons.save')
                )}
              </Button>
            )}
          </div>
        </div>

        {/* Save Status */}
        {saveStatus && (
          <div className={`mt-4 p-4 rounded-md ${saveStatus === 'success' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
            <div className="flex items-center">
              {saveStatus === 'success' ? (
                <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
              )}
              <p className={`text-sm ${saveStatus === 'success' ? 'text-green-700' : 'text-red-700'}`}>
                {saveStatus === 'success'
                  ? t('createEvent.messages.saveSuccess')
                  : t('createEvent.messages.saveError')
                }
              </p>
            </div>
          </div>
        )}
      </div>
      <Toaster position="top-right" />
    </DashboardLayout>
  );
};

export default CreateEventPage;
