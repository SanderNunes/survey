import React, { useState } from "react";
import "@pnp/sp/webs";
import { useTranslation } from "react-i18next";
import { NavLink, useLocation } from "react-router-dom";
import { Menu, Typography } from "@material-tailwind/react";
import { Calendar, ChartNoAxesCombined, ChevronDown, ChevronRight, Files, MenuIcon, MessageCircleQuestion, MonitorCog, Network, Newspaper, Presentation, Server, X , MessageCircleCode} from "lucide-react";
import { AnimatePresence, motion } from 'framer-motion';
import askCellitoBG from '@/assets/BackgroundAskCellito.png'

// Animation variants
const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.3 } },
  exit: { opacity: 0, transition: { duration: 0.2, delay: 0.1 } }
};

const drawerVariants = {
  hidden: { x: -300, opacity: 0 },
  visible: {
    x: 0,
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 30,
      opacity: { duration: 0.2 }
    }
  },
  exit: {
    x: -300,
    opacity: 0,
    transition: {
      type: "spring",
      stiffness: 400,
      damping: 40,
      opacity: { duration: 0.15 }
    }
  }
};

const itemVariants = {
  hidden: { x: -20, opacity: 0 },
  visible: i => ({
    x: 0,
    opacity: 1,
    transition: {
      delay: i * 0.1 + 0.2,
      duration: 0.4
    }
  }),
};

const headerVariants = {
  hidden: { x: -20, opacity: 0 },
  visible: {
    x: 0,
    opacity: 1,
    transition: {
      delay: 0.1,
      duration: 0.3
    }
  }
};

const submenuVariants = {
  hidden: { height: 0, opacity: 0 },
  visible: {
    height: "auto",
    opacity: 1,
    transition: {
      duration: 0.3,
      ease: "easeInOut"
    }
  },
  exit: {
    height: 0,
    opacity: 0,
    transition: {
      duration: 0.2,
      ease: "easeInOut"
    }
  }
};

