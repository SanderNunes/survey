// import React, { useState, useRef } from 'react';
// import { Upload, File, X, AlertCircle } from 'lucide-react';
// import { Button } from '@material-tailwind/react';


// export default function GeneralFileUpload({ title, maxFiles = 5, files, setFiles }) {
//   const [dragActive, setDragActive] = useState(false);
//   const [error, setError] = useState('');
//   const inputRef = useRef(null);

//   const handleDrag = (e) => {
//     e.preventDefault();
//     e.stopPropagation();
//     if (e.type === "dragenter" || e.type === "dragover") {
//       setDragActive(true);
//     } else if (e.type === "dragleave") {
//       setDragActive(false);
//     }
//   };

//   const handleDrop = (e) => {
//     e.preventDefault();
//     e.stopPropagation();
//     setDragActive(false);

//     if (e.dataTransfer.files && e.dataTransfer.files[0]) {
//       handleFiles(e.dataTransfer.files);
//     }
//   };

//   const handleChange = (e) => {
//     e.preventDefault();
//     if (e.target.files && e.target.files[0]) {
//       handleFiles(e.target.files);
//     }
//   };

//   const handleFiles = (fileList) => {
//     setError(''); // Clear any previous errors

//     const newFilesArray = Array.from(fileList);
//     const currentFileCount = files.length;
//     const newFileCount = newFilesArray.length;
//     const totalFiles = currentFileCount + newFileCount;

//     // Check if adding new files would exceed the limit
//     if (totalFiles > maxFiles) {
//       const allowedNewFiles = maxFiles - currentFileCount;
//       if (allowedNewFiles <= 0) {
//         setError(`Maximum ${maxFiles} files allowed. Please remove some files first.`);
//         return;
//       } else {
//         setError(`Only ${allowedNewFiles} more file(s) can be added. Maximum ${maxFiles} files allowed.`);
//         // Take only the allowed number of files
//         newFilesArray.splice(allowedNewFiles);
//       }
//     }

//     const newFiles = newFilesArray.map(file => ({
//       file,
//       id: Math.random().toString(36).substr(2, 9),
//       name: file.name,
//       size: file.size,
//       type: file.type
//     }));

//     setFiles(prev => [...prev, ...newFiles]);

//     // Reset input value to allow selecting the same files again if needed
//     if (inputRef.current) {
//       inputRef.current.value = '';
//     }
//   };

//   const onButtonClick = () => {
//     if (files.length >= maxFiles) {
//       setError(`Maximum ${maxFiles} files allowed. Please remove some files first.`);
//       return;
//     }
//     inputRef.current?.click();
//   };

//   const removeFile = (id) => {
//     setFiles(prev => prev.filter(file => file.id !== id));
//     setError(''); // Clear error when files are removed
//   };

//   const formatFileSize = (bytes) => {
//     if (bytes === 0) return '0 Bytes';
//     const k = 1024;
//     const sizes = ['Bytes', 'KB', 'MB', 'GB'];
//     const i = Math.floor(Math.log(bytes) / Math.log(k));
//     return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
//   };

//   const isMaxFilesReached = files.length >= maxFiles;

//   return (
//     <div className="bg-white">
//       <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
//         {title}
//       </label>

//       {/* Error Message */}
//       {error && (
//         <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-start gap-2">
//           <AlertCircle size={18} className="text-red-500 mt-0.5 flex-shrink-0" />
//           <p className="text-sm text-red-700">{error}</p>
//         </div>
//       )}

//       {/* File Count Indicator */}
//       <div className="mb-3 text-sm text-gray-600">
//         Files selected: {files.length}/{maxFiles}
//         {isMaxFilesReached && (
//           <span className="ml-2 text-amber-600 font-medium">
//             (Maximum reached)
//           </span>
//         )}
//       </div>

