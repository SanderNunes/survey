import DashboardLayout from '@/layouts/Dashboard';
import React, { useState, useMemo, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { Typography } from '@material-tailwind/react';
import { useSharePoint } from '@/hooks/useSharePoint';
import moment from 'moment';
import { 
  Eye, 
  Tag, 
  Calendar, 
  MessageSquare, 
  Bug, 
  Lightbulb, 
  Users, 
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Archive,
  RotateCcw,
  FileText,
  Image as ImageIcon
} from 'lucide-react';
import TableComponent from '@/components/TableComponent';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';

export default function FeedbackManagementPage() {
  const { t, i18n } = useTranslation();
  const [feedbacks, setFeedbacks] = useState([]);
  const { allFeedback, getAllFeedback, updateFeedback, logAuditEvent } = useSharePoint();
  const { userProfile } = useAuth();

  // Dynamic categories and types from feedback data
  const feedbackTypes = [...new Set(feedbacks.map(feedback => feedback.feedbackType))].map(type => ({
    value: type,
    label: type
  }));

  const priorities = [
    { value: 'Low', label: t('feedback.priority.low') },
    { value: 'Medium', label: t('feedback.priority.medium') },
    { value: 'High', label: t('feedback.priority.high') },
    { value: 'Critical', label: t('feedback.priority.critical') }
  ];

  const statuses = [
    { value: 'New', label: t('feedback.status.new') },
    { value: 'In Review', label: t('feedback.status.inReview') },
    { value: 'In Progress', label: t('feedback.status.inProgress') },
    { value: 'Resolved', label: t('feedback.status.resolved') },
    { value: 'Closed', label: t('feedback.status.closed') },
    { value: "Won't Fix", label: t('feedback.status.wontFix') }
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
    const fetchAllFeedback = async () => {
      await getAllFeedback();
    };
    fetchAllFeedback();
  }, [getAllFeedback]);

  // Get translated status, priority, and type
  const getTranslatedStatus = (originalStatus) => {
    const statusItem = statuses.find(s => s.value === originalStatus);
    return statusItem ? statusItem.label : originalStatus;
  };

  const getTranslatedPriority = (originalPriority) => {
    const priorityItem = priorities.find(p => p.value === originalPriority);
    return priorityItem ? priorityItem.label : originalPriority;
  };

  const getTranslatedType = (originalType) => {
    const typeMap = {
      'Bug Report': t('feedback.types.bugReport'),
      'Feature Request': t('feedback.types.featureRequest'),
      'General Suggestion': t('feedback.types.generalSuggestion'),
      'Usability Issue': t('feedback.types.usabilityIssue'),
      'Performance Issue': t('feedback.types.performanceIssue')
    };
    return typeMap[originalType] || originalType;
  };

  useEffect(() => {
    const mappedFeedback = allFeedback.map(feedback => {
      return {
        id: feedback.Id,
        title: feedback.Title,
        feedbackType: feedback.FeedbackType,
        translatedType: getTranslatedType(feedback.FeedbackType),
        description: feedback.Description,
        priority: feedback.Priority,
        translatedPriority: getTranslatedPriority(feedback.Priority),
        status: feedback.Status,
        translatedStatus: getTranslatedStatus(feedback.Status),
        originalStatus: feedback.Status?.toLowerCase(),
        originalPriority: feedback.Priority?.toLowerCase(),
        date: moment.utc(feedback.Created).local().fromNow(),
        createdDate: feedback.Created,
        modifiedDate: feedback.Modified,
        author: feedback.Author?.Title || feedback.CreatedBy?.Title,
        authorEmail: feedback.Author?.EMail || feedback.CreatedBy?.EMail,
        hasImage: !!feedback.Attachments,  // Changed from feedback.Image to feedback.Attachments
        attachments: feedback.Attachments
      };
    });

    // Filter feedback based on route and user role
    let filteredFeedback = mappedFeedback;

    setFeedbacks(filteredFeedback);
  }, [allFeedback, t, userProfile]);

  // Get icon for feedback type
  const getTypeIcon = (type) => {
    const iconMap = {
      'Bug Report': Bug,
      'Feature Request': Lightbulb,
      'General Suggestion': MessageSquare,
      'Usability Issue': Users,
      'Performance Issue': Clock
    };
    return iconMap[type] || MessageSquare;
  };

  // TABLE CONFIGURATION
  const tableHead = [
    {
      key: "title",
      label: t('feedback.table.headers.title')
    },
    {
      key: "priority",
      label: t('feedback.table.headers.priority'),
      type: "priority"
    },
    {
      key: "status",
      label: t('feedback.table.headers.status'),
      type: "status"
    },
    {
      key: "date",
      label: t('feedback.table.headers.date'),
      type: "date"
    },
    { isAction: true }
  ];

  // ACTION HANDLERS
  const handleView = (row) => {
    navigate(`view/${row.id}`);
  };

  const handleEdit = (row) => {
    navigate(`edit/${row.id}`);
  };

  const handleDelete = (row) => {
    const confirmMessage = t('feedback.messages.deleteConfirm', { title: row.title });
    if (window.confirm(confirmMessage)) {
      setFeedbacks(prev => prev.filter(item => item.id !== row.id));
    }
  };

  // BULK ACTIONS
  const bulkActions = [
    { value: "In Review", label: t('feedback.actions.markInReview') },
    { value: "In Progress", label: t('feedback.actions.markInProgress') },
    { value: "Resolved", label: t('feedback.actions.markResolved') },
    { value: "Closed", label: t('feedback.actions.markClosed') },
    { value: "Won't Fix", label: t('feedback.actions.markWontFix') }
  ];

  const handleBulkAction = async (action, selectedIds) => {
    try {
      const actionMessages = {
        'In Review': 'in review',
        'In Progress': 'in progress',
        'Resolved': 'resolved',
        'Closed': 'closed',
        "Won't Fix": "won't fix"
      };

      const actionMessage = actionMessages[action] || action.toLowerCase();

      for (const id of selectedIds) {
        await updateFeedback(id, { Status: action });
        await logAuditEvent({
          title: `modified status to ${actionMessage} of feedback with id: ${id}`,
          userEmail: userProfile?.mail,
          userName: userProfile?.displayName,
          actionType: "Modify",
          details: `User updated status to ${actionMessage} in feedback with id: "${id}".`,
        });
      }
      await getAllFeedback();
    } catch (error) {
      console.error('Bulk action failed:', error);
    }
  };

  // CUSTOM ROW ACTIONS
  const customRowActions = [
    {
      label: t('feedback.actions.markInReview'),
      icon: () => <Eye className="w-4 h-4 mr-2 hover:bg-secondary hover:text-primary" />,
      onClick: async (row) => {
        try {
          await updateFeedback(row.id, { Status: 'In Review' });
          await logAuditEvent({
            title: `modified status to in review of feedback ${row.title}`,
            userEmail: userProfile?.mail,
            userName: userProfile?.displayName,
            actionType: "Modify",
            details: `User updated status to in review in feedback "${row.title}".`,
          });
          await getAllFeedback();
        } catch (error) {
          console.error('Failed to update feedback status:', error);
        }
      }
    },
    {
      label: t('feedback.actions.markInProgress'),
      icon: () => <RotateCcw className="w-4 h-4 mr-2 hover:bg-secondary hover:text-primary" />,
      onClick: async (row) => {
        try {
          await updateFeedback(row.id, { Status: 'In Progress' });
          await logAuditEvent({
            title: `modified status to in progress of feedback ${row.title}`,
            userEmail: userProfile?.mail,
            userName: userProfile?.displayName,
            actionType: "Modify",
            details: `User updated status to in progress in feedback "${row.title}".`,
          });
          await getAllFeedback();
        } catch (error) {
          console.error('Failed to update feedback status:', error);
        }
      }
    },
    {
      label: t('feedback.actions.markResolved'),
      icon: () => <CheckCircle className="w-4 h-4 mr-2 hover:bg-secondary hover:text-primary" />,
      onClick: async (row) => {
        try {
          await updateFeedback(row.id, { Status: 'Resolved' });
          await logAuditEvent({
            title: `modified status to resolved of feedback ${row.title}`,
            userEmail: userProfile?.mail,
            userName: userProfile?.displayName,
            actionType: "Modify",
            details: `User updated status to resolved in feedback "${row.title}".`,
          });
          await getAllFeedback();
        } catch (error) {
          console.error('Failed to update feedback status:', error);
        }
      }
    },
    {
      label: t('feedback.actions.markClosed'),
      icon: () => <Archive className="w-4 h-4 mr-2 hover:bg-secondary hover:text-primary" />,
      onClick: async (row) => {
        try {
          await updateFeedback(row.id, { Status: 'Closed' });
          await logAuditEvent({
            title: `modified status to closed of feedback ${row.title}`,
            userEmail: userProfile?.mail,
            userName: userProfile?.displayName,
            actionType: "Modify",
            details: `User updated status to closed in feedback "${row.title}".`,
          });
          await getAllFeedback();
        } catch (error) {
          console.error('Failed to update feedback status:', error);
        }
      }
    }
  ];

  // FILTER OPTIONS
  const filterOptions = {
    status: statuses,
    priority: priorities,
    feedbackType: feedbackTypes
  };

  const handleFilterChange = (filters) => {
    // The TableComponent will handle the actual filtering
  };

  // STATUS COLORS
  const statusColors = {
    'new': 'bg-blue-100 text-blue-800',
    'novo': 'bg-blue-100 text-blue-800',
    'in review': 'bg-purple-100 text-purple-800',
    'em análise': 'bg-purple-100 text-purple-800',
    'in progress': 'bg-yellow-100 text-yellow-800',
    'em progresso': 'bg-yellow-100 text-yellow-800',
    'resolved': 'bg-green-100 text-green-800',
    'resolvido': 'bg-green-100 text-green-800',
    'closed': 'bg-gray-100 text-gray-800',
    'fechado': 'bg-gray-100 text-gray-800',
    "won't fix": 'bg-red-100 text-red-800',
    'não será corrigido': 'bg-red-100 text-red-800'
  };

  // PRIORITY COLORS
  const priorityColors = {
    'low': 'bg-green-100 text-green-800',
    'baixa': 'bg-green-100 text-green-800',
    'medium': 'bg-yellow-100 text-yellow-800',
    'média': 'bg-yellow-100 text-yellow-800',
    'high': 'bg-orange-100 text-orange-800',
    'alta': 'bg-orange-100 text-orange-800',
    'critical': 'bg-red-100 text-red-800',
    'crítica': 'bg-red-100 text-red-800'
  };

  // CUSTOM CELL RENDERER
  const customCellRenderer = (value, row, column) => {
    if (column.key === 'title') {
      const IconComponent = getTypeIcon(row.feedbackType);
      return (
        <div className="flex flex-col space-y-1">
          <div className="flex items-center space-x-2">
            <IconComponent className="w-4 h-4 text-gray-500 flex-shrink-0" />
            <h3 className="text-sm font-medium text-gray-900 hover:text-primary-600 cursor-pointer truncate">
              {value}
            </h3>
            {row.hasImage && (
              <ImageIcon className="w-3 h-3 text-green-500 flex-shrink-0" />
            )}
          </div>
          <p className="text-xs text-gray-500 truncate max-w-xs">
            {row.translatedType} • {row.author}
          </p>
          <p className="text-xs text-gray-400 truncate max-w-xs">
            {row.description}
          </p>
        </div>
      );
    }

    if (column.key === 'priority') {
      const colorClass = priorityColors[row.originalPriority] || 'bg-gray-100 text-gray-800';
      return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClass}`}>
          {row.translatedPriority}
        </span>
      );
    }

    if (column.key === 'status') {
      const colorClass = statusColors[row.originalStatus] || 'bg-gray-100 text-gray-800';
      return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClass}`}>
          {row.translatedStatus}
        </span>
      );
    }

    return undefined;
  };

  // Check if user is admin
  const isAdmin = userProfile?.role === 'admin' || userProfile?.isAdmin || userProfile?.groups?.some(group => 
    group.toLowerCase().includes('admin') || group.toLowerCase().includes('administrator')
  );

  // Content component that can be used with or without DashboardLayout
  const FeedbackContent = () => (
    <div className="container">
      

      {/* Content */}
      <div className="py-8">
        <TableComponent
          Title={t('feedback.title')}
          Subtitle={t('feedback.subtitle')}
          TABLE_HEAD={tableHead}
          TABLE_ROWS={feedbacks}

          // Pagination
          itemsPerPage={10}
          enablePagination={true}

          // Selection & Bulk Actions - only for admins
          enableSelection={isAdmin}
          enableBulkActions={isAdmin}
          bulkActions={isAdmin ? bulkActions : []}
          onBulkAction={isAdmin ? handleBulkAction : undefined}

          // Filters
          enableFilters={true}
          filterOptions={filterOptions}
          onFilterChange={handleFilterChange}

          // Search Configuration
          searchableColumns={["title", "description", "author", "feedbackType"]}

          // Actions - limited for non-admin users
          actions={{
            create: "create",
            view: handleView,
            edit: isAdmin ? handleEdit : undefined
          }}
          customRowActions={isAdmin ? customRowActions : []}

          // Customization
          statusColors={statusColors}
          renderCell={customCellRenderer}
          emptyStateMessage={t('feedback.messages.emptyState')}

          // Loading state
          loading={false}

          // Accessibility
          ariaLabel={t('feedback.title')}
        />
      </div>
    </div>
  );

  // Render with or without DashboardLayout based on user role
  if (isAdmin) {
    return (
      <DashboardLayout>
        <FeedbackContent />
      </DashboardLayout>
    );
  }

  // For non-admin users, render without dashboard layout
  return <FeedbackContent />;
}