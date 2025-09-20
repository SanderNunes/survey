import { formatTime, getActionColor, getActionIcon } from '@/utils/auditUtils';
import React, { memo } from 'react';

/**
 * Individual audit log entry component
 */
const AuditLogEntry = memo(({ log, index }) => (
  <div
    className="px-6 py-4 hover:bg-gray-50 transition-colors"
    style={{
      animationDelay: `${index * 50}ms`,
      animation: 'fadeInUp 0.4s ease-out forwards'
    }}
  >
    <div className="flex items-start gap-4">
      {/* Time */}
      <div className="flex-shrink-0 w-16 text-xs text-gray-500 font-medium">
        {formatTime(log.Created)}
      </div>

      {/* Icon */}
      <div className="flex-shrink-0">
        <div className={`w-8 h-8 rounded-full ${getActionColor(log.ActionType)} flex items-center justify-center text-white`}>
          {getActionIcon(log.ActionType)}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-medium text-gray-900 mb-1">
         <span className='underline'>{log.UserName || ''}</span>  {log.Title}
        </h4>
        <p className="text-sm text-gray-600 leading-relaxed">
           {log.Details}
        </p>
      </div>
    </div>
  </div>
));

AuditLogEntry.displayName = 'AuditLogEntry';

export default AuditLogEntry;