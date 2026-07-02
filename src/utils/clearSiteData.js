// Wipes all client-side storage so a corrupted/stuck auth state (MSAL cache, a
// stale `interaction.status` flag, service-worker caches) can't keep the app
// pinned on the loading screen. Best-effort: every step is guarded so one
// failure can't abort the rest.
export async function clearSiteData() {
  try {
    localStorage.clear();
  } catch {
    /* ignore */
  }
  try {
    sessionStorage.clear();
  } catch {
    /* ignore */
  }

  // Expire every JS-readable cookie for the current host. httpOnly cookies
  // (server session cookies) can't be reached from JS and are left intact.
  try {
    const paths = ["/", window.location.pathname];
    document.cookie.split(";").forEach((cookie) => {
      const name = cookie.split("=")[0].trim();
      if (!name) return;
      paths.forEach((path) => {
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=${path}`;
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=${path};domain=${window.location.hostname}`;
      });
    });
  } catch {
    /* ignore */
  }

  // IndexedDB (best-effort; databases() is not available in every browser).
  try {
    if (typeof indexedDB !== "undefined" && indexedDB.databases) {
      const dbs = await indexedDB.databases();
      await Promise.all(
        dbs.map(
          (db) =>
            db.name &&
            new Promise((resolve) => {
              const req = indexedDB.deleteDatabase(db.name);
              req.onsuccess = req.onerror = req.onblocked = () => resolve();
            })
        )
      );
    }
  } catch {
    /* ignore */
  }

  // Cache Storage (service-worker / PWA caches).
  try {
    if (typeof caches !== "undefined" && caches.keys) {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
    }
  } catch {
    /* ignore */
  }
}

// Clears everything then reloads. Used by the manual "Reset & reload" button.
export async function recoverAndReload() {
  await clearSiteData();
  window.location.reload();
}
