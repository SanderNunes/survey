import { groupLogsByDate } from '@/utils/auditUtils';
import React, { memo } from 'react';
import AuditLogEntry from '../AuditLogEntry';

/**
 * Date group component for logs
 */
const LogDateGroup = memo(({ date, logs }) => (
  <div className="bg-white rounded-lg shadow-sm">
    {/* Date Header */}
    <div className="px-6 py-3 border-b border-gray-200">
      <h3 className="text-sm font-semibold text-gray-900">{date}</h3>
    </div>

    {/* Log Entries */}
    <div className="divide-y divide-gray-100">
      {logs.map((log, index) => (
        <AuditLogEntry 
          key={log.Id} 
          log={log} 
          index={index}
        />
      ))}
    </div>
  </div>
));

LogDateGroup.displayName = 'LogDateGroup';

/**
 * Main logs list component
 */
const AuditLogsList = memo(({ logs }) => {
  const groupedLogs = groupLogsByDate(logs);

  return (
    <div className="space-y-6">
      {Object.entries(groupedLogs).map(([date, logs]) => (
        <LogDateGroup 
          key={date} 
          date={date} 
          logs={logs} 
        />
      ))}
    </div>
  );
});

AuditLogsList.displayName = 'AuditLogsList';

export default AuditLogsList;