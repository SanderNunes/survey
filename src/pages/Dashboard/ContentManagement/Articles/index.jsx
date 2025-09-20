import DashboardLayout from '@/layouts/Dashboard';
import React, { useState, useMemo, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Typography } from '@material-tailwind/react';
import { useSharePoint } from '@/hooks/useSharePoint';
import moment from 'moment';
import { Eye, Tag, Calendar, FileCheck, FileEdit, FileArchive } from 'lucide-react';
import TableComponent from '@/components/TableComponent';
import { useTranslation } from 'react-i18next'; // Add this import
import { useAuth } from '@/hooks/useAuth';

export default function ArticleManagementPage() {
  const { t, i18n } = useTranslation(); // Add this hook
  const [articles, setArticles] = useState([]);
  const { allArticles, getAllArticles, updateArticleMetadata, logAuditEvent } = useSharePoint();
  const { userProfile } = useAuth();

  // const categories = [...new Set(articles.map(article => article.category))];
  const categories = [...new Set(articles.map(article => article.category))].map(category => ({
    value: category,
    label: category
  }));
  const statuses = [
    { value: 'published', label: t('articles.status.published') },
    { value: 'draft', label: t('articles.status.draft') },
    { value: 'archived', label: t('articles.status.archived') }
  ];
  const navigate = useNavigate();

  // Configure moment locale based on current language
  useEffect(() => {
    if (i18n.language.startsWith('pt')) {
      moment.locale('pt-br');
    } else {
      moment.locale('en');
    }
  }, [i18n.language]);

  useEffect(() => {
    const fetchAllArticles = async () => {
      await getAllArticles();
    };
    fetchAllArticles();
  }, [getAllArticles]);

  // Get translated status for original values
  const getTranslatedStatus = (originalStatus) => {
    const statusKey = originalStatus?.toLowerCase();
    return t(`articles.status.${statusKey}`, originalStatus); // Fallback to original if translation not found
  };

  useEffect(() => {
    const mappedArticles = allArticles.map(article => {
      return {
        id: article.Id,
        featured: article.Featured,
        title: article.Title,
        status: getTranslatedStatus(article.ArticleStatus), // Translate status
        originalStatus: article.ArticleStatus?.toLowerCase(), // Keep original for filtering
        date: moment.utc(article.Created).local().fromNow(),
        category: article.Category,
        tags: JSON.parse(article.Tags),
        views: article.ArticleViews,
        ratings: article.ArticleRating,
        slug: article.ArticleSlug
      };
    });
    setArticles(mappedArticles);
  }, [allArticles, t]);

  // TABLE CONFIGURATION
  const tableHead = [
    {
      key: "featured",
      label: t('createArticle.fields.featured'),
      type: "featured"
    },
    {
      key: "title",
      label: t('articles.table.headers.title')
    },
    {
      key: "status",
      label: t('articles.table.headers.status'),
      type: "status"
    },
    {
      key: "category",
      label: t('articles.table.headers.category')
    },
    {
      key: "tags",
      label: t('articles.table.headers.tags'),
      type: "tags"
    },
    {
      key: "date",
      label: t('articles.table.headers.date'),
      type: "date"
    },
    {
      key: "stats",
      label: t('articles.table.headers.statistics'),
      type: "stats",
      render: (value, row) => ({
        views: row.views,
        ratings: row.ratings
      })
    },
    { isAction: true }
  ];

  // ACTION HANDLERS
  const handleView = (row) => {
    // Navigate to view page
    navigate(`view/${row.slug}`);
  };

  const handleEdit = (row) => {
    // Navigate to edit page
    navigate(`view/${row.slug}`);
  };

  const handleDelete = (row) => {
    const confirmMessage = t('articles.messages.deleteConfirm', { title: row.title });
    if (window.confirm(confirmMessage)) {
      setArticles(prev => prev.filter(item => item.id !== row.id));
    }
  };

  // BULK ACTIONS
  const bulkActions = [
    { value: "Publish", label: t('articles.actions.publishSelected') },
    { value: "Draft", label: t('articles.actions.moveToDraft') },
    { value: "Archive", label: t('articles.actions.archiveSelected') },
  ];

  const handleBulkAction = async (action, selectedIds) => {


    try {
      switch (action) {
        case 'Publish':
          // Update articles status to published
          for (const id of selectedIds) {
            await updateArticleMetadata(id, { ArticleStatus: 'Published' });
            await logAuditEvent({
              title: `modified status to published of articles with id: ${id}`,
              userEmail: userProfile?.mail,
              userName: userProfile?.displayName,
              actionType: "Modify",
              details: `User updated status to published in article with id: "${id}".`,
            });

          }
          await getAllArticles();
          break;
        case 'Draft':
          // Update articles status to draft
          for (const id of selectedIds) {
            await updateArticleMetadata(id, { ArticleStatus: 'Draft' });
            await logAuditEvent({
              title: `modified status to draft of articles with id: ${id}`,
              userEmail: userProfile?.mail,
              userName: userProfile?.displayName,
              actionType: "Modify",
              details: `User updated status to draft in article with id: "${id}".`,
            });
          }
          await getAllArticles();
          break;
        case 'Archive':
          // Update articles status to archived
          for (const id of selectedIds) {
            await updateArticleMetadata(id, { ArticleStatus: 'Archived' });
            await logAuditEvent({
              title: `modified status to archived of articles with id: ${id}`,
              userEmail: userProfile?.mail,
              userName: userProfile?.displayName,
              actionType: "Modify",
              details: `User updated status to archived in article with id: "${id}".`,
            });
          }
          await getAllArticles();
          break;
        case 'Delete':
          const confirmMessage = t('articles.messages.bulkDeleteConfirm', { count: selectedIds.length });
          if (window.confirm(confirmMessage)) {
            setArticles(prev => prev.filter(item => !selectedIds.includes(item.id)));
          }
          break;
      }
    } catch (error) {
      console.error('Bulk action failed:', error);
      // You could add a toast notification here with translated error message
    }
  };

  // CUSTOM ROW ACTIONS
  const customRowActions = [
    {
      label: t('articles.actions.publish'),
      icon: () => <FileCheck className={`w-4 h-4 mr-2 hover:bg-secondary hover:text-primary`} />,
      onClick: async (row) => {
        try {
          await updateArticleMetadata(row.id, { ArticleStatus: 'Published' });
          await logAuditEvent({
              title: `modified status to published of article ${row.title}`,
              userEmail: userProfile?.mail,
              userName: userProfile?.displayName,
              actionType: "Modify",
              details: `User updated status to published in article "${row.title}".`,
            });
          await getAllArticles();
        } catch (error) {
          console.error('Failed to publish article:', error);
        }
      }
    },
    {
      label: t('articles.actions.draft'),
      icon: () => <FileEdit className={`w-4 h-4 mr-2 hover:bg-secondary hover:text-primary`} />,
      onClick: async (row) => {
        try {
          await updateArticleMetadata(row.id, { ArticleStatus: 'Draft' });
          await logAuditEvent({
              title: `modified status to draft of article  ${row.title}`,
              userEmail: userProfile?.mail,
              userName: userProfile?.displayName,
              actionType: "Modify",
              details: `User updated status to draft in article ${row.title}`,
            });
          await getAllArticles();
        } catch (error) {
          console.error('Failed to move article to draft:', error);
        }
      }
    },
    {
      label: t('articles.actions.archive'),
      icon: () => <FileArchive className={`w-4 h-4 mr-2 hover:bg-secondary hover:text-primary`} />,
      onClick: async (row) => {
        try {
          await updateArticleMetadata(row.id, { ArticleStatus: 'Archived' });
          await logAuditEvent({
              title: `modified status to archived of article ${row.title}`,
              userEmail: userProfile?.mail,
              userName: userProfile?.displayName,
              actionType: "Modify",
              details: `User updated status to archived in article "${row.title}".`,
            });
          await getAllArticles();
        } catch (error) {
          console.error('Failed to archive article:', error);
        }
      }
    }
  ];

  // FILTER OPTIONS
  const filterOptions = {
    status: statuses,
    category: categories
  };

  const handleFilterChange = (filters) => {

    // The TableComponent will handle the actual filtering
  };

  // STATUS COLORS - Support both English and Portuguese status values
  const statusColors = {
    published: 'bg-green-100 text-green-800',
    publicado: 'bg-green-100 text-green-800',
    draft: 'bg-gray-100 text-gray-800',
    rascunho: 'bg-gray-100 text-gray-800',
    archived: 'bg-red-100 text-red-800',
    arquivado: 'bg-red-100 text-red-800',
    scheduled: 'bg-primary-100 text-primary-800',
    agendado: 'bg-primary-100 text-primary-800'
  };

  // CUSTOM CELL RENDERER
  const customCellRenderer = (value, row, column) => {
    if (column.key === 'title') {
      return (
        <div className="flex flex-col">
          <h3 className="text-sm font-medium text-gray-900 hover:text-primary-600 cursor-pointer">
            {value}
          </h3>
        </div>
      );
    }

    if (column.key === 'stats') {
      return (
        <div className="text-sm text-gray-900">
          <div className="flex items-center">
            <Eye className="w-4 h-4 text-gray-400 mr-1" />
            {row.views}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {t('articles.messages.ratings', { count: row.ratings })}
          </div>
        </div>
      );
    }

    return undefined;
  };

  return (
    <DashboardLayout>
      <div className="">
        {/* Table Component */}
        <div className="mx-6">
          <TableComponent
            Title={t('articles.title')}
            Subtitle={t('articles.subtitle')}
            TABLE_HEAD={tableHead}
            TABLE_ROWS={articles}

            // Pagination
            itemsPerPage={10}
            enablePagination={true}

            // Selection & Bulk Actions
            enableSelection={true}
            enableBulkActions={true}
            bulkActions={bulkActions}
            onBulkAction={handleBulkAction}

            // Filters
            enableFilters={true}
            filterOptions={filterOptions}
            onFilterChange={handleFilterChange}

            // Search Configuration
            searchableColumns={["title", "category"]}

            // Actions
            actions={{
              create: "create",
              view: handleView,
            }}
            customRowActions={customRowActions}

            // Customization
            statusColors={statusColors}
            renderCell={customCellRenderer}
            emptyStateMessage={t('articles.messages.emptyState')}

            // Loading state
            loading={false}

            // Accessibility
            ariaLabel={t('articles.title')}
          />
        </div>
      </div>
    </DashboardLayout>
  );
}
