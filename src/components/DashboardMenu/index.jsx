import { useState } from "react";
import { motion, AnimatePresence } from 'framer-motion';
import { XIcon, ChevronDown, ChevronUp, MenuIcon, X } from "lucide-react";
import { NavLink } from "react-router-dom";


// MenuItem component (for direct links)
const MenuItem = ({ url, value }) => {
    return (
        <NavLink
            to={url}
            className={({ isActive }) =>
                isActive
                    ? 'flex gap-3 p-4 border-l-2 border-primary-500 hover:bg-gray-50'
                    : 'flex gap-3 p-4 border-b border-gray-100 hover:bg-gray-50'
            }
        >
            {value}
        </NavLink>
    );
};

// DropdownMenuItem component (for dropdown links)
const DropdownMenuItem = ({ value, subLinks }) => {
    const [open, setOpen] = useState(false);

    return (
        <div className="border-b border-gray-100">
            <div
                onClick={() => setOpen(!open)}
                className="flex justify-between items-center p-4 cursor-pointer hover:bg-gray-50"
            >
                <span>{value}</span>
                <span>{open ? <ChevronUp className="w-4 h-4" /> :<ChevronDown className="w-4 h-4" /> }</span>
            </div>
            {open && (
                <div className="ml-4">
                    {subLinks.map((link, index) => (
                        <MenuItem key={index} url={link.url} value={link.value} />
                    ))}
                </div>
            )}
        </div>
    );
};

const linkArticles = [
    { value: "Analytics & Reporting", url: "/home/analytics" },
    {
        value: "Content Management",
        isDropdown: true,
        subLinks: [
            { value: "Courses", url: "/home/content-management/course" },
            { value: "Articles", url: "/home/content-management/articles" },
            { value: "Documents", url: "/home/content-management/documents" },
        ],
    },
    { value: "System Audit", url: "/home/system-audit" },
];

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

export default function DashboardMenu() {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="">
            {/* Bell Button */}
            <button
      onClick={() => setIsOpen(!isOpen)}
      className="px-4 py-2 text-white focus:outline-none flex justify-center"
      aria-label={isOpen ? 'Close menu' : 'Open menu'}
    >
      <motion.span
        initial={false}
        animate={{ rotate: isOpen ? 90 : 0 }}
        transition={{ duration: 0.3 }}
        className="inline-block"
      >
        <AnimatePresence mode="wait" initial={false}>
          {isOpen ? (
            <motion.div
              key="x-icon"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{
                opacity: { duration: 0.2 },
                scale: { duration: 0.2 },
              }}
              className="origin-center"
            >
              <XIcon className="h-5 w-5 stroke-2 text-black" />
            </motion.div>
          ) : (
            <motion.div
              key="grid-icon"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{
                opacity: { duration: 0.2 },
                scale: { duration: 0.2 },
              }}
              className="origin-center"
            >
              <MenuIcon className="h-5 w-5 stroke-2 text-black" /> {/* Replace with LayoutGridIcon if needed */}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.span>
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
                            className="absolute top-0 left-0 bottom-0 w-80 bg-white shadow-lg z-50 overflow-hidden"
                        >
                            {/* Drawer header */}
                            <div className="flex justify-between items-center p-4 border-b border-gray-200">
                                <h3 className="font-medium">Dashboard</h3>
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="p-1 rounded-full hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-300"
                                    aria-label="Close notifications"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>

                            {/* Notification items with staggered animation */}
                            <div className="overflow-y-auto max-h-full overflow-hidden">
                                {linkArticles.map((item, index) => (
                                    <motion.div
                                        key={item.id}
                                        custom={index}
                                        variants={itemVariants}
                                        initial="hidden"
                                        animate="visible"
                                    >
                                        {item.isDropdown ? (
                                            <DropdownMenuItem
                                                key={index}
                                                value={item.value}
                                                subLinks={item.subLinks}
                                            />
                                        ) : (
                                            <MenuItem key={index} url={item.url} value={item.value} />
                                        )}
                                    </motion.div>
                                ))}
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}
