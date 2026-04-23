import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useSharePoint } from '@/hooks/useSharePoint';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import { LogOut, Settings, WifiOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import logoWhite from '@/assets/logo-white.png';
import pcxLogo from '@/assets/pcx.png';
import { auditLogger } from '@/services/auditLogger';
import { db } from '@/db/offlineDB';

export default function MainLayout() {
  const { userProfile, logout } = useAuth();
  const { sp, checkIsOwner, syncAuditLogsToSharePoint } = useSharePoint();

  // ── Dev-only audit log panel state ──────────────────────────────────────
  const [devPanelOpen, setDevPanelOpen] = useState(false);
  const [unsyncedCount, setUnsyncedCount] = useState(0);
  const [isSyncingLogs, setIsSyncingLogs] = useState(false);
  const [syncLogResult, setSyncLogResult] = useState(null);

  const refreshUnsyncedCount = useCallback(async () => {
    try {
      const count = await db.auditLogs.filter(log => !log.synced).count();
      setUnsyncedCount(count);
    } catch { /* db may not be ready */ }
  }, []);

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    refreshUnsyncedCount();
    const interval = setInterval(refreshUnsyncedCount, 5000);
    return () => clearInterval(interval);
  }, [refreshUnsyncedCount]);

  const handleSyncAuditLogs = async () => {
    if (isSyncingLogs) return;
    setIsSyncingLogs(true);
    setSyncLogResult(null);
    try {
      const result = await auditLogger.syncAuditLogs(syncAuditLogsToSharePoint);
      setSyncLogResult(result);
      await refreshUnsyncedCount();
    } catch (err) {
      setSyncLogResult({ error: err.message });
    } finally {
      setIsSyncingLogs(false);
    }
  };
  const { t, i18n } = useTranslation();
  const [isOwner, setIsOwner] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);
  const menuRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();
  const isAdminRoute = location.pathname.startsWith('/home/admin');

  useEffect(() => {
    if (!sp) return;
    checkIsOwner().then(setIsOwner);
  }, [sp, checkIsOwner]);

  // Listen for session-expired events fired by useSharePoint
  useEffect(() => {
    const handler = () => setSessionExpired(true);
    window.addEventListener('auth:session-expired', handler);
    return () => window.removeEventListener('auth:session-expired', handler);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = async () => {
    setMenuOpen(false);
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const initials = (userProfile?.displayName || 'U')
    .split(' ')
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase();

  if (!userProfile) {
    return (
      <div className="flex items-center justify-center w-screen h-screen bg-gray-50 animate-fadeIn">
        <LoadingSkeleton />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Simple Header */}
      <header className="bg-primary shadow-sm">
        <div className={`container mx-auto px-4 ${isAdminRoute ? 'py-5 sm:py-6' : 'py-4'}`}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {/* Logo */}
            <Link
              to="/home"
              title="Telecom Market Insights"
              className="flex-shrink-0 self-center sm:self-auto"
            >
              {isAdminRoute ? (
                <div className="flex items-center gap-2.5 sm:gap-4">
                  <img
                    src={logoWhite}
                    alt="Africell"
                    className="h-44 w-auto object-contain sm:h-20"
                  />
                  <span className="h-12 w-px bg-white/40 sm:h-16" aria-hidden="true" />
                  <img
                    src={pcxLogo}
                    alt="PCX"
                    className="h-32 w-auto object-contain sm:h-14"
                  />
                </div>
              ) : (
                <span className="text-center text-lg font-bold tracking-tight text-white sm:text-xl">
                  Telecom Market Insights
                </span>
              )}
            </Link>

            {/* Nav + user avatar dropdown */}
            {userProfile && (
              <div className="flex w-full flex-wrap items-center justify-between gap-3 sm:w-auto sm:flex-nowrap sm:justify-end sm:gap-5">
                {isOwner && (
                  <Link
                    to="/home/admin"
                    className="text-sm font-medium text-white/80 transition-colors hover:text-white"
                  >
                    {t('nav.admin')}
                  </Link>
                )}

                {/* Language toggle */}
                <div className="order-2 flex items-center rounded-full bg-white/10 p-0.5 sm:order-none">
                  {['pt', 'en'].map(lang => (
                    <button
                      key={lang}
                      onClick={() => i18n.changeLanguage(lang)}
                      className={`px-2.5 py-1 text-xs font-semibold rounded-full transition-all ${
                        i18n.language === lang
                          ? 'bg-white text-primary shadow-sm'
                          : 'text-white/70 hover:text-white'
                      }`}
                    >
                      {lang.toUpperCase()}
                    </button>
                  ))}
                </div>

                {/* Avatar button */}
                <div className="relative ml-auto sm:ml-0" ref={menuRef}>
                  <button
                    onClick={() => setMenuOpen(o => !o)}
                    className="group flex items-center space-x-2 focus:outline-none sm:space-x-2.5"
                  >
                    {/* Avatar circle */}
                    <div className="w-9 h-9 rounded-full bg-white/20 border-2 border-white/40 group-hover:border-white/80 flex items-center justify-center transition-colors ring-0 group-focus-visible:ring-2 group-focus-visible:ring-white">
                      <span className="text-white text-sm font-semibold leading-none">
                        {initials}
                      </span>
                    </div>
                    {/* Name + chevron */}
                    <div className="hidden sm:flex flex-col items-start leading-tight">
                      <span className="text-white text-sm font-medium">
                        {userProfile.displayName?.split(' ')[0] || 'User'}
                      </span>
                      <span className="text-white/60 text-xs">
                        {userProfile.mail || userProfile.userPrincipalName || ''}
                      </span>
                    </div>
                    <svg
                      className={`w-3.5 h-3.5 text-white/60 transition-transform duration-200 ${menuOpen ? 'rotate-180' : ''}`}
                      fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {/* Dropdown */}
                  {menuOpen && (
                    <div className="absolute right-0 mt-2.5 w-56 bg-white rounded-xl shadow-xl border border-gray-100 py-1.5 z-50 animate-fadeIn">
                      {/* User info header */}
                      <div className="px-4 py-3 border-b border-gray-100">
                        <p className="text-sm font-semibold text-gray-800 truncate">
                          {userProfile.displayName || 'User'}
                        </p>
                        <p className="text-xs text-gray-400 truncate mt-0.5">
                          {userProfile.mail || userProfile.userPrincipalName || ''}
                        </p>
                        {isOwner && (
                          <span className="inline-block mt-1.5 text-xs bg-primary/10 text-primary font-medium px-2 py-0.5 rounded-full">
                            {t('nav.administrator')}
                          </span>
                        )}
                      </div>

                      {/* Menu items */}
                      {isOwner && (
                        <Link
                          to="/home/admin"
                          onClick={() => setMenuOpen(false)}
                          className="flex items-center space-x-2.5 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          <Settings className="w-4 h-4 text-gray-400" />
                          <span>{t('nav.adminPanel')}</span>
                        </Link>
                      )}

                      <button
                        onClick={handleLogout}
                        className="flex items-center space-x-2.5 w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>{t('nav.logout')}</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Dev-only audit log panel */}
      {import.meta.env.DEV && (
        <div className="fixed bottom-4 right-4 z-[200] flex flex-col items-end gap-2">
          {devPanelOpen && (
            <div className="w-64 rounded-xl bg-gray-900 text-white shadow-2xl border border-gray-700 overflow-hidden text-xs">
              <div className="px-3 py-2 bg-gray-800 flex items-center justify-between">
                <span className="font-semibold text-gray-200">Audit Log Dev Panel</span>
                <span className="text-gray-400">{navigator.onLine ? '🟢 online' : '🔴 offline'}</span>
              </div>
              <div className="px-3 py-3 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Unsynced logs</span>
                  <span className={`font-bold ${unsyncedCount > 0 ? 'text-yellow-400' : 'text-green-400'}`}>
                    {unsyncedCount}
                  </span>
                </div>

                <button
                  onClick={handleSyncAuditLogs}
                  disabled={isSyncingLogs || !navigator.onLine || unsyncedCount === 0}
                  className="w-full rounded-lg bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed text-white font-medium py-1.5 transition-colors"
                >
                  {isSyncingLogs ? 'Syncing…' : 'Sync Audit Logs to SP'}
                </button>

                {syncLogResult && (
                  <div className={`rounded-lg px-2.5 py-2 ${syncLogResult.error ? 'bg-red-900/50 text-red-300' : 'bg-green-900/50 text-green-300'}`}>
                    {syncLogResult.error
                      ? `Error: ${syncLogResult.error}`
                      : `✓ ${syncLogResult.synced} synced · ${syncLogResult.failed} failed`}
                  </div>
                )}
              </div>
            </div>
          )}

          <button
            onClick={() => { setDevPanelOpen(o => !o); setSyncLogResult(null); }}
            className="flex items-center gap-1.5 rounded-full bg-gray-900 border border-gray-700 text-white px-3 py-1.5 text-xs font-semibold shadow-lg hover:bg-gray-800 transition-colors"
          >
            <span>🛠 DEV</span>
            {unsyncedCount > 0 && (
              <span className="bg-yellow-500 text-black rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none">
                {unsyncedCount}
              </span>
            )}
          </button>
        </div>
      )}

      {/* Session expired modal */}
      {sessionExpired && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100]">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full mx-4 text-center space-y-5">
            <div className="flex justify-center">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center">
                <WifiOff className="w-8 h-8 text-orange-500" />
              </div>
            </div>
            <div className="space-y-2">
              <h2 className="text-lg font-semibold text-gray-800">
                {t('session.expired')}
              </h2>
              <p className="text-sm text-gray-500">
                {t('session.expiredMessage')}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center space-x-2 bg-primary text-white py-2.5 rounded-xl font-medium hover:bg-primary/90 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>{t('session.logoutAndLogin')}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
