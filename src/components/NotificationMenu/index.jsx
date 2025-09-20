import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Clock, X, Mail, MailOpen, AlertCircle, Loader2 } from "lucide-react";
import { useGraph } from "@/hooks/useGraph";
import { useTranslation } from "react-i18next";

// MenuItem component for emails
const EmailItem = ({ email, onClick }) => {
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    return `${diffDays} days ago`;
  };

  return (
    <div
      className="flex gap-3 p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer"
      onClick={() => onClick && onClick(email)}
    >
      <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
        {email.isRead ? (
          <MailOpen className="h-5 w-5 text-primary-600" />
        ) : (
          <Mail className="h-5 w-5 text-primary-800" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className={`text-sm truncate ${!email.isRead ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}`}>
            {email.subject || 'No Subject'}
          </p>
          {email.importance === 'high' && (
            <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
          )}
        </div>
        <p className="text-xs text-gray-600 truncate">
          From: {email.from?.emailAddress?.name || email.from?.emailAddress?.address || 'Unknown'}
        </p>
        <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
          <Clock className="h-3 w-3" />
          <span>{formatDate(email.receivedDateTime)}</span>
        </div>
        {email.bodyPreview && (
          <p className="text-xs text-gray-500 mt-1 line-clamp-2 truncate">
            {email.bodyPreview}
          </p>
        )}
      </div>
    </div>
  );
};

// Filter buttons component
const FilterButtons = ({ activeFilter, onFilterChange, dateRange, onDateRangeChange }) => {
  const statusFilters = [
    { key: 'all', label: 'All' },
    { key: 'unread', label: 'Unread' },
    { key: 'important', label: 'Important' }
  ];

  const dateRanges = [
    { key: 7, label: '7d' },
    { key: 15, label: '15d' },
    { key: 30, label: '30d' }
  ];

  return (
    <div className="p-4 border-b border-gray-200 space-y-3">
      <div className="flex gap-2">
        {statusFilters.map(filter => (
          <button
            key={filter.key}
            onClick={() => onFilterChange(filter.key)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${activeFilter === filter.key
              ? 'bg-primary-100 text-primary-800'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
          >
            {filter.label}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        {dateRanges.map(range => (
          <button
            key={range.key}
            onClick={() => onDateRangeChange(range.key)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${dateRange === range.key
              ? 'bg-green-100 text-green-800'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
          >
            {range.label}
          </button>
        ))}
      </div>
    </div>
  );
};

// Animation variants
const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.3 } },
  exit: { opacity: 0, transition: { duration: 0.2, delay: 0.1 } }
};

const drawerVariants = {
  hidden: { x: 300, opacity: 0 },
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
    x: 300,
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
  hidden: { x: 20, opacity: 0 },
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
  hidden: { x: 20, opacity: 0 },
  visible: {
    x: 0,
    opacity: 1,
    transition: {
      delay: 0.1,
      duration: 0.3
    }
  }
};

const filterVariants = {
  hidden: { x: 20, opacity: 0 },
  visible: {
    x: 0,
    opacity: 1,
    transition: {
      delay: 0.15,
      duration: 0.3
    }
  }
};

export default function EmailNotificationMenu({ email = [], unreadCounts = 0 }) {
  const [isOpen, setIsOpen] = useState(false);
  const [emails, setEmails] = useState(email);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeFilter, setActiveFilter] = useState('unread');
  const [dateRange, setDateRange] = useState(7);
  const [unreadCount, setUnreadCount] = useState(0);
  const { getEmails } = useGraph()

  useEffect(() => {
    setUnreadCount(unreadCounts)
  }, [unreadCounts]);

  // Load emails when filters change
  useEffect(() => {
    if (isOpen) {
      loadEmails();
    }
  }, [isOpen, activeFilter, dateRange]);

  const loadEmails = async () => {
    const result = await getEmails({
      dateRange,
      status: activeFilter,
      top: 50
    });

    if (result.success) {
      setEmails(result.emails);
      setUnreadCount(result.emails.filter(email => !email.isRead).length);
      setError(null);
    } else {
      setError(result.error);
    }
  };

  const handleEmailClick = (email) => {

    openEmailInOutlook(email);
    // Here you could open email in a modal, mark as read, etc.
  };

  const handleFilterChange = (filter) => {
    setActiveFilter(filter);
  };

  const handleDateRangeChange = (range) => {
    setDateRange(range);
  };

  const openEmailInOutlook = (email) => {
    try {
      // Method 1: Try to open in Outlook Web App (works in browsers)
      const outlookWebUrl = `https://outlook.office.com/mail/deeplink/read/${email.id}`;

      // Method 2: Try to open in desktop Outlook app (if available)
      const outlookDesktopUrl = `ms-outlook://emails/view/${email.id}`;

      // Method 3: Fallback to compose new email to sender
      const mailtoUrl = `mailto:${email.from?.emailAddress?.address}?subject=RE: ${encodeURIComponent(email.subject || '')}`;

      // Detect if user is on mobile or desktop
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

      if (isMobile) {
        // On mobile, try Outlook mobile app first, then web
        const outlookMobileUrl = `ms-outlook://emails/view/${email.id}`;

        // Try to open in Outlook mobile app
        window.location.href = outlookMobileUrl;

        // Fallback to web after short delay if app doesn't open
        setTimeout(() => {
          window.open(outlookWebUrl, '_blank');
        }, 1000);

      } else {
        // On desktop, try multiple methods

        // Second try: Outlook Web App
        const tryWebApp = () => {
          window.open(outlookWebUrl, '_blank', 'noopener,noreferrer');
        };

        // Third try: Mailto fallback
        const tryMailto = () => {
          window.location.href = mailtoUrl;
        };


        // If desktop app doesn't work, try web app after short delay
        setTimeout(() => {
          // Ask user which method they prefer
          const userChoice = confirm(
            'Would you like to open this email in:\n\n' +
            'OK = Outlook Web App (browser)\n' +
            'Cancel = Default email client'
          );

          if (userChoice) {
            tryWebApp();
          } else {
            tryMailto();
          }
        }, 500);
      }


    } catch (error) {
      console.error('Error opening email:', error);

      // Ultimate fallback - copy email details to clipboard
      const emailText = `Subject: ${email.subject}\nFrom: ${email.from?.emailAddress?.name} <${email.from?.emailAddress?.address}>\nDate: ${email.receivedDateTime}\n\n${email.bodyPreview}`;

      if (navigator.clipboard) {
        navigator.clipboard.writeText(emailText).then(() => {
          alert('Email details copied to clipboard!');
        });
      } else {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = emailText;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        alert('Email details copied to clipboard!');
      }
    }
  };

  const displayEmails = emails || [];
  const filteredEmails = displayEmails.filter(email => {
    if (activeFilter === 'unread') return !email.isRead;
    if (activeFilter === 'important') return email.importance === 'high';
    return true;
  });

  return (
    <div className="flex justify-center items-center">
      {/* Bell Button with notification badge */}
      <button
        onClick={() => setIsOpen(true)}
        className="relative text-white px-4 py-2 hover:bg-white hover:bg-opacity-10 rounded-lg transition-all duration-300 ease-out transform hover:scale-105 active:scale-95"
        aria-label="Open email notifications"
      >
        <Bell className="h-5 w-5" />
        {(unreadCount > 0) && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center animate-pulse">
            {Math.min(unreadCount, 99)}
          </span>
        )}
      </button>

      {/* Drawer with AnimatePresence */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop overlay */}
            <motion.div
              key="backdrop"
              variants={overlayVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="fixed inset-0 bg-black bg-opacity-50 z-40"
              onClick={() => setIsOpen(false)}
            />

            {/* Drawer panel */}
          <motion.div
  key="drawer"
  variants={drawerVariants}
  initial="hidden"
  animate="visible"
  exit="exit"
  className="fixed top-0 right-0 bottom-0 w-3/4 sm:w-96 md:w-80 lg:w-96 bg-white shadow-2xl z-50 overflow-hidden"
>
  {/* Drawer header */}
  <motion.div
    variants={headerVariants}
    initial="hidden"
    animate="visible"
    className="flex justify-between items-center p-3 sm:p-4 border-b border-gray-200 bg-gradient-to-r from-white to-gray-50"
  >
    <h3 className="font-semibold text-base sm:text-lg">Notifications</h3>
    <button
      onClick={() => setIsOpen(false)}
      className="p-1 rounded-full hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-300"
      aria-label="Close notifications"
    >
      <X className="h-5 w-5 sm:h-6 sm:w-6" />
    </button>
  </motion.div>

  {/* Filter buttons */}
  <motion.div
    variants={filterVariants}
    initial="hidden"
    animate="visible"
    className="px-2 sm:px-0"
  >
    <FilterButtons
      activeFilter={activeFilter}
      onFilterChange={handleFilterChange}
      dateRange={dateRange}
      onDateRangeChange={handleDateRangeChange}
    />
  </motion.div>

  {/* Email list */}
  <div className="flex-1 overflow-y-auto" style={{ height: 'calc(100vh - 120px)' }}>
    {loading ? (
      <div className="flex items-center justify-center p-6 sm:p-8">
        <Loader2 className="h-5 w-5 sm:h-6 sm:w-6 animate-spin text-primary-600" />
        <span className="ml-2 text-sm sm:text-base text-gray-600">Loading emails...</span>
      </div>
    ) : error ? (
      <div className="p-3 sm:p-4 text-center text-red-600">
        <p className="text-xs sm:text-sm">Error loading emails:</p>
        <p className="text-xs mt-1">{error}</p>
      </div>
    ) : filteredEmails.length === 0 ? (
      <div className="p-6 sm:p-8 text-center text-gray-500">
        <Mail className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-2 opacity-50" />
        <p className="text-sm sm:text-base">No emails found</p>
      </div>
    ) : (
      <div className="pb-4">
        {filteredEmails.map((email, index) => (
          <motion.div
            key={email.id}
            custom={index}
            variants={itemVariants}
            initial="hidden"
            animate="visible"
            className="px-2 sm:px-0"
          >
            <EmailItem
              email={email}
              onClick={handleEmailClick}
            />
          </motion.div>
        ))}
      </div>
    )}
  </div>
</motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
