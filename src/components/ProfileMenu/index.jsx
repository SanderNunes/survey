/* eslint-disable no-unused-vars */
import { useAuth } from "@/hooks/useAuth";
import { Menu, Avatar, IconButton } from "@material-tailwind/react";
import { ChartNoAxesCombined, ChevronDown, ChevronRight, Files, Server, LogOutIcon, MonitorCog, Newspaper, Presentation, UserCircleIcon, Calendar, Network, MessageCircleCode } from "lucide-react";
import { AnimatePresence, motion } from 'framer-motion';
import { Link, NavLink } from "react-router-dom";
import { getInitials } from "@/utils/constants";
import FallBackAvatar from "../FallBackAvatar";
import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";
import { useGraph } from "@/hooks/useGraph";
import { useSharePoint } from "@/hooks/useSharePoint";


export default function ProfileMenu({role, userProfile}) {
  const { t } = useTranslation();
  const {  logout } = useAuth();
  const { getMyProfilePhoto, profilePhoto } = useGraph();
  const [expanded, setExpanded] = useState(null);
// Navigation data
  const linkAdmin = [
    {
      id: 1,
      value: t('home.menu.analytics'),
      url: "/home/analytics",
      IconValue: ChartNoAxesCombined,
      type: "link"
    },
    {
      id: 2,
      value: t('home.menu.contentmanagement'),
      isDropdown: true,
      IconValue: MonitorCog,
      subLinks: [
        { id: 21, value: t('home.menu.courses'), url: "/home/content-management/courses", IconValue: Presentation },
        { id: 22, value: t('home.menu.articles'), url: "/home/content-management/articles", IconValue: Newspaper },
        { id: 23, value: t('home.menu.documents'), url: "/home/content-management/documents", IconValue: Files },
        { id: 24, value: t('home.menu.events'), url: "/home/content-management/events", IconValue: Calendar },
        { id: 25, value: t('home.menu.team'), url: "/home/content-management/team", IconValue: Network },
        { id: 26, value: t('home.menu.feedback'), url: "/home/content-management/feedbacks", IconValue: MessageCircleCode },
      ]
    },
    {
      id: 3,
      value: t('home.menu.audit'), url: "/home/system-audit", IconValue: Server,
      type: "link"
    },

  ];

  // console.log({userProfile});


  useEffect(() => {
    if(userProfile){
      getMyProfilePhoto()
    }
  }, [userProfile, getMyProfilePhoto]);

  const menuVariants = {
    hidden: { height: 0, opacity: 0 },
    visible: { height: 'auto', opacity: 1, transition: { duration: 0.3, ease: 'easeInOut' } },
    exit: { height: 0, opacity: 0, transition: { duration: 0.2 } },
  };

  const handleExpand = (index) => {
    setExpanded((prev) => (prev === index ? null : index));
  };

  return (
    <Menu>
      <Menu.Trigger>
        <div className="flex items-center gap-2 cursor-pointer">
          <FallBackAvatar
            src={profilePhoto}
            alt={getInitials(userProfile?.displayName)}
            className={'h-9 w-9 text-xl lg:h-12 lg:w-12 lg:text-2xl'}
          />
          <span className="hidden lg:flex text-sm text-white w-36 gap-1">
            {userProfile?.displayName}
            <ChevronDown size={16} color="#EB8210" />
          </span>
        </div>
      </Menu.Trigger>

      <Menu.Content className="z-50">
        <motion.div
          initial="hidden"
          exit="exit"
          animate={IconButton ? 'visible' : 'hidden'}
          variants={menuVariants}
          className="z-50 w-full overflow-hidden"
        >
          <Menu.Item className="text-error hover:bg-primary-500/10 hover:text-primary-500 focus:bg-primary-500/10 focus:text-primary-500 dark:hover:text-primary-500 dark:focus:text-primary-500">
            <NavLink to="/home/profile" className="w-full  flex">
              <UserCircleIcon className="mr-2 h-[18px] w-[18px]" />
              {t('home.menu.profile')}
            </NavLink>
          </Menu.Item>
          <Menu.Item
            className="text-error hover:bg-primary-500/10 hover:text-primary-500 focus:bg-primary-500/10 focus:text-primary-500 dark:hover:text-primary-500 dark:focus:text-primary-500"
          >
            <NavLink to='/home/feedbacks' className={'w-full  flex'}>
              <MessageCircleCode className="mr-2 h-[18px] w-[18px]" />
              {t('home.menu.feedback')}  
            </NavLink>
            
          </Menu.Item>

          {(role == 'admin') && linkAdmin.map(({ value, isDropdown, url, subLinks, IconValue }, index) =>
            isDropdown ? (
              <Menu key={index} >
                <Menu.Trigger as={Menu.Item} className="flex items-center justify-between" >
                  <IconValue className="mr-2 h-[18px] w-[18px]" />
                  {value}
                  <ChevronRight className="h-4 w-4 translate-x-1" />
                </Menu.Trigger>
                <Menu.Content>
                  {subLinks.map(({ url, value, IconValue }, subIndex) => (
                    <Menu.Item key={subIndex} className="text-error hover:bg-primary-500/10 hover:text-primary-500 focus:bg-primary-500/10 focus:text-primary-500 dark:hover:text-primary-500 dark:focus:text-primary-500">
                      <NavLink to={url} className={'w-full  flex'}>
                        <IconValue className="mr-2 h-[18px] w-[18px]" />
                        {value}</NavLink>
                    </Menu.Item>
                  ))}
                </Menu.Content>
              </Menu>
            ) : (
              <Menu.Item key={index} className="text-error hover:bg-primary-500/10 hover:text-primary-500 focus:bg-primary-500/10 focus:text-primary-500 dark:hover:text-primary-500 dark:focus:text-primary-500">
                <NavLink to={url} className={'w-full  flex'}>
                  <IconValue className="mr-2 h-[18px] w-[18px]" />
                  {value}
                </NavLink>
                </Menu.Item>
                
            )
          )}

          
          <hr />

          <Menu.Item
            onClick={logout}
            className="text-error hover:bg-primary-500/10 hover:text-primary-500 focus:bg-primary-500/10 focus:text-primary-500 dark:hover:text-primary-500 dark:focus:text-primary-500"
          >
            <LogOutIcon className="mr-2 h-[18px] w-[18px]" />
            {t('home.menu.logout')}
          </Menu.Item>
        </motion.div>
      </Menu.Content>
    </Menu>
  );
}
