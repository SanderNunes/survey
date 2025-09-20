/* eslint-disable react-hooks/exhaustive-deps */
// Custom Header Actions Component with Configuration Controls

import { useAuth } from "@/hooks/useAuth";
import { useSharePoint } from "@/hooks/useSharePoint";
import { Button } from "@material-tailwind/react";
import { usePuck } from "@measured/puck";
import { useState, useEffect, useRef } from "react";
import { useTranslation } from 'react-i18next'; // Add this import

const EditorHeaderButtons = ({ setContentMode, ArticleID, originalData }) => {
  const { t, i18n } = useTranslation(); // Add this hook
  const { appState } = usePuck();
  const { userProfile } = useAuth();
  const { updateArticleContent, logAuditEvent } = useSharePoint();
  const [isPublishing, setIsPublishing] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const intervalRef = useRef(null);
  
  // Get localized time formatting function
  const formatTime = (date) => {
    if (!date) return '';

    const locale = i18n.language.startsWith('pt') ? 'pt-BR' : 'en-US';
    return date.toLocaleTimeString(locale, {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatDateTime = (date) => {
    if (!date) return '';

    const locale = i18n.language.startsWith('pt') ? 'pt-BR' : 'en-US';
    return date.toLocaleString(locale, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  // Auto-save every 5 minutes (300,000 milliseconds)
  useEffect(() => {

    // Set up the interval for auto-save every 2 minutes
    intervalRef.current = setInterval(autoSave, 2 * 60 * 1000);

    // Cleanup interval on component unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [ArticleID, appState.data, t, i18n.language]); // Add language dependencies

// Enhanced data verification functions

const validateData = (data) => {
  // Check if data exists and is not empty
  if (!data) {
    return { isValid: false, error: 'No data provided' };
  }

  // Check if data is an object
  if (typeof data !== 'object') {
    return { isValid: false, error: 'Data must be an object' };
  }

  // Check if data has any content (not just empty object)
  if (Object.keys(data).length === 0) {
    return { isValid: false, error: 'Data object is empty' };
  }

  // Check for specific required fields if needed
  // Uncomment and modify based on your data structure requirements
  /*
  const requiredFields = ['content', 'title']; // Add your required fields
  for (const field of requiredFields) {
    if (!data[field]) {
      return { isValid: false, error: `Required field '${field}' is missing` };
    }
  }
  */

  return { isValid: true, error: null };
};

const validateArticleID = (articleId) => {
  if (!articleId) {
    return { isValid: false, error: 'Article ID is required' };
  }

  // Check if it's a valid ID format (modify based on your ID format)
  if (typeof articleId !== 'string' && typeof articleId !== 'number') {
    return { isValid: false, error: 'Article ID must be a string or number' };
  }

  // Additional ID validation if needed
  if (typeof articleId === 'string' && articleId.trim().length === 0) {
    return { isValid: false, error: 'Article ID cannot be empty' };
  }

  return { isValid: true, error: null };
};

// Enhanced save function with comprehensive validation
const save = async (data, isAutoSave = false) => {
  const logMessage = isAutoSave ? "Auto-saving article data:" : "Saving article data:";

  // Validate Article ID
  const articleValidation = validateArticleID(ArticleID);
  if (!articleValidation.isValid) {
    const errorMessage = isAutoSave
      ? t('editor.messages.autoSaveError', { error: articleValidation.error })
      : t('editor.messages.saveError', { error: articleValidation.error });
    throw new Error(errorMessage);
  }

  // Validate data
  const dataValidation = validateData(data);
  if (!dataValidation.isValid) {
    const errorMessage = isAutoSave
      ? t('editor.messages.autoSaveError', { error: dataValidation.error })
      : t('editor.messages.saveError', { error: dataValidation.error });
    throw new Error(errorMessage);
  }

  // Additional validation for critical operations
  if (!isAutoSave) {
    // For manual saves, you might want additional checks
    console.log(logMessage, JSON.stringify(data, null, 2));
  }

  try {
    await updateArticleContent({ id: ArticleID, data });
  } catch (error) {
    const errorMessage = isAutoSave
      ? t('editor.messages.autoSaveError', { error: error.message })
      : t('editor.messages.saveError', { error: error.message });
    throw new Error(errorMessage);
  }
};

// Enhanced auto-save function
const autoSave = async () => {
  // Early return if basic requirements aren't met
  if (!ArticleID || !appState.data) {
    console.warn('Auto-save skipped: Missing ArticleID or appState.data');
    return;
  }

  setIsAutoSaving(true);
  try {
    await save(appState.data, true);
    const saveTime = new Date();
    setLastSaved(saveTime);
    console.log('Auto-save completed successfully');
  } catch (error) {
    console.error('Auto-save failed:', error.message);
    // Optionally show a non-intrusive notification to user
  } finally {
    setIsAutoSaving(false);
  }
};

// Enhanced manual save handler
const handleSave = async () => {
  // Validate before attempting to save
  if (!ArticleID) {
    console.error('Cannot save: Article ID is missing');
    // Show user-friendly error message
    return;
  }

  if (!appState.data) {
    console.error('Cannot save: No data to save');
    // Show user-friendly error message
    return;
  }

  try {
    await save(appState.data);
    const saveTime = new Date();
    setLastSaved(saveTime);
    
    await logAuditEvent({
      title: `modified the content of article ${originalData.Title}`,
      userEmail: userProfile?.mail,
      userName: userProfile?.displayName,
      actionType: "Modify",
      details: `User updated the content in article "${originalData.Title}".`,
    });

    // Show success message
    console.log('Manual save completed successfully');
    
  } catch (error) {
    console.error('Manual save failed:', error.message);
    // You could add a toast notification here
  }
};

// Enhanced publish handler
const handlePublish = async () => {
  // Validate before publishing
  if (!ArticleID) {
    console.error('Cannot publish: Article ID is missing');
    return;
  }

  if (!appState.data) {
    console.error('Cannot publish: No data to publish');
    return;
  }

  setIsPublishing(true);
  try {
    const dataTemp = { ArticleStatus: 'Published' };
    
    // Save content first
    await save(appState.data);
    
    // Then update status
    await updateArticleContent({ id: ArticleID, dataTemp });
    
    const saveTime = new Date();
    setLastSaved(saveTime);

    // Log audit events
    await logAuditEvent({
      title: `modified the content of article ${originalData.Title}`,
      userEmail: userProfile?.mail,
      userName: userProfile?.displayName,
      actionType: "Modify",
      details: `User updated the content in article "${originalData.Title}".`,
    });
    
    await logAuditEvent({
      title: `modified status to published of article ${originalData.Title}`,
      userEmail: userProfile?.mail,
      userName: userProfile?.displayName,
      actionType: "Modify",
      details: `User updated status to published in article "${originalData.Title}".`,
    });

    console.log('Publish completed successfully');
    
  } catch (error) {
    console.error('Publish failed:', error);
    // Show error notification to user
  } finally {
    setIsPublishing(false);
    setContentMode(false);
  }
};

  const buttonStyles = {
    base: "px-4 py-2 rounded text-sm font-medium transition-colors duration-200",
    goBack: "text-gray-700 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed",
    save: "text-green-600 hover:bg-green-50 disabled:opacity-50",
    publish: "text-primary-500 hover:bg-secondary disabled:bg-secondary disabled:cursor-not-allowed",
    config: "text-primary-600 hover:bg-primary-50 border border-primary-200"
  };

  return (
    <div className="flex items-center gap-2">
      {/* Go Back Button */}
      <Button
        variant="ghost"
        onClick={() => {
          // Clear interval when going back
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
          }
          setContentMode(false);
        }}
        className={`${buttonStyles.base} ${buttonStyles.goBack}`}
        title={t('editor.tooltips.goBack')}
        aria-label={t('editor.tooltips.goBack')}
      >
        ← {t('editor.buttons.goBack')}
      </Button>

      {/* Manual Save Button */}
      <button
        onClick={handleSave}
        className={`${buttonStyles.base} ${buttonStyles.save}`}
        title={t('editor.tooltips.saveArticle')}
        aria-label={t('editor.tooltips.saveArticle')}
      >
        {t('editor.buttons.save')}
      </button>

      {/* Publish Button */}
      <button
        onClick={handlePublish}
        disabled={isPublishing}
        className={`${buttonStyles.base} ${buttonStyles.publish}`}
        title={t('editor.tooltips.publishArticle')}
        aria-label={t('editor.tooltips.publishArticle')}
      >
        {isPublishing ? t('editor.buttons.publishing') : t('editor.buttons.publish')}
      </button>

      {/* Auto-save status indicator */}
      <div className="text-xs text-gray-500 ml-2">
        {isAutoSaving && (
          <span className="flex items-center">
            <svg className="animate-spin -ml-1 mr-2 h-3 w-3 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            {t('editor.status.autoSaving')}
          </span>
        )}
        {lastSaved && !isAutoSaving && (
          <span
            title={t('editor.tooltips.lastSavedTime', { time: formatDateTime(lastSaved) })}
            className="cursor-help"
          >
            {t('editor.status.lastSaved', { time: formatTime(lastSaved) })}
          </span>
        )}
      </div>
    </div>
  );
};

export default EditorHeaderButtons;
