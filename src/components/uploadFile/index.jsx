import React, { useState, useRef } from 'react';
import { X, Upload, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Typography } from '@material-tailwind/react';
import SelectDropdown from '../SelectDropdown';
import { useSharePoint } from '@/hooks/useSharePoint';
import { generateUUIDv4 } from '@/utils/constants';
import { useAuth } from '@/hooks/useAuth';

const UploadFile = ({ fetchFiles }) => {
  const { addFile, logAuditEvent } = useSharePoint()
  const { userProfile } = useAuth()
  const [files, setFiles] = useState([]);
  const [category, setCategory] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const fileInputRef = useRef(null);

  const supportedFormats = ['.png', '.jpg', '.svg', ".pdf", ".docx", ".doc", ".xlsx", ".xlx", ".ppt", ".pptx", ".mp4"];
  const maxFileSize = 10 * 1024 * 1024; // 10MB


  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const validateFile = (file) => {
    const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
    if (!supportedFormats.includes(fileExtension)) {
      alert(`File type ${fileExtension} is not supported. Please upload ${supportedFormats.join(', ')} files.`);
      return false;
    }
    if (file.size > maxFileSize) {
      alert('File size exceeds 10MB limit.');
      return false;
    }
    return true;
  };

  const handleFiles = (newFiles) => {
    const validFiles = Array.from(newFiles).filter(validateFile);
    const filesWithId = validFiles.map(file => ({
      id: Date.now() + Math.random(),
      file: file,
      name: file.name,
      size: file.size,
      preview: URL.createObjectURL(file)
    }));
    setFiles(prev => [...prev, ...filesWithId]);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleFileInput = (e) => {
    handleFiles(e.target.files);
    e.target.value = '';
  };

  const removeFile = (id) => {
    setFiles(prev => {
      const fileToRemove = prev.find(f => f.id === id);
      if (fileToRemove) {
        URL.revokeObjectURL(fileToRemove.preview);
      }
      return prev.filter(f => f.id !== id);
    });
  };

  const handleChooseFile = () => {
    fileInputRef.current?.click();
  };
  console.log({ category });

  const handleSubmit = async () => {

    files.map(async (fil) => {
      let uniqueID = generateUUIDv4()
      const file = { uniqueID, ...fil }
      await addFile({ file, category })

      await logAuditEvent({
        title: `upload a file with the name ${file?.name}`,
        userEmail: userProfile?.mail,
        userName: userProfile?.displayName,
        actionType: "Upload",
        details: `User uploaded a new file with the name "${file?.name}".`,
      });
    })

    setFiles([])
    fetchFiles();
    // alert(`Uploading ${files.length} file(s)`);
  };

  const handleCancel = () => {
    files.forEach(file => URL.revokeObjectURL(file.preview));
    setFiles([]);
    setIsModalOpen(false);
  };

  // Animation variants
  const modalVariants = {
    hidden: {
      opacity: 0,
      scale: 0.8,
      y: 50
    },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 30,
        duration: 0.4
      }
    },
    exit: {
      opacity: 0,
      scale: 0.8,
      y: 50,
      transition: {
        duration: 0.3
      }
    }
  };

  const overlayVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { duration: 0.3 }
    },
    exit: {
      opacity: 0,
      transition: { duration: 0.3 }
    }
  };

  const uploadAreaVariants = {
    normal: {
      scale: 1,
      borderColor: "rgb(209 213 219)",
      backgroundColor: "rgb(255 255 255)"
    },
    dragOver: {
      scale: 1.02,
      borderColor: "rgb(96 165 250)",
      backgroundColor: "rgb(239 246 255)",
      transition: {
        type: "spring",
        stiffness: 400,
        damping: 30
      }
    }
  };

  const iconVariants = {
    normal: {
      scale: 1,
      rotate: 0,
      color: "rgb(75 85 99)"
    },
    dragOver: {
      scale: 1.1,
      rotate: 5,
      color: "rgb(37 99 235)",
      transition: {
        type: "spring",
        stiffness: 400,
        damping: 30
      }
    },
    hover: {
      scale: 1.05,
      transition: { duration: 0.2 }
    }
  };

  const fileItemVariants = {
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
        type: "spring",
        stiffness: 300,
        damping: 25
      }
    },
    exit: {
      opacity: 0,
      y: -20,
      scale: 0.95,
      transition: { duration: 0.2 }
    }
  };

  const buttonVariants = {
    hover: {
      scale: 1.02,
      transition: { duration: 0.2 }
    },
    tap: {
      scale: 0.98,
      transition: { duration: 0.1 }
    }
  };

  const trashVariants = {
    hover: {
      scale: 1.1,
      rotate: 5,
      color: "rgb(239 68 68)",
      transition: { duration: 0.2 }
    },
    tap: {
      scale: 0.9,
      transition: { duration: 0.1 }
    }
  };
  const handleCategory = (filterkey, val) => {
    setCategory(val)
  }
  if (!isModalOpen) {
    return (
      <div className="flex items-center justify-center">
        <motion.button
          onClick={() => {

            setCategory('')
            setIsModalOpen(true)
          }
          }
          className="flex items-center w-11 h-11 gap-3 text-white hover:bg-alternative-300 bg-alternative-400 px-3 py-2 rounded-full whitespace-nowrap"
          variants={buttonVariants}
          whileHover="hover"
          whileTap="tap"
        >
          <Upload />
        </motion.button>
      </div>
    );
  }

  return (
    <AnimatePresence>
      {isModalOpen && (
        <motion.div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          variants={overlayVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
        >
          <motion.div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden"
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            {/* Header */}
            <motion.div
              className="flex items-center justify-between p-6 border-b border-gray-200"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.3 }}
            >
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Upload Files</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Upload resourses in the platform.
                </p>
              </div>
              <motion.button
                onClick={handleCancel}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                variants={buttonVariants}
                whileHover="hover"
                whileTap="tap"
              >
                <X className="w-5 h-5 text-gray-500" />
              </motion.button>
            </motion.div>

            {/* Upload Area */}
            <motion.div
              className="p-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.3 }}
            >
              <motion.div
                className=" text-center transition-all duration-200 mb-4 w-full"
              >
                <div className="flex flex-col items-center w-full">
                  <SelectDropdown options={[{ value: 'article', label: 'article' }, { value: 'guide', label: 'guide' }, { value: 'book', label: 'book' }]} value={category} onChange={handleCategory} placeholder={'Select the category'} />
                </div>
              </motion.div>

              <motion.div
                className="border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200"
                variants={uploadAreaVariants}
                animate={isDragOver ? "dragOver" : "normal"}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                whileHover={{ scale: 1.01 }}
              >
                <div className="flex flex-col items-center">
                  <motion.div
                    className={`p-3 rounded-full mb-4 ${isDragOver ? 'bg-gray-100' : 'bg-gray-50'
                      }`}
                    variants={iconVariants}
                    animate={isDragOver ? "dragOver" : "normal"}
                    whileHover="hover"
                  >
                    <Upload className="w-8 h-8" />
                  </motion.div>
                  <motion.p
                    className="text-lg font-medium text-gray-500 mb-2"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                  >
                    Drag and Drop or{' '}
                    <motion.button
                      onClick={handleChooseFile}
                      className="text-primary-500  font-medium"
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      Choose a Local File
                    </motion.button>
                  </motion.p>
                  <motion.p
                    className="text-sm text-gray-500"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                  >
                    Supported formats: {supportedFormats.join(', ')}
                  </motion.p>
                </div>
              </motion.div>

              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".png,.jpg,.jpeg,.svg, .pdf, .xlsx, .docx, .doc, .xlx, .ppt, .pptx"
                onChange={handleFileInput}
                className="hidden"
              />

              {/* File List */}
              <AnimatePresence>
                {files.length > 0 && (
                  <motion.div
                    className="mt-6 space-y-3 max-h-60 overflow-y-auto"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <AnimatePresence>
                      {files.map((fileItem) => (
                        <motion.div
                          key={fileItem.id}
                          className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200"
                          variants={fileItemVariants}
                          initial="hidden"
                          animate="visible"
                          exit="exit"
                          layout
                          whileHover={{
                            scale: 1.01,
                            boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
                          }}
                        >
                          <div className="flex items-center space-x-3">
                            <motion.div
                              className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0"
                              whileHover={{ scale: 1.05 }}
                            >
                              <img
                                src={fileItem.preview}
                                alt={fileItem.name}
                                className="w-full h-full object-fit"
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                  e.target.nextSibling.style.display = 'flex';
                                }}
                              />
                              <div className="w-full h-full bg-gray-800 hidden items-center justify-center">
                                <span className="text-white text-xs font-medium">
                                  {fileItem.name.split('.').pop().toUpperCase()}
                                </span>
                              </div>
                            </motion.div>
                            <div>
                              <p className="font-medium text-gray-900 truncate max-w-xs">
                                {fileItem.name}
                              </p>
                              <p className="text-sm text-gray-500">
                                {formatFileSize(fileItem.size)}
                              </p>
                            </div>
                          </div>
                          <motion.button
                            onClick={() => removeFile(fileItem.id)}
                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                            variants={trashVariants}
                            whileHover="hover"
                            whileTap="tap"
                          >
                            <Trash2 className="w-4 h-4" />
                          </motion.button>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* Footer */}
            <motion.div
              className="flex items-center justify-end space-x-3 p-3 border-t border-gray-200 bg-gray-50"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.3 }}
            >
              <motion.button
                onClick={handleCancel}
                className="px-6 py-2 text-gray-700 font-normal rounded-lg hover:bg-gray-100 transition-colors"
                variants={buttonVariants}
                whileHover="hover"
                whileTap="tap"
              >
                Cancel
              </motion.button>
              <motion.button
                onClick={handleSubmit}
                disabled={files.length === 0}
                className={`px-6 py-2 font-normal rounded-lg transition-colors ${files.length > 0
                  ? 'text-primary-500 hover:bg-secondary'
                  : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                  }`}
                variants={buttonVariants}
                whileHover={files.length > 0 ? "hover" : {}}
                whileTap={files.length > 0 ? "tap" : {}}
                animate={files.length > 0 ? { opacity: 1 } : { opacity: 0.6 }}
              >
                Submit
              </motion.button>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default UploadFile;
