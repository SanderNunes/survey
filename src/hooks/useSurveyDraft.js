import { useCallback, useEffect, useRef } from 'react';
import { db } from '@/db/offlineDB';
import { auditLogger, fireAndForget, AUDIT_ACTIONS } from '@/services/auditLogger';

/**
 * useSurveyDraft — persists an in-progress survey so it survives tab close,
 * crash, reload, or battery death.
 *
 * - Text answers are debounce-saved (~2s) to the `drafts` table keyed by draftId.
 * - Audio blobs are written to `audioBlobs` (status 'draft', surveyId = draftId)
 *   the moment they are recorded, so they survive a crash too.
 * - State is also flushed immediately when the app is hidden/backgrounded.
 *
 * The hook does NOT manage React state — the survey page owns that. It only
 * mirrors a serializable snapshot to IndexedDB and offers load/clear helpers.
 *
 * @param {object}   args
 * @param {string}   args.draftId   stable id for this in-progress survey (session UUID)
 * @param {string}   args.province  'cabinda' | 'huila' | ...
 * @param {object}   args.snapshot  serializable survey state to persist
 * @param {boolean}  args.dirty     whether the snapshot has meaningful content yet
 */
export function useSurveyDraft({ draftId, province, snapshot, dirty }) {
  const debounceRef = useRef(null);
  const latestRef   = useRef({ snapshot, dirty });
  latestRef.current = { snapshot, dirty };
  // Draft ids that have been cleared (submitted/discarded). A debounce/flush that
  // fires AFTER clearDraft must not resurrect the deleted draft row.
  const clearedRef  = useRef(new Set());

  const writeDraft = useCallback(async () => {
    const { snapshot: snap, dirty: isDirty } = latestRef.current;
    if (!isDirty) return;
    if (clearedRef.current.has(draftId)) return; // draft was cleared — don't resurrect it
    try {
      const existing = await db.drafts.where('draftId').equals(draftId).first();
      const record = {
        draftId,
        province,
        updatedAt: new Date().toISOString(),
        ...snap,
      };
      if (existing) await db.drafts.update(existing.id, record);
      else          await db.drafts.add(record);
    } catch (err) {
      console.warn('[useSurveyDraft] draft save failed:', err?.message || err);
    }
  }, [draftId, province]);

  // Debounced autosave whenever the snapshot changes
  useEffect(() => {
    if (!dirty) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { writeDraft(); }, 2000);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [snapshot, dirty, writeDraft]);

  // Flush immediately when the app is backgrounded or closing — the most likely
  // moments to lose in-memory state on mobile.
  useEffect(() => {
    const flush = () => {
      if (!latestRef.current.dirty) return;
      writeDraft();
      fireAndForget(() => auditLogger.logEvent(AUDIT_ACTIONS.SURVEY_AUTOSAVED, draftId, { province }));
    };
    const onVisibility = () => { if (document.visibilityState === 'hidden') flush(); };
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [draftId, province, writeDraft]);

  /** Load a saved draft (if any) plus its audio blobs as playable object URLs. */
  const loadDraft = useCallback(async () => {
    try {
      const draft = await db.drafts.where('draftId').equals(draftId).first();
      if (!draft) return null;
      const blobs = await db.audioBlobs.where('surveyId').equals(draftId).toArray();
      const audio = {};
      for (const b of blobs) {
        audio[b.questionId] = { blob: b.blob, url: URL.createObjectURL(b.blob) };
      }
      return { draft, audio };
    } catch (err) {
      console.warn('[useSurveyDraft] draft load failed:', err?.message || err);
      return null;
    }
  }, [draftId]);

  /** Look up the most recent draft for this province (used to offer "resume"). */
  const findLatestDraft = useCallback(async () => {
    try {
      const drafts = await db.drafts.where('province').equals(province).toArray();
      if (drafts.length === 0) return null;
      return drafts.sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''))[0];
    } catch {
      return null;
    }
  }, [province]);

  /** Persist a freshly recorded audio blob under the draft id. */
  const persistDraftAudio = useCallback(async (questionId, blob) => {
    clearedRef.current.delete(draftId); // recording is new activity — allow autosave again
    try {
      // Atomic: ensure a draft row exists AND write the blob together, so orphan
      // cleanup on the next init can never delete a just-recorded blob whose draft
      // row hadn't been written yet (the debounced row write may not have fired).
      await db.transaction('rw', db.drafts, db.audioBlobs, async () => {
        const existing = await db.drafts.where('draftId').equals(draftId).first();
        if (!existing) {
          await db.drafts.add({ draftId, province, updatedAt: new Date().toISOString(), ...latestRef.current.snapshot });
        }
        await db.audioBlobs.where('surveyId').equals(draftId).and(b => b.questionId === questionId).delete();
        await db.audioBlobs.add({
          surveyId:   draftId,
          questionId,
          blob,
          mimeType:   blob.type,
          sizeBytes:  blob.size,
          status:     'draft',
          uploadedAt: null,
        });
      });
    } catch (err) {
      console.warn('[useSurveyDraft] audio persist failed:', err?.message || err);
    }
  }, [draftId, province]);

  /** Remove a draft audio blob (user deleted the recording). */
  const removeDraftAudio = useCallback(async (questionId) => {
    try {
      await db.audioBlobs.where('surveyId').equals(draftId).and(b => b.questionId === questionId).delete();
    } catch { /* best-effort */ }
  }, [draftId]);

  /** Delete the draft row and ALL of its audio blobs. */
  const clearDraft = useCallback(async (id = draftId) => {
    // Cancel any pending autosave and block future writes for this id so a late
    // debounce/flush can't re-create the draft we are deleting.
    if (debounceRef.current) { clearTimeout(debounceRef.current); debounceRef.current = null; }
    clearedRef.current.add(id);
    try {
      await db.transaction('rw', db.drafts, db.audioBlobs, async () => {
        await db.drafts.where('draftId').equals(id).delete();
        await db.audioBlobs.where('surveyId').equals(id).delete();
      });
    } catch (err) {
      console.warn('[useSurveyDraft] draft clear failed:', err?.message || err);
    }
  }, [draftId]);

  return { loadDraft, findLatestDraft, persistDraftAudio, removeDraftAudio, clearDraft, writeDraft };
}
