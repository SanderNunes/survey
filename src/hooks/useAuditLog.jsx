import { useCallback } from 'react';
import { useMsal } from '@azure/msal-react';
import { auditLogger, fireAndForget, AUDIT_ACTIONS } from '@/services/auditLogger';

/**
 * useAuditLog({ province, formType })
 *
 * Returns logSurveyEvent(actionType, surveyId, extraOpts) — fire-and-forget.
 * Nothing is exposed to the surveyor UI.
 */
export function useAuditLog({ province = '', formType = '' } = {}) {
  const { accounts } = useMsal();
  const surveyorId = accounts[0]?.username || accounts[0]?.name || 'anonymous';

  const logSurveyEvent = useCallback(
    (actionType, surveyId, extraOpts = {}) => {
      fireAndForget(() =>
        auditLogger.logEvent(actionType, surveyId, {
          surveyorId,
          province,
          region:  extraOpts.region || province,
          formType,
          ...extraOpts,
        })
      );
    },
    [surveyorId, province, formType]
  );

  return { logSurveyEvent, AUDIT_ACTIONS };
}
