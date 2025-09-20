import React, { memo } from 'react';
import { Filter, FileX, Search, Database, FileText, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next'; // Add this import

/**
 * Empty state component with internationalization support
 *
 * @param {Object} props - Component props
 * @param {string} props.type - Type of empty state ('auditLogs', 'files', 'articles', 'search', 'data', 'generic')
 * @param {string} props.customTitle - Custom title override
 * @param {string} props.customDescription - Custom description override
 * @param {React.ReactNode} props.icon - Custom icon override
 * @param {React.ReactNode} props.action - Optional action button/component
 * @param {string} props.className - Additional CSS classes
 */
const EmptyState = memo(({
  type = 'auditLogs',
  customTitle,
  customDescription,
  icon,
  action,
  className = ''
}) => {
  const { t } = useTranslation(); // Add this hook

  // Get the appropriate icon based on type
  const getIcon = () => {
    if (icon) return icon;

    const iconProps = { className: "w-12 h-12 mx-auto" };

    switch (type) {
      case 'auditLogs':
        return <Filter {...iconProps} />;
      case 'files':
        return <FileX {...iconProps} />;
      case 'articles':
        return <FileText {...iconProps} />;
      case 'search':
        return <Search {...iconProps} />;
      case 'data':
        return <Database {...iconProps} />;
      default:
        return <AlertCircle {...iconProps} />;
    }
  };

  // Get translated title and description based on type
  const getContent = () => {
    const translationKey = `emptyState.${type}`;

    return {
      title: customTitle || t(`${translationKey}.title`),
      description: customDescription || t(`${translationKey}.description`)
    };
  };

  const content = getContent();

  return (
    <div className={`text-center py-12 ${className}`}>
      <div className="text-gray-400 mb-4">
        {getIcon()}
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">
        {content.title}
      </h3>
      <p className="text-gray-600 mb-4 max-w-md mx-auto">
        {content.description}
      </p>
      {action && (
        <div className="mt-6">
          {action}
        </div>
      )}
    </div>
  );
});

EmptyState.displayName = 'EmptyState';

export default EmptyState;