//       {/* Upload Area */}
//       <div
//         className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200 ${
//           isMaxFilesReached
//             ? 'border-gray-200 bg-gray-100 opacity-60'
//             : dragActive
//             ? 'border-primary-500 bg-primary-100'
//             : 'border-gray-300 bg-gray-50 hover:border-gray-400'
//         }`}
//         onDragEnter={!isMaxFilesReached ? handleDrag : undefined}
//         onDragLeave={!isMaxFilesReached ? handleDrag : undefined}
//         onDragOver={!isMaxFilesReached ? handleDrag : undefined}
//         onDrop={!isMaxFilesReached ? handleDrop : undefined}
//       >
//         <input
//           ref={inputRef}
//           type="file"
//           multiple
//           onChange={handleChange}
//           className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
//           disabled={isMaxFilesReached}
//         />

//         <div className="flex flex-col items-center space-y-4">
//           <Upload
//             size={48}
//             className={`${
//               isMaxFilesReached
//                 ? 'text-gray-300'
//                 : dragActive
//                 ? 'text-primary-500'
//                 : 'text-gray-400'
//             } transition-colors duration-200`}
//           />
//           <div>
//             <p className="text-lg font-medium text-gray-700">
//               {isMaxFilesReached
//                 ? 'Maximum files reached'
//                 : dragActive
//                 ? 'Drop files here'
//                 : 'Drag & drop files here'}
//             </p>
//             {!isMaxFilesReached && (
//               <>
//                 <p className="text-sm text-gray-500 mt-1">or</p>
//                 <Button
//                 variant='ghost'
//                   onClick={onButtonClick}
//                   className="mt-3 px-4 py-2 "
//                 >
//                   Browse Files
//                 </Button>
//               </>
//             )}
//           </div>
//         </div>
//       </div>

//       {/* File List */}
//       {files.length > 0 && (
//         <div className="mt-6">
//           <h3 className="text-lg font-semibold text-gray-800 mb-3">
//             Selected Files ({files.length})
//           </h3>
//           <div className="space-y-2">
//             {files.map((fileItem) => (
//               <div
//                 key={fileItem.id}
//                 className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border"
//               >
//                 <div className="flex items-center space-x-3">
//                   <File size={20} className="text-gray-500" />
//                   <div>
//                     <p className="font-medium text-gray-800 truncate max-w-xs">
//                       {fileItem.name}
//                     </p>
//                     <p className="text-sm text-gray-500">
//                       {formatFileSize(fileItem.size)} • {fileItem.type || 'Unknown type'}
//                     </p>
//                   </div>
//                 </div>
//                 <button
//                   onClick={() => removeFile(fileItem.id)}
//                   className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors duration-200"
//                 >
//                   <X size={18} />
//                 </button>
//               </div>
//             ))}
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }


import React, { useState, useRef } from 'react';
import { Upload, File, X, AlertCircle, Folder } from 'lucide-react';
import { Button } from '@material-tailwind/react';

