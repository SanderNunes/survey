import React, { useState, useRef } from 'react';
import { Search, Menu, X, Bell, User, ChevronDown, Home, Users, GraduationCap, FileText, Globe, MessageCircle, ChartNoAxesCombined, Network, Calendar } from 'lucide-react';

import logo from "@/assets/logo-white.png";
import { Link } from 'react-router-dom';
import LanguageSelect from '../LangSelect';
import EmailNotificationMenu from '../NotificationMenu';
import ProfileMenu from '../ProfileMenu';
import { useTranslation } from 'react-i18next';
import moment from 'moment';

const MobileHeader = ({unreadCounts, userProfile ,searchTerm,onBlur,  onKeyDown, handleSearch, handleInputChange, suggestions, role}) => {
  const { t } = useTranslation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  // const [searchTerm, setSearchTerm] = useState('');
  // const [suggestions, setSuggestions] = useState([]);
  const [activeSubmenu, setActiveSubmenu] = useState(null);
  const searchInputRef = useRef(null);


  const menuAdminItems = (role == 'admin') ? [
    { name: t('home.menu.analytics'), href: "/home/analytics", icon: ChartNoAxesCombined },
  ] : [];
  const menuItems = [
    { name: t('home.quiklinks.home'), href: '/home', icon: Home },
    { name: t('home.quiklinks.whoarewe'), href: '/home/cellito', icon: MessageCircle },
    { name: t('home.quiklinks.africelluniversity'), href: '/home/academy', icon: GraduationCap },
    { name: t('home.quiklinks.articles'), href: '/home/articles-feed', icon: FileText },
    { name: t('home.quiklinks.calendar'), href: '/home/calendar', icon: Calendar },
    { name: t('home.quiklinks.team'), href: '/home/team', icon: Network },
    ...menuAdminItems
  ];


  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
    setIsSearchOpen(false);
  };

  const toggleSearch = () => {
    setIsSearchOpen(!isSearchOpen);
    setIsMenuOpen(false);
    if (!isSearchOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  };

  return (
    <div className="bg-primary text-white block lg:hidden">
      {/* Top Bar - Hidden on mobile when menu/search is open */}
      <div className={`bg-primaryDark px-4 py-2 text-sm transition-all duration-300 ${(isMenuOpen || isSearchOpen) ? 'h-0 overflow-hidden opacity-0' : 'h-auto opacity-100'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Globe className="w-4 h-4" />
            <span>{t("Language")}</span>
          </div>
          <div>
          <LanguageSelect />
          </div>
        </div>
      </div>

      {/* Main Header */}
      <div className="px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center">
            <Link to="/home" title="Africell Angola">
            <img
              src={logo}
              width={100}
              height={150}
              alt="Logotipo Africell"
              className="self-center"
            />
          </Link>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-2">
            {/* Search Button */}
            <button
              onClick={toggleSearch}
              className={`p-2 rounded-full transition-all duration-200 ${
                isSearchOpen ? 'bg-primary-500 text-white' : 'bg-white/10 hover:bg-white/20'
              }`}
            >
              {isSearchOpen ? <X className="w-5 h-5" /> : <Search className="w-5 h-5" />}
            </button>

            {/* Notifications */}
             <EmailNotificationMenu unreadCounts={unreadCounts} />

            {/* Profile */}
             <ProfileMenu userProfile={userProfile} role={role}/>

            {/* Menu Button */}
            <button
              onClick={toggleMenu}
              className={`p-2 rounded-full transition-all duration-200 ${
                isMenuOpen ? 'bg-primary text-white' : 'bg-white/10 hover:bg-white/20'
              }`}
            >
              {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Search Panel */}
      <div className={`overflow-hidden transition-all duration-300 ease-in-out ${
        isSearchOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
      }`}>
        <div className="px-4 pb-4 bg-primary">
          <div className="relative">
            <input
              ref={searchInputRef}
              type="search"
              placeholder={t("search.placeholder", "Search documents, articles, and FAQs...")}
              className="w-full px-4 py-3 pl-12 bg-white text-gray-900 rounded-full focus:outline-none focus:ring-2 focus:ring-orange-500"
              value={searchTerm}
              onChange={handleInputChange}
              onKeyDown={onKeyDown}
              onBlur={onBlur}
            />
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <button
              onClick={handleSearch}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center hover:bg-orange-600 transition-colors"
            >
              <Search className="w-4 h-4 text-white" />
            </button>
          </div>

          {/* Search Suggestions */}
          {suggestions.length > 0 && searchTerm && (
            <div className="mt-2 bg-white rounded-lg shadow-lg max-h-64 overflow-y-auto">
              {suggestions.map((item, i) => (
                <a
                  key={i}
                  href={item.Path  || `/home/articles/${item.slug}`}
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 border-b border-gray-100 hover:bg-gray-50 transition-colors last:border-b-0"
                >
                  <div
                    className="w-8 h-8 rounded-lg bg-center bg-no-repeat bg-cover flex-shrink-0"
                    style={{ backgroundImage: `url(${item.image})` }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {item.Title}
                    </p>
                    <div className="flex flex-wrap gap-2 mt-1 text-xs text-gray-500">
                      <span>.{item.FileType}</span>
                      <span>{item.AfricellFileCategory || item.ContentType || t("searchSuggestions.noCategory")}</span>
                      <span>{moment.utc(item.LastModifiedTime).local().fromNow()}</span>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Mobile Menu */}
      <div className={`overflow-hidden transition-all duration-300 ease-in-out ${
        isMenuOpen ? 'max-h-screen opacity-100' : 'max-h-0 opacity-0'
      }`}>
        <div className="bg-primaryDark">
          <nav className="px-4 py-2">
            {menuItems.map((item, index) => {
              const IconComponent = item.icon;
              return (
                <a
                  key={index}
                  href={item.href}
                  className="flex items-center space-x-3 py-3 px-2 rounded-lg hover:bg-white/10 transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <IconComponent className="w-5 h-5 text-white" />
                  <span className="text-white font-medium">{item.name}</span>
                </a>
              );
            })}
          </nav>

          {/* Additional Actions */}
          <div className="border-t border-primary-700 px-4 py-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-white">{t("Language")}</span>
              <button className="flex items-center space-x-1 text-white transition-colors">
                <Globe className="w-4 h-4" />
                <LanguageSelect />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MobileHeader;
