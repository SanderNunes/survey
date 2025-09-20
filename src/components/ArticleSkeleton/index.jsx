import React  from 'react';
import { motion, AnimatePresence } from 'framer-motion';


// Skeleton Loader Component
const ArticleSkeleton = () => {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: {
      opacity: 0,
      y: 20,
      scale: 0.95
    },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: 0.5,
        ease: "easeOut"
      }
    }
  };

  const pulseVariants = {
    initial: { opacity: 0.4 },
    animate: {
      opacity: [0.4, 0.8, 0.4],
      transition: {
        duration: 1.5,
        repeat: Infinity,
        ease: "easeInOut"
      }
    }
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-8"
    >
      {/* Header skeleton */}
      <motion.div variants={itemVariants} className="mb-8">
        <motion.div
          variants={pulseVariants}
          initial="initial"
          animate="animate"
          className="h-8 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded-md w-3/4 mb-4"
        />
        <motion.div
          variants={pulseVariants}
          initial="initial"
          animate="animate"
          style={{ animationDelay: '0.2s' }}
          className="h-4 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded-md w-1/2 mb-2"
        />
        <motion.div
          variants={pulseVariants}
          initial="initial"
          animate="animate"
          style={{ animationDelay: '0.4s' }}
          className="h-4 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded-md w-1/3"
        />
      </motion.div>

      {/* Content blocks skeleton */}
      <motion.div variants={itemVariants} className="space-y-6">
        {/* Text block */}
        <motion.div
          variants={itemVariants}
          className="space-y-3"
        >
          {[1, 0.92, 0.8].map((width, index) => (
            <motion.div
              key={index}
              variants={pulseVariants}
              initial="initial"
              animate="animate"
              style={{
                animationDelay: `${0.6 + index * 0.1}s`,
                width: `${width * 100}%`
              }}
              className="h-4 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded-md"
            />
          ))}
        </motion.div>

        {/* Image placeholder */}
        <motion.div
          variants={itemVariants}
          whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
        >
          <motion.div
            variants={pulseVariants}
            initial="initial"
            animate="animate"
            style={{ animationDelay: '1s' }}
            className="h-48 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded-lg"
          />
        </motion.div>

        {/* More text blocks */}
        <motion.div
          variants={itemVariants}
          className="space-y-3"
        >
          {[1, 0.83, 0.75, 0.92].map((width, index) => (
            <motion.div
              key={index}
              variants={pulseVariants}
              initial="initial"
              animate="animate"
              style={{
                animationDelay: `${1.2 + index * 0.1}s`,
                width: `${width * 100}%`
              }}
              className="h-4 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded-md"
            />
          ))}
        </motion.div>

        {/* Another content block */}
        <motion.div
          variants={itemVariants}
          whileHover={{ scale: 1.01, transition: { duration: 0.2 } }}
        >
          <motion.div
            variants={pulseVariants}
            initial="initial"
            animate="animate"
            style={{ animationDelay: '1.6s' }}
            className="h-32 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded-lg"
          />
        </motion.div>

        {/* Final text block */}
        <motion.div
          variants={itemVariants}
          className="space-y-3"
        >
          {[0.8, 1, 0.67].map((width, index) => (
            <motion.div
              key={index}
              variants={pulseVariants}
              initial="initial"
              animate="animate"
              style={{
                animationDelay: `${1.8 + index * 0.1}s`,
                width: `${width * 100}%`
              }}
              className="h-4 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded-md"
            />
          ))}
        </motion.div>
      </motion.div>
    </motion.div>
  );
};


export default ArticleSkeleton