export default function GeneralFileUpload({ title, maxFiles = 5, files, setFiles }) {
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef(null);
  const folderInputRef = useRef(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFiles(e.target.files);
    }
  };

  const handleFolderChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFiles(e.target.files, true);
    }
  };

  const handleFiles = (fileList, isFolder = false) => {
    setError(''); // Clear any previous errors

    const newFilesArray = Array.from(fileList);
    const currentFileCount = files.length;
    const newFileCount = newFilesArray.length;
    const totalFiles = currentFileCount + newFileCount;

    // Check if adding new files would exceed the limit
    if (totalFiles > maxFiles) {
      const allowedNewFiles = maxFiles - currentFileCount;
      if (allowedNewFiles <= 0) {
        setError(`Maximum ${maxFiles} files allowed. Please remove some files first.`);
        return;
      } else {
        setError(`Only ${allowedNewFiles} more file(s) can be added. Maximum ${maxFiles} files allowed.`);
        // Take only the allowed number of files
        newFilesArray.splice(allowedNewFiles);
      }
    }

    const newFiles = newFilesArray.map(file => ({
      file,
      id: Math.random().toString(36).substr(2, 9),
      name: file.name,
      size: file.size,
      type: file.type,
      path: isFolder && file.webkitRelativePath ? file.webkitRelativePath : file.name,
      isFromFolder: isFolder
    }));

    setFiles(prev => [...prev, ...newFiles]);

    // Reset input values to allow selecting the same files again if needed
    if (inputRef.current) {
      inputRef.current.value = '';
    }
    if (folderInputRef.current) {
      folderInputRef.current.value = '';
    }
  };

  const onButtonClick = () => {
    if (files.length >= maxFiles) {
      setError(`Maximum ${maxFiles} files allowed. Please remove some files first.`);
      return;
    }
    inputRef.current?.click();
  };

  // const onFolderButtonClick = () => {
  //   if (files.length >= maxFiles) {
  //     setError(`Maximum ${maxFiles} files allowed. Please remove some files first.`);
  //     return;
  //   }
  //   folderInputRef.current?.click();
  // };

  const removeFile = (id) => {
    setFiles(prev => prev.filter(file => file.id !== id));
    setError(''); // Clear error when files are removed
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getDisplayPath = (fileItem) => {
    if (fileItem.isFromFolder && fileItem.path !== fileItem.name) {
      return fileItem.path;
    }
    return fileItem.name;
  };

  const isMaxFilesReached = files.length >= maxFiles;

  return (
    <div className="bg-white">
      <label className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
        {title}
      </label>

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-start gap-2">
          <AlertCircle size={18} className="text-red-500 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* File Count Indicator */}
      <div className="mb-3 text-sm text-gray-600">
        Files selected: {files.length}/{maxFiles}
        {isMaxFilesReached && (
          <span className="ml-2 text-amber-600 font-medium">
            (Maximum reached)
          </span>
        )}
      </div>

      {/* Upload Area */}
      <div
        className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200 ${
          isMaxFilesReached
            ? 'border-gray-200 bg-gray-100 opacity-60'
            : dragActive
            ? 'border-primary-500 bg-primary-100'
            : 'border-gray-300 bg-gray-50 hover:border-gray-400'
        }`}
        onDragEnter={!isMaxFilesReached ? handleDrag : undefined}
        onDragLeave={!isMaxFilesReached ? handleDrag : undefined}
        onDragOver={!isMaxFilesReached ? handleDrag : undefined}
        onDrop={!isMaxFilesReached ? handleDrop : undefined}
      >
        {/* Regular file input */}
        <input
          ref={inputRef}
          type="file"
          multiple
          onChange={handleChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          disabled={isMaxFilesReached}
          style={{ display: 'none' }}
        />

        {/* Folder input */}
        <input
          ref={folderInputRef}
          type="file"
          webkitdirectory=""
          directory=""
          multiple
          onChange={handleFolderChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          disabled={isMaxFilesReached}
          style={{ display: 'none' }}
        />

        <div className="flex flex-col items-center space-y-4">
          <Upload
            size={48}
            className={`${
              isMaxFilesReached
                ? 'text-gray-300'
                : dragActive
                ? 'text-primary-500'
                : 'text-gray-400'
            } transition-colors duration-200`}
          />
          <div>
            <p className="text-lg font-medium text-gray-700">
              {isMaxFilesReached
                ? 'Maximum files reached'
                : dragActive
                ? 'Drop files here'
                : 'Drag & drop files here'}
            </p>
            {!isMaxFilesReached && (
              <>
                <p className="text-sm text-gray-500 mt-1">or</p>
                <div className="flex items-center justify-center gap-2 mt-3">
                  <Button
                    variant='ghost'
                    onClick={onButtonClick}
                    className="px-4 py-2 flex items-center gap-2"
                  >
                    <File size={16} />
                    Browse Files
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">
            Selected Files ({files.length})
          </h3>
          <div className="space-y-2">
            {files.map((fileItem) => (
              <div
                key={fileItem.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border"
              >
                <div className="flex items-center space-x-3">
                  {fileItem.isFromFolder ? (
                    <Folder size={20} className="text-blue-500" />
                  ) : (
                    <File size={20} className="text-gray-500" />
                  )}
                  <div>
                    <p className="font-medium text-gray-800 truncate max-w-xs">
                      {getDisplayPath(fileItem)}
                    </p>
                    <p className="text-sm text-gray-500">
                      {formatFileSize(fileItem.size)} • {fileItem.type || 'Unknown type'}
                      {fileItem.isFromFolder && (
                        <span className="ml-1 text-blue-600">• From folder</span>
                      )}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => removeFile(fileItem.id)}
                  className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors duration-200"
                >
                  <X size={18} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
