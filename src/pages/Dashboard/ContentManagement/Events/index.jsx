import DashboardLayout from '@/layouts/Dashboard';
import React, { useState, useMemo, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Typography } from '@material-tailwind/react';
import { useSharePoint } from '@/hooks/useSharePoint';
import moment from 'moment';
import { 
  Eye, 
  Calendar, 
  Clock, 
  Users, 
  MapPin, 
  Bell,
  CheckCircle,
  AlertCircle,
  XCircle,
  Pause,
  RotateCcw
} from 'lucide-react';
import TableComponent from '@/components/TableComponent';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';

export default function EventManagementPage() {
  const { t, i18n } = useTranslation();
  const [events, setEvents] = useState([]);
  const { allEvents, getAllEvents, updateEvent, deleteEvent, logAuditEvent } = useSharePoint();
  const { userProfile } = useAuth();

  const categories = [...new Set(events.map(event => event.category))].map(category => ({
    value: category,
    label: category
  }));

  const statuses = [
    { value: 'scheduled', label: t('events.status.scheduled') },
    { value: 'confirmed', label: t('events.status.confirmed') },
    { value: 'cancelled', label: t('events.status.cancelled') },
    { value: 'completed', label: t('events.status.completed') },
    { value: 'postponed', label: t('events.status.postponed') }
  ];

  const eventTypes = [
    { value: 'internal', label: t('events.types.internal') },
    { value: 'external', label: t('events.types.external') },
    { value: 'client', label: t('events.types.client') },
    { value: 'personal', label: t('events.types.personal') },
    { value: 'company', label: t('events.types.company') }
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
    const fetchAllEvents = async () => {
      await getAllEvents();
    };
    fetchAllEvents();
  }, [getAllEvents]);

  // Get translated status for original values
  const getTranslatedStatus = (originalStatus) => {
    const statusKey = originalStatus?.toLowerCase();
    return t(`events.status.${statusKey}`, originalStatus);
  };

  const getTranslatedEventType = (originalType) => {
    const typeKey = originalType?.toLowerCase();
    return t(`events.types.${typeKey}`, originalType);
  };

  useEffect(() => {
    const mappedEvents = allEvents.map(event => {
      const startDate = event.Start_Date ? new Date(event.Start_Date) : null;
      const endDate = event.End_Date ? new Date(event.End_Date) : null;
      
      return {
        id: event.Id,
        title: event.Title,
        status: getTranslatedStatus(event.Status),
        originalStatus: event.Status?.toLowerCase(),
        category: event.Category,
        eventType: getTranslatedEventType(event.Event_Type),
        originalEventType: event.Event_Type?.toLowerCase(),
        startDate: startDate ? moment(startDate).format('YYYY-MM-DD HH:mm') : '',
        endDate: endDate ? moment(endDate).format('YYYY-MM-DD HH:mm') : '',
        dateFormatted: startDate ? moment(startDate).fromNow() : '',
        team: event.Team,
        accessLevel: event.Access_Level,
        reminder: event.Reminder,
        description: event.Description,
        notes: event.Notes,
        recurrenceType: event.Recurrence_Type,
        duration: startDate && endDate ? 
          moment.duration(moment(endDate).diff(moment(startDate))).humanize() : '',
        isUpcoming: startDate ? moment(startDate).isAfter(moment()) : false,
        isPast: startDate ? moment(startDate).isBefore(moment()) : false,
        created: moment.utc(event.Created).local().fromNow(),
        author: event.Author?.Title
      };
    });
    setEvents(mappedEvents);
  }, [allEvents, t]);

  // TABLE CONFIGURATION
  const tableHead = [
    {
      key: "title",
      label: t('events.table.headers.title')
    },
    {
      key: "status",
      label: t('events.table.headers.status'),
      type: "status"
    },
    {
      key: "category",
      label: t('events.table.headers.category')
    },
    {
      key: "eventType",
      label: t('events.table.headers.eventType')
    },
    {
      key: "dateInfo",
      label: t('events.table.headers.dateTime'),
      type: "dateInfo",
      render: (value, row) => ({
        startDate: row.startDate,
        endDate: row.endDate,
        dateFormatted: row.dateFormatted,
        duration: row.duration,
        isUpcoming: row.isUpcoming,
        isPast: row.isPast
      })
    },
    {
      key: "team",
      label: t('events.table.headers.team')
    },
    {
      key: "reminder",
      label: t('events.table.headers.reminder')
    },
    { isAction: true }
  ];

  // ACTION HANDLERS
  const handleView = (row) => {
    // Navigate to view/edit event page
    navigate(`/home/content-management/events/view/${row.id}`);
  };

  const handleEdit = (row) => {
    // Navigate to edit page
    navigate(`/home/content-management/events/view/${row.id}`);
  };

  const handleDelete = async (row) => {
    const confirmMessage = t('events.messages.deleteConfirm', { title: row.title });
    if (window.confirm(confirmMessage)) {
      try {
        await deleteEvent(row.id);
        await logAuditEvent({
          title: `deleted event ${row.title}`,
          userEmail: userProfile?.mail,
          userName: userProfile?.displayName,
          actionType: "Delete",
          details: `User deleted event "${row.title}".`,
        });
        await getAllEvents();
      } catch (error) {
        console.error('Failed to delete event:', error);
      }
    }
  };

  // BULK ACTIONS
  const bulkActions = [
    { value: "Confirmed", label: t('events.actions.confirmSelected') },
    { value: "Cancelled", label: t('events.actions.cancelSelected') },
    { value: "Completed", label: t('events.actions.completeSelected') },
    { value: "Postponed", label: t('events.actions.postponeSelected') },
  ];

  const handleBulkAction = async (action, selectedIds) => {
    try {
      switch (action) {
        case 'Confirmed':
          for (const id of selectedIds) {
            await updateEvent(id, { Status: 'Confirmed' });
            await logAuditEvent({
              title: `confirmed event with id: ${id}`,
              userEmail: userProfile?.mail,
              userName: userProfile?.displayName,
              actionType: "Modify",
              details: `User confirmed event with id: "${id}".`,
            });
          }
          await getAllEvents();
          break;
        case 'Cancelled':
          for (const id of selectedIds) {
            await updateEvent(id, { Status: 'Cancelled' });
            await logAuditEvent({
              title: `cancelled event with id: ${id}`,
              userEmail: userProfile?.mail,
              userName: userProfile?.displayName,
              actionType: "Modify",
              details: `User cancelled event with id: "${id}".`,
            });
          }
          await getAllEvents();
          break;
        case 'Completed':
          for (const id of selectedIds) {
            await updateEvent(id, { Status: 'Completed' });
            await logAuditEvent({
              title: `completed event with id: ${id}`,
              userEmail: userProfile?.mail,
              userName: userProfile?.displayName,
              actionType: "Modify",
              details: `User marked event as completed with id: "${id}".`,
            });
          }
          await getAllEvents();
          break;
        case 'Postponed':
          for (const id of selectedIds) {
            await updateEvent(id, { Status: 'Postponed' });
            await logAuditEvent({
              title: `postponed event with id: ${id}`,
              userEmail: userProfile?.mail,
              userName: userProfile?.displayName,
              actionType: "Modify",
              details: `User postponed event with id: "${id}".`,
            });
          }
          await getAllEvents();
          break;
        case 'Delete':
          const confirmMessage = t('events.messages.bulkDeleteConfirm', { count: selectedIds.length });
          if (window.confirm(confirmMessage)) {
            for (const id of selectedIds) {
              await deleteEvent(id);
              await logAuditEvent({
                title: `deleted event with id: ${id}`,
                userEmail: userProfile?.mail,
                userName: userProfile?.displayName,
                actionType: "Delete",
                details: `User deleted event with id: "${id}".`,
              });
            }
            await getAllEvents();
          }
          break;
      }
    } catch (error) {
      console.error('Bulk action failed:', error);
    }
  };

  // CUSTOM ROW ACTIONS
  const customRowActions = [
    {
      label: t('events.actions.confirm'),
      icon: () => <CheckCircle className={`w-4 h-4 mr-2 hover:bg-secondary hover:text-primary`} />,
      onClick: async (row) => {
        try {
          await updateEvent(row.id, { Status: 'Confirmed' });
          await logAuditEvent({
            title: `confirmed event ${row.title}`,
            userEmail: userProfile?.mail,
            userName: userProfile?.displayName,
            actionType: "Modify",
            details: `User confirmed event "${row.title}".`,
          });
          await getAllEvents();
        } catch (error) {
          console.error('Failed to confirm event:', error);
        }
      }
    },
    {
      label: t('events.actions.cancel'),
      icon: () => <XCircle className={`w-4 h-4 mr-2 hover:bg-secondary hover:text-primary`} />,
      onClick: async (row) => {
        try {
          await updateEvent(row.id, { Status: 'Cancelled' });
          await logAuditEvent({
            title: `cancelled event ${row.title}`,
            userEmail: userProfile?.mail,
            userName: userProfile?.displayName,
            actionType: "Modify",
            details: `User cancelled event "${row.title}".`,
          });
          await getAllEvents();
        } catch (error) {
          console.error('Failed to cancel event:', error);
        }
      }
    },
    {
      label: t('events.actions.complete'),
      icon: () => <CheckCircle className={`w-4 h-4 mr-2 hover:bg-secondary hover:text-primary`} />,
      onClick: async (row) => {
        try {
          await updateEvent(row.id, { Status: 'Completed' });
          await logAuditEvent({
            title: `completed event ${row.title}`,
            userEmail: userProfile?.mail,
            userName: userProfile?.displayName,
            actionType: "Modify",
            details: `User marked event as completed "${row.title}".`,
          });
          await getAllEvents();
        } catch (error) {
          console.error('Failed to complete event:', error);
        }
      }
    },
    {
      label: t('events.actions.postpone'),
      icon: () => <Pause className={`w-4 h-4 mr-2 hover:bg-secondary hover:text-primary`} />,
      onClick: async (row) => {
        try {
          await updateEvent(row.id, { Status: 'Postponed' });
          await logAuditEvent({
            title: `postponed event ${row.title}`,
            userEmail: userProfile?.mail,
            userName: userProfile?.displayName,
            actionType: "Modify",
            details: `User postponed event "${row.title}".`,
          });
          await getAllEvents();
        } catch (error) {
          console.error('Failed to postpone event:', error);
        }
      }
    }
  ];

  // FILTER OPTIONS
  const filterOptions = {
    status: statuses,
    category: categories,
    eventType: eventTypes
  };

  const handleFilterChange = (filters) => {
    // The TableComponent will handle the actual filtering
  };

  // STATUS COLORS
  const statusColors = {
    scheduled: 'bg-blue-100 text-blue-800',
    agendado: 'bg-blue-100 text-blue-800',
    confirmed: 'bg-green-100 text-green-800',
    confirmado: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
    cancelado: 'bg-red-100 text-red-800',
    completed: 'bg-gray-100 text-gray-800',
    concluido: 'bg-gray-100 text-gray-800',
    postponed: 'bg-yellow-100 text-yellow-800',
    adiado: 'bg-yellow-100 text-yellow-800'
  };

  // CUSTOM CELL RENDERER
  const customCellRenderer = (value, row, column) => {
    if (column.key === 'title') {
      return (
        <div className="flex flex-col">
          <h3 className="text-sm font-medium text-gray-900 hover:text-primary-600 cursor-pointer">
            {value}
          </h3>
          {row.description && (
            <p className="text-xs text-gray-500 mt-1 line-clamp-2">
              {row.description}
            </p>
          )}
        </div>
      );
    }

    if (column.key === 'dateInfo') {
      const isUpcoming = row.isUpcoming;
      const isPast = row.isPast;
      
      return (
        <div className="text-sm">
          <div className={`flex items-center mb-1 ${isUpcoming ? 'text-green-600' : isPast ? 'text-gray-500' : 'text-gray-900'}`}>
            <Calendar className="w-4 h-4 mr-1" />
            <span className="font-medium">
              {moment(row.startDate).format('MMM DD, YYYY')}
            </span>
          </div>
          <div className="flex items-center text-gray-500 text-xs">
            <Clock className="w-3 h-3 mr-1" />
            <span>{moment(row.startDate).format('HH:mm')}</span>
            {row.endDate && (
              <>
                <span className="mx-1">-</span>
                <span>{moment(row.endDate).format('HH:mm')}</span>
              </>
            )}
          </div>
          {row.duration && (
            <div className="text-xs text-gray-400 mt-1">
              {t('events.table.duration')}: {row.duration}
            </div>
          )}
          <div className="text-xs text-gray-400 mt-1">
            {row.dateFormatted}
          </div>
        </div>
      );
    }

    if (column.key === 'team') {
      return row.team ? (
        <div className="flex items-center text-sm text-gray-900">
          <Users className="w-4 h-4 text-gray-400 mr-1" />
          {row.team}
        </div>
      ) : (
        <span className="text-gray-400 text-sm">-</span>
      );
    }

    if (column.key === 'reminder') {
      return row.reminder ? (
        <div className="flex items-center text-sm text-gray-900">
          <Bell className="w-4 h-4 text-gray-400 mr-1" />
          {row.reminder}
        </div>
      ) : (
        <span className="text-gray-400 text-sm">-</span>
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
            Title={t('events.title')}
            Subtitle={t('events.subtitle')}
            TABLE_HEAD={tableHead}
            TABLE_ROWS={events}

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
            searchableColumns={["title", "category", "team", "description"]}

            // Actions
            actions={{
              create: "/home/content-management/events/create",
              view: handleView,
              edit: handleEdit,
              delete: handleDelete
            }}
            customRowActions={customRowActions}

            // Customization
            statusColors={statusColors}
            renderCell={customCellRenderer}
            emptyStateMessage={t('events.messages.emptyState')}

            // Loading state
            loading={false}

            // Accessibility
            ariaLabel={t('events.title')}
          />
        </div>
      </div>
    </DashboardLayout>
  );
}