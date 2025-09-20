import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { LayoutGridIcon, MenuIcon, XIcon } from 'lucide-react';

const MegaNavMenu = () => {
  const [isOpen, setIsOpen] = useState(false);

  const menuVariants = {
    hidden: { height: 0, opacity: 0 },
    visible: { height: 'auto', opacity: 1, transition: { duration: 0.3, ease: 'easeInOut' } },
    exit: { height: 0, opacity: 0, transition: { duration: 0.2 } },
  };

  const navItems = [
    {
      title: 'Products',
      links: ['All Products', 'Laptops', 'Phones', 'Accessories'],
    },
    {
      title: 'Services',
      links: ['Repair', 'Installation', 'Consulting', 'Training'],
    },
    {
      title: 'Company',
      links: ['About Us', 'Careers', 'Blog', 'Contact'],
    },
  ];

  return (
    <div className="">
      {/* Menu Toggle Button */}
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
              <XIcon className="h-5 w-5 stroke-2 text-white" />
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
              <LayoutGridIcon className="h-5 w-5 stroke-2 text-white" /> {/* Replace with LayoutGridIcon if needed */}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.span>
    </button>

      {/* Slide Down Mega Menu */}
      <motion.div
        initial="hidden"
        animate={isOpen ? 'visible' : 'hidden'}
        exit="exit"
        variants={menuVariants}
        className="absolute left-0 right-0 top-[136px] z-50 w-full bg-white shadow-lg overflow-hidden"
      >
        <div className="conatiner grid grid-cols-1 md:grid-cols-3 gap-6 p-6">
          {navItems.map((column, index) => (
            <div key={index}>
              <h3 className="text-lg font-semibold text-gray-800 mb-3">{column.title}</h3>
              <ul className="space-y-2">
                {column.links.map((link, idx) => (
                  <li key={idx}>
                    <a href={`/${link.toLowerCase().replace(' ', '-')}`}>
                      <a className="text-gray-600 hover:text-primary-600 transition-colors">
                        {link}
                      </a>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Backdrop for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-30 z-40 md:hidden"
          onClick={() => setIsOpen(false)}
        ></div>
      )}
    </div>
  );
};

export default MegaNavMenu;
