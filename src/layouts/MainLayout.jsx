import React, { useState, useEffect, useRef } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useSharePoint } from '@/hooks/useSharePoint';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import { LogOut, Settings, WifiOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import logoWhite from '@/assets/logo-white.png';
import pcxLogo from '@/assets/pcx.png';

export default function MainLayout() {
  const { userProfile, logout } = useAuth();
  const { sp, checkIsOwner } = useSharePoint();
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
                    className="h-10 w-auto object-contain sm:h-14"
                  />
                  <span className="h-7 w-px bg-white/40 sm:h-10" aria-hidden="true" />
                  <img
                    src={pcxLogo}
                    alt="PCX"
                    className="h-7 w-auto object-contain sm:h-10"
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
