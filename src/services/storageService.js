const WARN_THRESHOLD  = 0.70;
const BLOCK_THRESHOLD = 0.85;
class StorageService {
  async getQuotaInfo() {
    if (!navigator.storage?.estimate) {
      return { supported: false, usageRatio: 0, isWarning: false, isCritical: false };
    }

    const { quota, usage } = await navigator.storage.estimate();
    const usageRatio = usage / quota;

    return {
      supported: true,
      quota,
      usage,
      available: quota - usage,
      usageMB:   (usage  / 1048576).toFixed(1),
      quotaMB:   (quota  / 1048576).toFixed(1),
      usageRatio,
      isWarning:  usageRatio >= WARN_THRESHOLD,
      isCritical: usageRatio >= BLOCK_THRESHOLD,
    };
  }

  async canStoreData(estimatedBytes) {
    const info = await this.getQuotaInfo();
    if (!info.supported) return { allowed: true };
    if (info.isCritical)  return { allowed: false, reason: 'storage_critical', info };
    if (info.available < estimatedBytes * 1.2)
      return { allowed: false, reason: 'insufficient_space', info };
    return { allowed: true, info };
  }

  // Delete full synced surveys + their audio blobs. Metadata receipts stay in
  // db.submissions, which is the durable local counter/audit surface.
  async cleanupSyncedData(db) {
    const synced = await db.surveys
      .where('status').equals('synced')
      .toArray();

    for (const s of synced) {
      await db.audioBlobs.where('surveyId').equals(s.surveyId).delete();
      await db.surveys.delete(s.id);
    }

    return synced.length;
  }
}

export const storageService = new StorageService();
