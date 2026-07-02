import { useEffect, useState, useCallback } from "react";
import { clearSiteData, recoverAndReload } from "../utils/clearSiteData";

// One-shot guard so auto-recovery can never turn into a reload loop. It is set
// AFTER the wipe (which clears sessionStorage) so it survives the reload.
const RECOVERY_FLAG = "africell_auth_recovery_attempted";

// Watches a loading gate. While `active`, if the gate hasn't resolved within
// `timeoutMs`, it auto-recovers ONCE by wiping site data and reloading. If we
// have already auto-recovered and we're STILL stuck, it flips `timedOut` so the
// gate can offer a manual reset button instead of looping forever.
export function useAuthWatchdog(active, { timeoutMs = 10000 } = {}) {
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (!active) return undefined;
    const id = setTimeout(async () => {
      if (sessionStorage.getItem(RECOVERY_FLAG)) {
        // Already auto-recovered once and still stuck — hand off to the user.
        setTimedOut(true);
        return;
      }
      await clearSiteData();
      // Set the guard AFTER the wipe so it survives the reload below.
      try {
        sessionStorage.setItem(RECOVERY_FLAG, "1");
      } catch {
        /* ignore */
      }
      window.location.reload();
    }, timeoutMs);
    return () => clearTimeout(id);
  }, [active, timeoutMs]);

  // Call once auth has settled successfully so a future genuine stall can
  // auto-recover again.
  const reset = useCallback(() => {
    try {
      sessionStorage.removeItem(RECOVERY_FLAG);
    } catch {
      /* ignore */
    }
    setTimedOut(false);
  }, []);

  return { timedOut, reset };
}

// Manual escape hatch shown on the loading screen once auto-recovery has been
// exhausted. Fixed to the bottom-center so it works over any skeleton.
export function ResetButton({ label = "Taking too long? Reset & reload" }) {
  return (
    <div
      style={{
        position: "fixed",
        bottom: 40,
        left: 0,
        right: 0,
        display: "flex",
        justifyContent: "center",
        zIndex: 9999,
      }}
    >
      <button
        type="button"
        onClick={recoverAndReload}
        style={{
          padding: "10px 22px",
          fontSize: 14,
          fontWeight: 600,
          color: "#fff",
          background: "#A1007C",
          border: "none",
          borderRadius: 10,
          cursor: "pointer",
          boxShadow: "0 4px 14px rgba(161,0,124,0.25)",
        }}
      >
        {label}
      </button>
    </div>
  );
}
