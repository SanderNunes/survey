import React, { useEffect, useState } from "react";
import CourseForm from "@/components/Forms/CreateCourse";
import AcademyLayout from "@/layouts/Academy";
import { Tabs } from "@material-tailwind/react";
import TableComponent from "@/components/TableComponent";
import { useSharePoint } from "@/hooks/useSharePoint";
import moment from "moment";
import { useNavigate } from "react-router-dom";
import { useTranslation } from 'react-i18next'; // Add this import

function AdminAcademy() {
  const { t, i18n } = useTranslation(); // Add this hook
  const { getCourses, deleteCourse } = useSharePoint();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const navigate = useNavigate();

  // Configure moment locale based on current language
  useEffect(() => {
    if (i18n.language.startsWith('pt')) {
      moment.locale('pt-br');
    } else {
      moment.locale('en');
    }
  }, [i18n.language]);

  // Table configuration with translations
  const tableHead = [
    { key: "Title", label: t('courses.table.headers.courseTitle') },
    { key: "Category", label: t('courses.table.headers.category') },
    { key: "Duration", label: t('courses.table.headers.duration') },
    {
      key: "Review",
      label: t('courses.table.headers.reviews'),
      render: (value) => value
        ? t('courses.table.values.reviews', { count: value })
        : t('courses.table.values.noReviews')
    },
    {
      key: "Rating",
      label: t('courses.table.headers.rating'),
      render: (value) => value ? `⭐ ${value}/5` : t('courses.table.values.notRated')
    },
    {
      key: "Created",
      label: t('courses.table.headers.createdDate'),
      type: "date"
    },
    { key: "Level", label: t('courses.table.headers.level') },
    {
      key: "Status",
      label: t('courses.table.headers.status'),
      type: "status"
    },
    {
      key: "Tags",
      label: t('courses.table.headers.tags'),
      type: "tags"
    },
    { isAction: true } // Action column for edit/delete/view
  ];

  // Filter options with translations
  const filterOptions = {
    Level: [
      { value: 'beginner', label: t('courses.filters.level.beginner') },
      { value: 'intermediate', label: t('courses.filters.level.intermediate'), },
      { value: 'advanced', label: t('courses.filters.level.advanced') }
    ]
  };

  // Bulk actions with translations
  const bulkActions = [
    { value: "publish", label: t('courses.bulkActions.publishSelected') },
    { value: "archive", label: t('courses.bulkActions.archiveSelected') },
    { value: "delete", label: t('courses.bulkActions.deleteSelected') },
    { value: "export", label: t('courses.bulkActions.exportSelected') }
  ];

  // Custom status colors - status text will be translated
  const statusColors = {
    published: 'bg-green-100 text-green-800',
    draft: 'bg-yellow-100 text-yellow-800',
    archived: 'bg-red-100 text-red-800',
    scheduled: 'bg-primary-100 text-primary-800'
  };

  // Searchable columns
  const searchableColumns = ["Title", "Category", "Level", "Format"];

  // Translate status values
  const getTranslatedStatus = (status) => {
    const statusKey = status?.toLowerCase();
    return t(`courses.status.${statusKey}`, status); // Fallback to original if translation not found
  };

  // Translate level values
  const getTranslatedLevel = (level) => {
    const levelKey = level?.toLowerCase();
    return t(`courses.filters.level.${levelKey}`, level); // Fallback to original if translation not found
  };

  // Fetch courses
  const fetchCourses = async () => {
    try {
      setLoading(true);
      const items = await getCourses();
      const itemsMapped = items.map((item, index) => ({
        id: item.Id || index,
        Title: item.Title,
        Category: item.Category,
        Duration: item.Duration,
        Review: item.Reviews,
        Rating: item.Rating,
        Created: moment(item.Created).format("DD/MM/YYYY"),
        Format: item.Format,
        Level: getTranslatedLevel(item.Level), // Translate level
        Status: getTranslatedStatus(item.Status), // Translate status
        originalLevel: item.Level, // Keep original for filtering
        originalStatus: item.Status?.toLowerCase(), // Keep original for filtering
        Tags: Array.isArray(item.Tags) ? item.Tags : (item.Tags ? item.Tags.split(',') : [])
      }));
      setCourses(itemsMapped);
    } catch (err) {
      console.error("Failed to fetch courses:", err);
      setError(t('courses.messages.errorLoading'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, [getCourses, t]); // Add t to dependencies to re-fetch when language changes

  // Action handlers
  const handleEdit = (row, index) => {
    navigate(`${row.id}`);
  };

  const handleDelete = async (row, index) => {
    const confirmMessage = t('courses.messages.deleteConfirm', { title: row.Title });
    if (window.confirm(confirmMessage)) {
      try {
        setLoading(true);
        await deleteCourse(row.id);
        fetchCourses();
        // You could add a toast notification here:
        // toast.success(t('courses.messages.deleteSuccess'));
      } catch (error) {
        console.error('Failed to delete course:', error);
        // alert(t('courses.messages.deleteFailed'));
      } finally {
        setLoading(false);
      }
    }
  };

  const handleView = (row, index) => {
    navigate(`${row.id}/view`);
  };

  // Bulk action handler
  const handleBulkAction = async (action, selectedIds) => {


    try {
      setLoading(true);

      switch (action) {
        case 'publish':
          setCourses(prevCourses =>
            prevCourses.map(course =>
              selectedIds.includes(course.id)
                ? {
                  ...course,
                  Status: t('courses.status.published'),
                  originalStatus: 'published'
                }
                : course
            )
          );
          break;

        case 'archive':
          setCourses(prevCourses =>
            prevCourses.map(course =>
              selectedIds.includes(course.id)
                ? {
                  ...course,
                  Status: t('courses.status.archived'),
                  originalStatus: 'archived'
                }
                : course
            )
          );
          break;

        case 'delete':
          const confirmMessage = t('courses.messages.bulkDeleteConfirm', { count: selectedIds.length });
          if (window.confirm(confirmMessage)) {
            // Here you would call your bulk delete API
            setCourses(prevCourses =>
              prevCourses.filter(course => !selectedIds.includes(course.id))
            );
          }
          break;

        case 'export':
          const selectedCourses = courses.filter(course =>
            selectedIds.includes(course.id)
          );
          const dataStr = JSON.stringify(selectedCourses, null, 2);
          const dataBlob = new Blob([dataStr], { type: 'application/json' });
          const url = URL.createObjectURL(dataBlob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `courses-export-${moment().format('YYYY-MM-DD')}.json`;
          link.click();
          URL.revokeObjectURL(url); // Clean up
          break;
      }
    } catch (error) {
      console.error('Bulk action failed:', error);
      alert(t('courses.messages.bulkActionFailed'));
    } finally {
      setLoading(false);
    }
  };
  // console.log({courses});

  // Filter change handler
  const handleFilterChange = (filters) => {

    // You can use this to make API calls with filter parameters
    // or implement client-side filtering logic
  };

  // Handle course creation/update
  const handleCourseSubmit = async (courseData) => {
    try {
      setLoading(true);

      if (editingCourse) {
        // Update existing course
        const updatedCourse = {
          ...editingCourse,
          ...courseData,
          Level: getTranslatedLevel(courseData.Level),
          Status: getTranslatedStatus(courseData.Status)
        };

        setCourses(prevCourses =>
          prevCourses.map(course =>
            course.id === editingCourse.id ? updatedCourse : course
          )
        );
      } else {
        // Create new course
        const newCourse = {
          id: Date.now(),
          ...courseData,
          Level: getTranslatedLevel(courseData.Level),
          Status: getTranslatedStatus('draft'),
          originalStatus: 'draft',
          Created: moment().format("DD/MM/YYYY")
        };

        setCourses(prevCourses => [...prevCourses, newCourse]);
      }

      setShowCreateForm(false);
      setEditingCourse(null);
    } catch (error) {
      console.error('Failed to save course:', error);
      alert(t('courses.messages.saveCourseFailed'));
    } finally {
      setLoading(false);
    }
  };

  // Loading state
  if (loading && courses.length === 0) {
    return (
      <AcademyLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
            <p className="text-gray-600">{t('courses.messages.loadingCourses')}</p>
          </div>
        </div>
      </AcademyLayout>
    );
  }

  // Error state
  if (error) {
    return (
      <AcademyLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="text-red-500 text-xl mb-2">⚠️</div>
            <p className="text-gray-600">{error}</p>
            <button
              onClick={fetchCourses}
              className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              {t('common.retry', 'Try Again')}
            </button>
          </div>
        </div>
      </AcademyLayout>
    );
  }

  return (
    <AcademyLayout>
      {/* Course Creation/Edit Form */}
      {showCreateForm && (
        <div className="mb-6 p-4 border border-gray-200 rounded-lg bg-gray-50">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">
              {editingCourse ? t('courses.actions.edit') : t('courses.actions.createNew')}
            </h3>
            <button
              onClick={() => {
                setShowCreateForm(false);
                setEditingCourse(null);
              }}
              className="text-gray-500 hover:text-gray-700 p-1 hover:bg-gray-200 rounded transition-colors"
              aria-label={t('common.close', 'Close')}
            >
              ✕
            </button>
          </div>
          <CourseForm
            initialData={editingCourse}
            onSubmit={handleCourseSubmit}
            onCancel={() => {
              setShowCreateForm(false);
              setEditingCourse(null);
            }}
          />
        </div>
      )}

      {/* Enhanced Table with All Features */}
      <TableComponent
        // Basic Configuration
        Title={t('courses.title')}
        Subtitle={t('courses.subtitle')}
        TABLE_HEAD={tableHead}
        TABLE_ROWS={courses}

        // Pagination
        itemsPerPage={10}
        enablePagination={true}

        // Filters & Search
        enableFilters={true}
        filterOptions={filterOptions}
        onFilterChange={handleFilterChange}
        searchableColumns={searchableColumns}

        // Actions
        actions={{
          create: 'create',
          edit: handleEdit,
          delete: handleDelete,
          view: handleView
        }}

        // Bulk actions
        bulkActions={bulkActions}
        onBulkAction={handleBulkAction}

        // Customization
        statusColors={statusColors}
        loading={loading}
        emptyStateMessage={t('courses.messages.emptyState')}

        // Accessibility
        ariaLabel={t('courses.title')}
      />
    </AcademyLayout>
  );
}

export default AdminAcademy;