const DashboardLayout = ({ children }) => {
  const { t } = useTranslation();
  const [openSubmenus, setOpenSubmenus] = useState(new Set());
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const location = useLocation();

  // Toggle functions
  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
    if (!isCollapsed) {
      setOpenSubmenus(new Set());
    }
  };

  const toggleMobileSidebar = () => {
    setIsMobileOpen(!isMobileOpen);
  };

  const toggleSubmenu = (itemId) => {
    setOpenSubmenus(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  // Helper function to check if dropdown should be active
  const isDropdownActive = (submenu) => {
    return submenu?.some(item => location.pathname === item.to);
  };

  const handleLinkClick = () => {
    setOpenSubmenus(new Set());
    setIsMobileOpen(false);
  };

  const menuItems = [
    {
      id: 1,
      title: t('home.menu.analytics'),
      to: "/home/analytics",
      IconValue: ChartNoAxesCombined,
      type: "link"
    },
    {
      id: 2,
      title: t('home.menu.contentmanagement'),
      isDropdown: true,
      IconValue: MonitorCog,
      submenu: [
        { id: 21, title: t('home.menu.courses'), to: "/home/content-management/courses", IconValue: Presentation },
        { id: 22, title: t('home.menu.articles'), to: "/home/content-management/articles", IconValue: Newspaper },
        { id: 23, title: t('home.menu.documents'), to: "/home/content-management/documents", IconValue: Files },
        { id: 24, title: t('home.menu.events'), to: "/home/content-management/events", IconValue: Calendar },
        { id: 25, title: t('home.menu.team'), to: "/home/content-management/team", IconValue: Network },
        { id: 26, title: t('home.menu.feedback'), to: "/home/content-management/feedbacks", IconValue: MessageCircleCode },
      ]
    },
    {
      id: 3,
      title: t('home.menu.audit'),
      to: "/home/system-audit",
      IconValue: Server,
      type: "link"
    },
  ];

  return (
    <div className="z-0 grid grid-cols-1 lg:grid-cols-[auto_1fr] min-h-full bg-gray-50 relative ">
      {/* Mobile Menu Button */}
      {isMobileOpen ? (
        <></>
      ) : (
        <button
          onClick={toggleMobileSidebar}
          className="lg:hidden absolute top-4 h-10 w-10 left-4 p-2 bg-white rounded-lg shadow-md border border-gray-100"
        >
          <MenuIcon className="h-6 w-6 text-black z-50" />
        </button>
      )}


      {/* Mobile Overlay */}
      <AnimatePresence>
        {isMobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-30"
            onClick={toggleMobileSidebar}
          />
        )}
      </AnimatePresence>

      {/* Desktop Sidebar */}
      <motion.div
        initial={false}
        animate={{
          width: isCollapsed ? '80px' : '320px'
        }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className={`
          hidden lg:block relative
          ${isCollapsed ? 'w-20' : 'w-80'}
        `}
      >
        <div className="container p-4 h-full">
          <div className="flex flex-col justify-between w-full h-full bg-white/80 backdrop-blur-sm rounded-2xl shadow-md border border-gray-100/50 transition-all duration-300">
            <nav className="pt-16">
              <ul className={`${isCollapsed ? 'py-4' : 'py-8'}`}>
                {menuItems.map(({ id, title, to, IconValue, submenu, type }, index) => (
                  <motion.li
                    key={id}
                    custom={index}
                    variants={itemVariants}
                    initial="hidden"
                    animate="visible"
                    className={`${isCollapsed ? 'px-2 my-1' : 'px-4 my-2'}`}
                  >
                    {type === "link" ? (
                      <NavLink
                        to={to}
                        onClick={handleLinkClick}
                        className={({ isActive }) =>
                          `group flex ${isCollapsed ? 'justify-center' : 'justify-between'} rounded-lg items-center ${isCollapsed ? 'px-2 py-3' : 'px-6 py-3'} transition-all duration-200 border-l-4 border-transparent hover:bg-primary-100 hover:text-primary-500 ${isActive ? 'bg-primary-100 text-primary-500' : ''
                          }`
                        }
                        title={isCollapsed ? title : ''}
                      >
                        <span className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-2'}`}>
                          <div
                            className={`
                              ${isCollapsed ? 'p-2' : 'p-3'} rounded-xl transition-all duration-200
                              ${location.pathname === to
                                ? 'bg-primary-500 text-white'
                                : 'bg-gray-200 text-gray-400 group-hover:bg-primary-500 group-hover:text-white'
                              }
                            `}
                          >
                            <IconValue className={`${isCollapsed ? 'h-4 w-4' : 'h-[18px] w-[18px]'}`} />
                          </div>
                          {!isCollapsed && title}
                        </span>
                        {!isCollapsed && <ChevronRight className="h-4 w-4 opacity-50" />}
                      </NavLink>
                    ) : (
                      <div>
                        {/* Dropdown trigger */}
                        <button
                          onClick={() => !isCollapsed && toggleSubmenu(id)}
                          className={`group flex ${isCollapsed ? 'justify-center' : 'justify-between'} rounded-lg items-center ${isCollapsed ? 'px-2 py-3' : 'px-6 py-3'} w-full text-left transition-all duration-200 border-l-4 border-transparent hover:bg-primary-100 hover:text-primary-500 ${isDropdownActive(submenu) ? 'bg-primary-100 text-primary-500' : ''
                            }`}
                          title={isCollapsed ? title : ''}
                        >
                          <span className={`flex ${isCollapsed ? 'justify-center' : 'gap-2'} items-center`}>
                            <div className={`
                              ${isCollapsed ? 'p-2' : 'p-3'} rounded-xl transition-all duration-200
                              ${isDropdownActive(submenu)
                                ? 'bg-primary-500 text-white'
                                : 'bg-gray-200 text-gray-400 group-hover:bg-primary-500 group-hover:text-white'
                              }
                            `}>
                              <IconValue className={`${isCollapsed ? 'h-4 w-4' : 'h-[18px] w-[18px]'}`} />
                            </div>
                            {!isCollapsed && title}
                          </span>
                          {!isCollapsed && (
                            <ChevronDown
                              className={`h-4 w-4 transition-transform duration-200 ${openSubmenus.has(id) ? 'rotate-180' : ''
                                }`}
                            />
                          )}
                        </button>

                        {/* Dropdown menu - only show when not collapsed */}
                        {!isCollapsed && (
                          <AnimatePresence>
                            {openSubmenus.has(id) && (
                              <div className="overflow-hidden">
                                <ul className="py-2">
                                  {submenu.map(({ id, title, to, IconValue }, subIndex) => (
                                    <motion.li
                                      key={id}
                                      initial={{ opacity: 0, x: -10 }}
                                      animate={{
                                        opacity: 1,
                                        x: 0,
                                        transition: { delay: subIndex * 0.1 }
                                      }}
                                    >
                                      <NavLink
                                        to={to}
                                        onClick={handleLinkClick}
                                        className={({ isActive }) =>
                                          `flex gap-2 px-12 py-2 transition-all duration-200 rounded-md ${isActive
                                            ? 'text-primary-500 bg-primary-50'
                                            : 'text-gray-900 hover:bg-gray-50 hover:text-primary-500'
                                          }`
                                        }
                                      >
                                        <IconValue className="h-[18px] w-[18px]" />
                                        {title}
                                      </NavLink>
                                    </motion.li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </AnimatePresence>
                        )}
                      </div>
                    )}
                  </motion.li>
                ))}
              </ul>
            </nav>

            {/* Contact section - only show when not collapsed */}
            {!isCollapsed && (
              <motion.div
                custom={menuItems.length}
                variants={itemVariants}
                initial="hidden"
                animate="visible"
                className="px-6 pt-4 my-8 h-56"
              >
                <div
                  className="grid grid-cols-1 justify-between gap-4 text-white p-3 rounded-lg h-full w-full"
                  style={{
                    backgroundImage: `url(${askCellitoBG})`,
                    backgroundRepeat: 'no-repeat',
                    backgroundSize: 'contain',
                  }}
                >
                  <div className="bg-white w-12 flex justify-center items-center rounded-lg">
                    <div className="bg-primary-500 rounded-full p-2">
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                        <path d="M12 17h.01" />
                      </svg>
                    </div>
                  </div>

                  <div className="w-full">
                    <Typography type="p">{t("footer.help")}</Typography>
                    <NavLink
                      to="/home/cellito"
                      onClick={handleLinkClick}
                      className="flex text-center justify-center font-medium gap-4 bg-white mt-2 text-black px-4 py-3 rounded-lg hover:bg-secondary-500 transition-colors duration-300 h-12 w-full"
                    >
                      {t("footer.more")}
                    </NavLink>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {isMobileOpen && (
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="lg:hidden fixed left-0 top-0 z-40 w-80 h-full"
          >
            <div className="container p-4 h-full">
              <div className="flex flex-col justify-between w-full h-full bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-100/50">
                <nav className="pt-16">
                  <ul className="py-8">
                    {menuItems.map(({ id, title, to, IconValue, submenu, type }, index) => (
                      <motion.li
                        key={id}
                        custom={index}
                        variants={itemVariants}
                        initial="hidden"
                        animate="visible"
                        className="px-4 my-2"
                      >
                        {type === "link" ? (
                          <NavLink
                            to={to}
                            onClick={handleLinkClick}
                            className={({ isActive }) =>
                              `group flex justify-between rounded-lg items-center px-6 py-3 transition-all duration-200 border-l-4 border-transparent hover:bg-primary-100 hover:text-primary-500 ${isActive ? 'bg-primary-100 text-primary-500' : ''
                              }`
                            }
                          >
                            <span className="flex items-center gap-2">
                              <div
                                className={`
                                  p-3 rounded-xl transition-all duration-200
                                  ${location.pathname === to
                                    ? 'bg-primary-500 text-white'
                                    : 'bg-gray-200 text-gray-400 group-hover:bg-primary-500 group-hover:text-white'
                                  }
                                `}
                              >
                                <IconValue className="h-[18px] w-[18px]" />
                              </div>
                              {title}
                            </span>
                            <ChevronRight className="h-4 w-4 opacity-50" />
                          </NavLink>
                        ) : (
                          <div>
                            <button
                              onClick={() => toggleSubmenu(id)}
                              className={`group flex justify-between rounded-lg items-center px-6 py-3 w-full text-left transition-all duration-200 border-l-4 border-transparent hover:bg-primary-100 hover:text-primary-500 ${isDropdownActive(submenu) ? 'bg-primary-100 text-primary-500' : ''
                                }`}
                            >
                              <span className="flex gap-2 items-center">
                                <div className={`
                                  p-3 rounded-xl transition-all duration-200
                                  ${isDropdownActive(submenu)
                                    ? 'bg-primary-500 text-white'
                                    : 'bg-gray-200 text-gray-400 group-hover:bg-primary-500 group-hover:text-white'
                                  }
                                `}>
                                  <IconValue className="h-[18px] w-[18px]" />
                                </div>
                                {title}
                              </span>
                              <ChevronDown
                                className={`h-4 w-4 transition-transform duration-200 ${openSubmenus.has(id) ? 'rotate-180' : ''
                                  }`}
                              />
                            </button>

                            <AnimatePresence>
                              {openSubmenus.has(id) && (
                                <div className="overflow-hidden">
                                  <ul className="py-2">
                                    {submenu.map(({ id, title, to, IconValue }, subIndex) => (
                                      <motion.li
                                        key={id}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{
                                          opacity: 1,
                                          x: 0,
                                          transition: { delay: subIndex * 0.1 }
                                        }}
                                      >
                                        <NavLink
                                          to={to}
                                          onClick={handleLinkClick}
                                          className={({ isActive }) =>
                                            `flex gap-2 px-12 py-2 transition-all duration-200 rounded-md ${isActive
                                              ? 'text-primary-500 bg-primary-50'
                                              : 'text-gray-900 hover:bg-gray-50 hover:text-primary-500'
                                            }`
                                          }
                                        >
                                          <IconValue className="h-[18px] w-[18px]" />
                                          {title}
                                        </NavLink>
                                      </motion.li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </AnimatePresence>
                          </div>
                        )}
                      </motion.li>
                    ))}
                  </ul>
                </nav>

                {/* Mobile contact section */}
                <motion.div
                  custom={menuItems.length}
                  variants={itemVariants}
                  initial="hidden"
                  animate="visible"
                  className="px-6 pt-4 my-8 h-56"
                >
                  <div
                    className="grid grid-cols-1 justify-between gap-4 text-white p-3 rounded-lg h-full w-full"
                    style={{
                      backgroundImage: `url(${askCellitoBG})`,
                      backgroundRepeat: 'no-repeat',
                      backgroundSize: 'contain',
                    }}
                  >
                    <div className="bg-white w-12 flex justify-center items-center rounded-lg">
                      <div className="bg-primary-500 rounded-full p-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10" />
                          <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                          <path d="M12 17h.01" />
                        </svg>
                      </div>
                    </div>

                    <div className="w-full">
                      <Typography type="p">Need Help?</Typography>
                      <NavLink
                        to="/home/cellito"
                        onClick={handleLinkClick}
                        className="flex text-center justify-center font-medium gap-4 bg-white mt-2 text-black px-4 py-3 rounded-lg hover:bg-secondary-500 transition-colors duration-300 h-12 w-full"
                      >
                        Ask Cellito
                      </NavLink>
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="p-4 lg:p-8 h-full transition-all duration-300">
        {children}
      </div>
    </div>
  );
};

export default DashboardLayout;
