import React, { useState, useRef, useEffect } from 'react';
import { Upload, X, Image as ImageIcon, CheckCircle, AlertCircle } from 'lucide-react';
import { useSharePoint } from '@/hooks/useSharePoint';
import { useParams } from 'react-router-dom';

export const ImageUploadField = ({
  field,
  onChange,
  value,
}) => {
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [uploadStatus, setUploadStatus] = useState(null);
  const [imageFromSP, setImageFromSP] = useState(null);
  const fileInputRef = useRef(null);
  const { slug } = useParams()


  // Use your SharePoint service
  const {
    uploadImageAsAttachment,
    deleteArticleAttachment,
  } = useSharePoint();




  const handleFileUpload = async (file) => {
    setUploading(true);
    setUploadStatus(null);

    try {
      // Ensure we have an article to attach to
      let currentArticleId = slug;

      if (!currentArticleId) {
        console.error('No article available for attachment');
      }

      // Upload the image
      const result = await uploadImageAsAttachment(currentArticleId, file);

      // Update the field with the SharePoint URL
      onChange(result.url);

      setUploadStatus({
        type: 'success',
        message: `Image uploaded successfully: ${result.fileName}`,
        url: result.fullUrl
      });

    } catch (error) {
      console.error('Upload error:', error);
      setUploadStatus({
        type: 'error',
        message: `Upload failed: ${error.message}`
      });
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      await handleFileUpload(file);
    }
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      await handleFileUpload(file);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragActive(false);
  };

  const removeImage = async () => {
    if (value && slug) {
      try {
        const fileName = value.split('/').pop();
        await deleteArticleAttachment(slug, fileName);
        setUploadStatus({
          type: 'success',
          message: 'Image removed successfully'
        });
      } catch (error) {
        console.warn('Could not delete attachment:', error);
      }
    }
    onChange('');
    setUploadStatus(null);
  };

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-700">
        {field.label}
      </label>

      {/* Status Messages */}
      {uploadStatus && (
        <div className={`p-3 rounded-lg border ${
          uploadStatus.type === 'success'
            ? 'bg-green-50 border-green-200 text-green-800'
            : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          <div className="flex items-center">
            {uploadStatus.type === 'success' ? (
              <CheckCircle className="w-5 h-5 mr-2 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0" />
            )}
            <span className="text-sm">{uploadStatus.message}</span>
          </div>
        </div>
      )}

      {value ? (
        // Image Preview
        <div className="relative">
          <img
            src={value.startsWith('http') ? value : `https://africellcloud.sharepoint.com/${value}`}
            alt="Cover image"
            className="w-full h-32 object-cover rounded-lg border border-gray-300"
            onError={(e) => {
              e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDIwMCAxMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMTAwIiBmaWxsPSIjRjNGNEY2Ii8+Cjx0ZXh0IHg9IjEwMCIgeT0iNTUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiM5Q0EzQUYiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCI+SW1hZ2UgTm90IEZvdW5kPC90ZXh0Pgo8L3N2Zz4K';
            }}
          />
          <button
            onClick={removeImage}
            className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
            type="button"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="mt-2 text-xs text-gray-500 break-all">
            SharePoint: {value}
          </div>
        </div>
      ) : (
        // Upload Area
        <div
          className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer ${
            dragActive
              ? 'border-primary-400 bg-primary-50'
              : 'border-gray-300 hover:border-gray-400'
          } ${uploading ? 'pointer-events-none opacity-50' : ''}`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
        >
          {uploading ? (
            <div className="flex flex-col items-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mb-2"></div>
              <p className="text-sm text-gray-600">Uploading to SharePoint...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <ImageIcon className="w-8 h-8 text-gray-400 mb-2" />
              <p className="text-sm text-gray-600 mb-2">
                Drop an image here or click to browse
              </p>
              <p className="text-xs text-gray-400">PNG, JPG, GIF up to 10MB</p>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>
      )}
    </div>
  );
};
