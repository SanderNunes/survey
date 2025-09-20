import React, { useState } from 'react';
import { Plus, Edit2, Trash2, Save, X, BookOpen, Clock, Link, FileText, Award, PlusIcon, ArrowLeft } from 'lucide-react';

import { Button } from '@material-tailwind/react';
import { useSharePoint } from '@/hooks/useSharePoint';
import { useParams } from 'react-router-dom';

import GeneralFileUpload from '../GeneraluploadComponent';
import { deployZipToNetlify } from '@/utils/api';

const LessonCreationForm = ({ setformLesson, lessons, fetchLesson, userProfile, courseTitle }) => {

  const [editingLesson, setEditingLesson] = useState(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const { courseID, isView } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { AddLesson, UpdateLesson, DeleteLesson, logAuditEvent } = useSharePoint()
  const [isLoading, setIsLoading] = useState(false);
  const [files, setFiles] = useState([]);
  const [formData, setFormData] = useState({
    title: '',
    contentLink: '',
    order: '',
    hasQuiz: false,
    duration: '',
    additionalContent: '',
    course: courseID,
    chapters: [''],
    courseId: courseID
  });

  const resetForm = () => {
    setFormData({
      title: '',
      contentLink: '',
      order: '',
      hasQuiz: false,
      duration: '',
      additionalContent: '',
      course: '',
      chapters: ['']
    });
  };

  const handleEdit = (lesson) => {
    setEditingLesson(lesson.id);
    setFormData({
      title: lesson.title,
      contentLink: lesson.contentLink,
      order: lesson.order,
      hasQuiz: lesson.hasQuiz,
      duration: lesson.duration,
      additionalContent: lesson.additionalContent,
      course: lesson.course,
      chapters: Array.isArray(lesson.chapters) ? lesson.chapters : [lesson.chapters]
    });
    setIsAddingNew(false);
  };

  const handleAddNew = async () => {
    setIsAddingNew(true);
    setEditingLesson(null);
    resetForm();
  };

  const handleSave = async () => {
    setIsLoading(true)
    if (!formData.title.trim()) {
      alert('Title is required');
      return;
    }

    if (isAddingNew) {
      const newLesson = {
        ...formData,
        courseId: courseID,
        order: parseInt(formData.order) || lessons.length + 1
      };
      await AddLesson(newLesson)
      await logAuditEvent({
        title: `created lesson ${formData.title} for the course ${courseTitle}`,
        userEmail: userProfile?.mail,
        userName: userProfile?.displayName,
        actionType: "Create",
        details: `User created a new lesson titled "${formData.title}" for the course "${courseTitle}".`,
      });
      const file = files[0];
      if (file) {
        const contentLink = await deployZipToNetlify({
          projectName: formData.title,
          deployAsset: file?.file,
          deployTitle: `new upload to lesson ${formData.title} from course ${formData.course}`
        })

        const newLesson = {
          ...formData,
          courseId: courseID,
          contentLink,
          order: parseInt(formData.order) || lessons.length + 1
        };

        await AddLesson(newLesson)
      }
    } else if (editingLesson) {
      const newLesson = {
        ...formData,
        courseId: courseID,
        order: parseInt(formData.order)
      };
      await UpdateLesson(editingLesson, newLesson)
      await logAuditEvent({
        title: `modified lesson ${formData.title} of the course ${courseTitle}`,
        userEmail: userProfile?.mail,
        userName: userProfile?.displayName,
        actionType: "Modify",
        details: `User updated fields in lesson "${formData.title}" of the course "${courseTitle}".`,
      });
      const file = files[0];
      if (file) {
        const contentLink = await deployZipToNetlify({
          projectName: formData.title,
          deployAsset: file?.file,
          deployTitle: `new upload to lesson ${formData.title} from course ${formData.course}`
        })

        const newLesson = {
          ...formData,
          contentLink,
          courseId: courseID,
          order: parseInt(formData.order)
        };

        await UpdateLesson(editingLesson, newLesson)
      }
    }

    fetchLesson()
    resetForm();
    setFiles([])
    setEditingLesson(null);
    setIsAddingNew(false);
    setIsLoading(false)
  };

  const handleCancel = () => {
    resetForm();
    setEditingLesson(null);
    setIsAddingNew(false);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this lesson?')) {
      await DeleteLesson(id)
      fetchLesson()
    }
  };

  const handleInputChange = (field, value) => {
    if (field === 'contentLink') {
      setFormData(prev => ({ ...prev, [field]: `https://knowledge.myafricell.com/${value}` }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
  };

  const handleChapterChange = (index, value) => {
    const newChapters = [...formData.chapters];
    newChapters[index] = value;
    setFormData(prev => ({ ...prev, chapters: newChapters }));
  };

  const addChapter = () => {
    setFormData(prev => ({ ...prev, chapters: [...prev.chapters, ''] }));
  };

  const removeChapter = (index) => {
    if (formData.chapters.length > 1) {
      const newChapters = formData.chapters.filter((_, i) => i !== index);
      setFormData(prev => ({ ...prev, chapters: newChapters }));
    }
  };

  const sortedLessons = [...lessons].sort((a, b) => a.order - b.order);

  return (
    <div className="max-w-6xl mx-auto p-6 bg-white rounded-lg">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-800">

          </h2>
          <div className="flex gap-2">

            <Button
              variant="ghost"
              onClick={() => setformLesson(false)}
              className="flex justify-center items-center gap-3 text-alternative h-11 hover:bg-alternative-100 px-3 py-2 rounded-md whitespace-nowrap"
            >
              <ArrowLeft strokeWidth={2} className="h-5 w-5" />
              Course
            </Button>
          </div>
        </div>

        {/* Add New Button */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={handleAddNew}
            className="flex justify-center items-center gap-3 text-alternative border border-alternative-500 h-11 hover:bg-alternative-100 px-3 py-2 rounded-md whitespace-nowrap"
          >
            <PlusIcon strokeWidth={2} className="h-5 w-5" />
            Lesson
          </Button>
        </div>

        <div className="grid lg:grid-cols-1 gap-8">
          {/* Form Section */}
          {(isAddingNew || editingLesson) ? (
            <div className="bg-white rounded-xl p-6 ">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-semibold text-gray-800 flex items-center gap-2">
                  <Edit2 className="text-primary-600" size={24} />
                  {isAddingNew ? 'Add New Lesson' : 'Edit Lesson'}
                </h2>
                <button
                  onClick={handleCancel}
                  className="text-gray-500 hover:text-gray-700 transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-4">
                {/* Title */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Lesson Title *
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => {
                      handleInputChange('title', e.target.value)
                    }}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                    placeholder="Enter lesson title"
                  />
                </div>

                {/* Content Link */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <Link size={16} />
                    Content Link
                  </label>
                  <input
                    type="url"
                    readOnly
                    value={formData.contentLink}
                    disabled
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                    placeholder="https://example.com/lesson-content"
                  />
                </div>

                {/* Order and Duration */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                      <Clock size={16} />
                      Duration
                    </label>
                    <input
                      type="text"
                      value={formData.duration}
                      onChange={(e) => handleInputChange('duration', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                      placeholder="45 minutes"
                    />
                  </div>
                </div>

                {/* Has Quiz */}
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="hasQuiz"
                    checked={formData.hasQuiz}
                    onChange={(e) => handleInputChange('hasQuiz', e.target.checked)}
                    className="w-4 h-4 text-primary-600 bg-gray-100 border-gray-300 rounded focus:ring-primary-500"
                  />
                  <label htmlFor="hasQuiz" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <Award size={16} />
                    Has Quiz
                  </label>
                </div>

                {/* Chapters */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Chapters
                  </label>
                  {formData.chapters.map((chapter, index) => (
                    <div key={index} className="flex gap-2 mb-2">
                      <input
                        type="text"
                        value={chapter}
                        onChange={(e) => handleChapterChange(index, e.target.value)}
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                        placeholder={`Chapter ${index + 1}`}
                      />
                      <button
                        onClick={() => removeChapter(index)}
                        className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        disabled={formData.chapters.length === 1}
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={addChapter}
                    className="text-primary-600 hover:text-primary-700 text-sm font-medium flex items-center gap-1"
                  >
                    <Plus size={16} />
                    Add Chapter
                  </button>
                </div>

                {/* Additional Content */}
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <FileText size={16} />
                    Additional Content
                  </label>
                  <textarea
                    value={formData.additionalContent}
                    onChange={(e) => handleInputChange('additionalContent', e.target.value)}
                    rows="3"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all resize-none"
                    placeholder="Any additional notes or content description"
                  />
                </div>
                {/* File Content */}
                <div>
                  <GeneralFileUpload title={'Lesson Content'} maxFiles={1} files={files} setFiles={setFiles} />
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4">
                  <Button
                    variant='ghost'
                    onClick={handleSave}
                    disabled={isLoading}
                    className="flex-1  text-primary py-3 rounded-lg transition-all flex items-center justify-center gap-2 "
                  >
                    {!isLoading && <Save size={18} />}
                    {isLoading && <Clock size={18} className="animate-spin text-primary-500" />}
                    {isLoading ? "Saving" : "Save"} Lesson
                  </Button>
                  <button
                    onClick={handleCancel}
                    className="px-6 py-3  text-gray-700 rounded-lg hover:bg-gray-50 transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )
            :
            <>
              {/* Lessons List */}
              <div className={`space-y-4 ${(isAddingNew || editingLesson) ? '' : 'lg:col-span-2'}`}>
                <h2 className="text-2xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  Lessons ({lessons.length})
                </h2>

                {sortedLessons.length === 0 ? (
                  <div className="bg-white rounded-xl shadow-lg p-8 text-center border border-gray-100">
                    <BookOpen className="mx-auto text-gray-400 mb-4" size={48} />
                    <p className="text-gray-600 text-lg">No lessons yet</p>
                    <p className="text-gray-500">Click "Add New Lesson" to get started</p>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {sortedLessons.map((lesson) => (
                      <div
                        key={lesson.id}
                        className="bg-white rounded-xl  transition-all duration-200 border border-gray-100 p-6"
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <span className="bg-gray-100 text-gray-800 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                                #{lesson.order}
                              </span>
                              <h3 className="text-xl font-semibold text-gray-800">{lesson.title}</h3>
                              {lesson.hasQuiz && (
                                <Award className="text-gray-500" size={18} />
                              )}
                            </div>

                            <div className="grid grid-cols-2 gap-4 mb-3 text-sm text-gray-600">
                              <div className="flex items-center gap-2">
                                <Clock size={14} />
                                {lesson.duration}
                              </div>
                              <div>Course: {lesson.course}</div>
                            </div>

                            {lesson.contentLink && (
                              <div className="mb-3">
                                <a
                                  href={lesson.contentLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-primary-600 hover:text-primary-800 flex items-center gap-1 text-sm"
                                >
                                  <Link size={14} />
                                  View Content
                                </a>
                              </div>
                            )}

                            {lesson.chapters.length > 0 && (
                              <div className="mb-3">
                                <p className="text-sm text-gray-600 mb-1">Chapters:</p>
                                <div className="flex flex-wrap gap-1">
                                  {lesson.chapters.map((chapter, index) => (
                                    <span
                                      key={index}
                                      className="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded"
                                    >
                                      {chapter}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}

                            {lesson.additionalContent && (
                              <p className="text-sm text-gray-600 mt-2">{lesson.additionalContent}</p>
                            )}
                          </div>

                          <div className="flex gap-2 ml-4">
                            <button
                              onClick={() => handleEdit(lesson)}
                              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                              title="Edit lesson"
                            >
                              <Edit2 size={18} />
                            </button>
                            <button
                              onClick={() => handleDelete(lesson.id)}
                              className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                              title="Delete lesson"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          }
        </div>
      </div>
    </div>
  );
};

export default LessonCreationForm;
