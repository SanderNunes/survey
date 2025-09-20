import React, { useState, useEffect } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import allLocales from "@fullcalendar/core/locales-all";
import { useTranslation } from "react-i18next";
import { useSharePoint } from "@/hooks/useSharePoint";

const CalendarPage = () => {
  const { t, i18n } = useTranslation();
  const { getAllEvents } = useSharePoint();
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Helper function to check if a date is a weekday (not Saturday or Sunday)
  const isWeekday = (date) => {
    const dayOfWeek = date.getDay();
    return dayOfWeek !== 0 && dayOfWeek !== 6; // 0 = Sunday, 6 = Saturday
  };

  // Helper function to get the next weekday if the date falls on a weekend
  const getNextWeekday = (date) => {
    const newDate = new Date(date);
    while (!isWeekday(newDate)) {
      newDate.setDate(newDate.getDate() + 1);
    }
    return newDate;
  };

  // Helper function to adjust end date if it falls on weekend
  const adjustEndDateForWeekend = (endDate) => {
    if (!endDate) return null;

    const date = new Date(endDate);
    const dayOfWeek = date.getDay();

    // If end date is Saturday (6), move to Monday (+2 days)
    // If end date is Sunday (0), move to Monday (+1 day)
    if (dayOfWeek === 6) { // Saturday
      date.setDate(date.getDate() + 2);
    } else if (dayOfWeek === 0) { // Sunday
      date.setDate(date.getDate() + 1);
    }

    return date;
  };

  // Enhanced function to determine event color with full PT support
  const getEventColor = (category, eventType) => {
    const colorMap = {
      // English Categories
      'Meeting': '#A1007C',
      'Conference': '#10b981',
      'Audit': '#3b82f6',
      'Training': '#f59e0b',
      'Holiday': '#8b5cf6',
      'Celebration': '#6b7280',
      'Workshop': '#06b6d4',
      'Review': '#ec4899',

      // Portuguese Categories
      'Reunião': '#A1007C',
      'Conferência': '#10b981',
      'Auditoria': '#3b82f6',
      'Formação': '#f59e0b',
      'Feriado': '#8b5cf6',
      'Celebração': '#6b7280',
      'Workshop': '#06b6d4',
      'Revisão': '#ec4899',

      // English Event Types
      'Internal': '#3b82f6',
      'External': '#06b6d4',
      'Client': '#ec4899',
      'Personal': '#84cc16',
      'Company': '#8b5cf6',

      // Portuguese Event Types
      'Interno': '#3b82f6',
      'Externo': '#06b6d4',
      'Cliente': '#ec4899',
      'Pessoal': '#84cc16',
      'Empresa': '#8b5cf6',

      // Case insensitive versions - English
      'meeting': '#A1007C',
      'conference': '#10b981',
      'audit': '#3b82f6',
      'training': '#f59e0b',
      'holiday': '#8b5cf6',
      'celebration': '#6b7280',
      'workshop': '#06b6d4',
      'review': '#ec4899',
      'internal': '#3b82f6',
      'external': '#06b6d4',
      'client': '#ec4899',
      'personal': '#84cc16',
      'company': '#8b5cf6',

      // Case insensitive versions - Portuguese
      'reunião': '#A1007C',
      'conferência': '#10b981',
      'auditoria': '#3b82f6',
      'formação': '#f59e0b',
      'feriado': '#8b5cf6',
      'celebração': '#6b7280',
      'revisão': '#ec4899',
      'interno': '#3b82f6',
      'externo': '#06b6d4',
      'cliente': '#ec4899',
      'pessoal': '#84cc16',
      'empresa': '#8b5cf6',

      // Dynamic i18n translations (will be populated based on current language)
      [t('calendar.categories.meeting')]: '#A1007C',
      [t('calendar.categories.conference')]: '#10b981',
      [t('calendar.categories.audit')]: '#3b82f6',
      [t('calendar.categories.training')]: '#f59e0b',
      [t('calendar.categories.holiday')]: '#8b5cf6',
      [t('calendar.categories.celebration')]: '#6b7280',
      [t('calendar.categories.workshop')]: '#06b6d4',
      [t('calendar.categories.review')]: '#ec4899',

      [t('calendar.eventTypes.internal')]: '#3b82f6',
      [t('calendar.eventTypes.external')]: '#06b6d4',
      [t('calendar.eventTypes.client')]: '#ec4899',
      [t('calendar.eventTypes.personal')]: '#84cc16',
      [t('calendar.eventTypes.company')]: '#8b5cf6',
    };

    // Try exact matches first
    if (category && colorMap[category]) return colorMap[category];
    if (eventType && colorMap[eventType]) return colorMap[eventType];

    // Try case-insensitive matches
    if (category) {
      const categoryLower = category.toLowerCase();
      if (colorMap[categoryLower]) return colorMap[categoryLower];
    }

    if (eventType) {
      const eventTypeLower = eventType.toLowerCase();
      if (colorMap[eventTypeLower]) return colorMap[eventTypeLower];
    }

    // Try common variations and remove accents for Portuguese
    if (category) {
      const normalized = category.toLowerCase()
        .replace(/ã/g, 'a')
        .replace(/ç/g, 'c')
        .replace(/é/g, 'e')
        .replace(/ê/g, 'e')
        .replace(/í/g, 'i')
        .replace(/ó/g, 'o')
        .replace(/ô/g, 'o')
        .replace(/ú/g, 'u');
      
      if (colorMap[normalized]) return colorMap[normalized];
    }

    // Default color
    return '#6366f1';
  };

  // Function to generate recurring events based on recurrence type
  const generateRecurringEvents = (baseEvent, recurrenceType, startDate, endDate, maxYears = 2) => {
    if (!recurrenceType || recurrenceType.toLowerCase() === 'none') {
      return [baseEvent];
    }

    const events = [];
    const start = new Date(startDate);

    // Adjust end date if it falls on a weekend (move to following Monday)
    const adjustedEndDate = adjustEndDateForWeekend(endDate);
    const eventEndDate = adjustedEndDate;

    if (eventEndDate) {
      eventEndDate.setHours(23, 59, 59, 999); // Set to end of day
    }

    const maxDate = new Date();
    maxDate.setFullYear(maxDate.getFullYear() + maxYears);

    // Use the earlier of the event's end date or the max date
    const cutoffDate = eventEndDate && eventEndDate < maxDate ? eventEndDate : maxDate;

    let currentDate = new Date(start);

    // Ensure the first occurrence is on a weekday
    if (!isWeekday(currentDate)) {
      currentDate = getNextWeekday(currentDate);
    }

    let occurrenceCount = 0;
    const maxOccurrences = 200; // Safety limit

    while (currentDate <= cutoffDate && occurrenceCount < maxOccurrences) {
      // Normalize current date for comparison (set to start of day)
      const normalizedCurrentDate = new Date(currentDate);
      normalizedCurrentDate.setHours(0, 0, 0, 0);

      // Normalize end date for comparison (set to start of day)
      const normalizedEndDate = eventEndDate ? new Date(eventEndDate) : null;
      if (normalizedEndDate) {
        normalizedEndDate.setHours(0, 0, 0, 0);
      }

      // Only add if it's a weekday AND the date is within the event's end date
      if (isWeekday(currentDate) && (!normalizedEndDate || normalizedCurrentDate <= normalizedEndDate)) {
        events.push({
          ...baseEvent,
          id: `${baseEvent.id}_${currentDate.toISOString().split('T')[0]}`,
          start: currentDate.toISOString().split('T')[0],
          end: currentDate.toISOString().split('T')[0],
          allDay: true,
          extendedProps: {
            ...baseEvent.extendedProps,
            recurrenceInstance: true,
            recurrenceDate: currentDate.toISOString().split('T')[0]
          }
        });
        occurrenceCount++;
      }

      // Calculate next occurrence based on recurrence type
      switch (recurrenceType.toLowerCase()) {
        case 'daily':
          currentDate.setDate(currentDate.getDate() + 1);
          break;

        case 'weekly':
          currentDate.setDate(currentDate.getDate() + 7);
          break;

        case 'monthly':
          // Keep the same day of the month
          const targetDay = start.getDate();
          currentDate.setMonth(currentDate.getMonth() + 1);

          // Handle cases where the target day doesn't exist in the new month
          const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
          if (targetDay > daysInMonth) {
            currentDate.setDate(daysInMonth);
          } else {
            currentDate.setDate(targetDay);
          }

          // If it falls on a weekend, move to next weekday
          if (!isWeekday(currentDate)) {
            currentDate = getNextWeekday(currentDate);
          }
          break;

        default:
          // Unknown recurrence type, stop generating
          return events;
      }

      // Additional check: if we've moved beyond the end date, stop generating
      if (eventEndDate) {
        const normalizedCurrentDate = new Date(currentDate);
        normalizedCurrentDate.setHours(0, 0, 0, 0);

        const normalizedEndDate = new Date(eventEndDate);
        normalizedEndDate.setHours(0, 0, 0, 0);

        if (normalizedCurrentDate > normalizedEndDate) {
          break;
        }
      }
    }

    return events;
  };

  // Function to create individual events for each day in a date range (for non-recurring events)
  const createDailyEvents = (event, startDate, endDate) => {
    const events = [];
    const start = new Date(startDate);
    const end = new Date(endDate);

    // Normalize dates to avoid timezone issues
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);

    const current = new Date(start);

    while (current <= end) {
      events.push({
        ...event,
        id: `${event.id}_${current.toISOString().split('T')[0]}`,
        start: current.toISOString().split('T')[0],
        end: current.toISOString().split('T')[0],
        allDay: true,
      });
      current.setDate(current.getDate() + 1);
    }

    return events;
  };

  // Load events from SharePoint on component mount
  useEffect(() => {
    const loadEvents = async () => {
      try {
        setLoading(true);
        setError(null);
        const sharepointEvents = await getAllEvents();

        // Transform SharePoint events to FullCalendar format
        let formattedEvents = [];

        sharepointEvents?.forEach(event => {
          const baseEvent = {
            id: event.Id,
            title: event.Title || t('calendar.events.noTitle'),
            backgroundColor: getEventColor(event.Category, event.Event_Type),
            borderColor: 'transparent',
            extendedProps: {
              originalId: event.Id,
              category: event.Category,
              description: event.Description,
              eventType: event.Event_Type,
              team: event.Team,
              accessLevel: event.Access_Level,
              status: event.Status,
              reminder: event.Reminder,
              notes: event.Notes,
              recurrenceType: event.Recurrence_Type,
              author: event.Author?.Title,
              editor: event.Editor?.Title,
              created: event.Created,
              modified: event.Modified,
              originalStart: event.Start_Date,
              originalEnd: event.End_Date
            }
          };

          // Check if event has recurrence
          if (event.Recurrence_Type && event.Recurrence_Type.toLowerCase() !== 'none') {
            // Generate recurring events
            const recurringEvents = generateRecurringEvents(
              baseEvent,
              event.Recurrence_Type,
              event.Start_Date,
              event.End_Date
            );
            formattedEvents = formattedEvents.concat(recurringEvents);
          } else {
            // Handle non-recurring events (existing logic)
            const startDate = new Date(event.Start_Date);
            const endDate = new Date(event.End_Date);

            // Remove time component for comparison
            const startDay = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
            const endDay = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());

            if (startDay.getTime() === endDay.getTime()) {
              // Single day event
              formattedEvents.push({
                ...baseEvent,
                start: event.Start_Date,
                end: event.End_Date,
              });
            } else {
              // Multi-day event - create separate events for each day
              const dailyEvents = createDailyEvents(baseEvent, startDay, endDay);
              formattedEvents = formattedEvents.concat(dailyEvents);
            }
          }
        });

        setEvents(formattedEvents || []);
      } catch (error) {
        console.error('Error loading events:', error);
        setError(t('calendar.errors.loadEvents'));

        // Fallback to sample events with Portuguese examples
        setEvents([
          {
            id: 1,
            title: i18n.language === 'pt' ? 'Reunião Semanal' : 'Weekly Meeting',
            date: "2025-09-02",
            backgroundColor: "#A1007C",
            borderColor: 'transparent',
            extendedProps: {
              recurrenceType: 'Weekly',
              category: i18n.language === 'pt' ? 'Reunião' : 'Meeting'
            }
          },
          {
            id: 2,
            title: i18n.language === 'pt' ? 'Conferência Mensal' : 'Monthly Conference',
            date: "2025-09-05",
            backgroundColor: "#10b981",
            borderColor: 'transparent',
            extendedProps: {
              recurrenceType: 'Monthly',
              category: i18n.language === 'pt' ? 'Conferência' : 'Conference'
            }
          },
          {
            id: 3,
            title: i18n.language === 'pt' ? 'Auditoria Trimestral' : 'Quarterly Audit',
            date: "2025-09-10",
            backgroundColor: "#3b82f6",
            borderColor: 'transparent',
            extendedProps: {
              recurrenceType: 'Quarterly',
              category: i18n.language === 'pt' ? 'Auditoria' : 'Audit'
            }
          },
        ]);
      } finally {
        setLoading(false);
      }
    };

    loadEvents();
  }, [getAllEvents, t, i18n.language]);

  const handleDateClick = (info) => {
    // You can add logic here to create a new event
  };

  const handleEventClick = (info) => {
    const event = info.event;
    setSelectedEvent({
      id: event.extendedProps.originalId || event.id,
      title: event.title,
      start: event.extendedProps.originalStart || event.startStr,
      end: event.extendedProps.originalEnd || event.endStr,
      color: event.backgroundColor,
      category: event.extendedProps.category,
      description: event.extendedProps.description,
      eventType: event.extendedProps.eventType,
      team: event.extendedProps.team,
      accessLevel: event.extendedProps.accessLevel,
      status: event.extendedProps.status,
      reminder: event.extendedProps.reminder,
      notes: event.extendedProps.notes,
      recurrenceType: event.extendedProps.recurrenceType,
      author: event.extendedProps.author,
      editor: event.extendedProps.editor,
      created: event.extendedProps.created,
      modified: event.extendedProps.modified,
      recurrenceInstance: event.extendedProps.recurrenceInstance,
      recurrenceDate: event.extendedProps.recurrenceDate
    });
  };

  // Updated function to format dates without hours - only show date
  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString(i18n.language === 'pt' ? 'pt-PT' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatDateShort = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString(i18n.language === 'pt' ? 'pt-PT' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Function to get recurrence description for display
  const getRecurrenceDescription = (recurrenceType) => {
    if (!recurrenceType || recurrenceType.toLowerCase() === 'none') return '';

    const recurrenceMap = {
      daily: t('calendar.recurrence.daily') || 'Daily (weekdays only)',
      weekly: t('calendar.recurrence.weekly') || 'Weekly',
      monthly: t('calendar.recurrence.monthly') || 'Monthly',
      quarterly: t('calendar.recurrence.quarterly') || 'Quarterly',
      semestral: t('calendar.recurrence.semestral') || 'Every 6 months',
      yearly: t('calendar.recurrence.yearly') || 'Yearly'
    };

    return recurrenceMap[recurrenceType.toLowerCase()] || recurrenceType;
  };

  if (loading) {
    return (
      <div className="container my-8">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#A1007C] mx-auto mb-4"></div>
            <p className="text-gray-600">{t('calendar.loading.events')}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container my-8">
      {/* Error Message */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {/* Calendar */}
      <div className="rounded-2xl p-4">
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          displayEventTime={false}
          displayEventEnd={false}
          initialView="dayGridMonth"
          headerToolbar={{
            left: "prev,next today",
            center: "title",
            right: "dayGridMonth,timeGridWeek,timeGridDay",
          }}
          buttonText={{
            today: t('calendar.navigation.today'),
            month: t('calendar.views.dayGridMonth'),
            week: t('calendar.views.timeGridWeek'),
            day: t('calendar.views.timeGridDay'),
            prev: t('calendar.navigation.prev'),
            next: t('calendar.navigation.next')
          }}
          locale={i18n.language}
          locales={allLocales}
          events={events}
          dateClick={handleDateClick}
          eventClick={handleEventClick}
          height="80vh"
          eventDisplay="block"
          dayMaxEvents={4}
          moreLinkText={(num) => t('calendar.events.moreEvents', { count: num })}
          allDayText={t('calendar.events.allDay')}
          noEventsText={t('calendar.errors.noEventsFound')}
        />
      </div>

      {/* Enhanced Event Details Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-30 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-start">
                <h2 className="text-2xl font-bold mb-2" style={{ color: selectedEvent.color }}>
                  {selectedEvent.title}
                </h2>
                <button
                  onClick={() => setSelectedEvent(null)}
                  className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
                  aria-label={t('calendar.modal.close')}
                >
                  ×
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {selectedEvent.category && (
                  <span
                    className="inline-block px-3 py-1 rounded-full text-sm font-medium text-white"
                    style={{ backgroundColor: selectedEvent.color }}
                  >
                    {selectedEvent.category}
                  </span>
                )}
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              {/* Date and Time */}
              <div>
                <h3 className="font-semibold text-gray-700 mb-1">
                  {t('calendar.modal.sections.dateTime')}
                </h3>
                {selectedEvent.recurrenceInstance && selectedEvent.recurrenceDate ? (
                  <p className="text-gray-600">
                    <strong>{t('calendar.modal.fields.start') || 'This Occurrence'}:</strong> {formatDate(selectedEvent.recurrenceDate)}
                  </p>
                ) : (
                  <>
                    <p className="text-gray-600">
                      <strong>{t('calendar.modal.fields.start')}:</strong> {formatDate(selectedEvent.start)}
                    </p>
                    {selectedEvent.end && (
                      <p className="text-gray-600">
                        <strong>{t('calendar.modal.fields.end')}:</strong> {formatDate(selectedEvent.end)}
                      </p>
                    )}
                  </>
                )}
              </div>

              {/* Recurrence Information */}
              {selectedEvent.recurrenceType && (
                <div>
                  <h3 className="font-semibold text-gray-700 mb-1">
                    {t('calendar.modal.sections.recurrence') || 'Recurrence'}
                  </h3>
                  <p className="text-gray-600">{getRecurrenceDescription(selectedEvent.recurrenceType)}</p>
                </div>
              )}

              {/* Description */}
              {selectedEvent.description && (
                <div>
                  <h3 className="font-semibold text-gray-700 mb-1">
                    {t('calendar.modal.sections.description')}
                  </h3>
                  <p className="text-gray-600">{selectedEvent.description}</p>
                </div>
              )}

              {/* Event Details Grid */}
              <div className="grid grid-cols-2 gap-4">
                {selectedEvent.eventType && (
                  <div>
                    <h4 className="font-medium text-gray-700">
                      {t('calendar.modal.fields.eventType')}
                    </h4>
                    <p className="text-gray-600">{selectedEvent.eventType}</p>
                  </div>
                )}

                {selectedEvent.team && (
                  <div>
                    <h4 className="font-medium text-gray-700">
                      {t('calendar.modal.fields.team')}
                    </h4>
                    <p className="text-gray-600">{selectedEvent.team}</p>
                  </div>
                )}

                {selectedEvent.status && (
                  <div>
                    <h4 className="font-medium text-gray-700">
                      {t('calendar.modal.fields.status')}
                    </h4>
                    <p className="text-gray-600">{selectedEvent.status}</p>
                  </div>
                )}

                {selectedEvent.reminder && (
                  <div>
                    <h4 className="font-medium text-gray-700">
                      {t('calendar.modal.fields.reminder')}
                    </h4>
                    <p className="text-gray-600">{selectedEvent.reminder}</p>
                  </div>
                )}

                {selectedEvent.accessLevel && (
                  <div className="col-span-2">
                    <h4 className="font-medium text-gray-700">
                      {t('calendar.modal.fields.accessLevel')}
                    </h4>
                    <p className="text-gray-600">{selectedEvent.accessLevel}</p>
                  </div>
                )}
              </div>

              {/* Notes */}
              {selectedEvent.notes && (
                <div>
                  <h3 className="font-semibold text-gray-700 mb-1">
                    {t('calendar.modal.sections.notes')}
                  </h3>
                  <p className="text-gray-600">{selectedEvent.notes}</p>
                </div>
              )}

              {/* Metadata */}
              <div className="border-t pt-4 mt-4 text-sm text-gray-500">
                <h4 className="font-medium text-gray-700 mb-2">
                  {t('calendar.modal.sections.metadata')}
                </h4>
                {selectedEvent.author && (
                  <p>
                    <strong>{t('calendar.modal.fields.createdBy')}:</strong> {selectedEvent.author}
                  </p>
                )}
                {selectedEvent.created && (
                  <p>
                    <strong>{t('calendar.modal.fields.created')}:</strong> {formatDateShort(selectedEvent.created)}
                  </p>
                )}
                {selectedEvent.modified && (
                  <p>
                    <strong>{t('calendar.modal.fields.lastModified')}:</strong> {formatDateShort(selectedEvent.modified)}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modern Styling */}
      <style jsx global>{`
        .fc {
          --fc-border-color: #FFF;
          --fc-today-bg-color: #dbeafe;
          --fc-event-border-color: transparent;
          --fc-neutral-bg-color: transparent;
        }
        .fc .fc-scrollgrid {
          background-color: #FFF;
          border-radius: 1rem;
        }
        .fc .fc-toolbar-title {
          font-size: 1.4rem;
          font-weight: 700;
          color: #1f2937;
        }
        .fc .fc-toolbar-title,
          .fc .fc-button,
          .fc .fc-col-header-cell-cushion,
          .fc .fc-daygrid-day-number {
            text-transform: capitalize;
          }
        .fc .fc-button {
          background-color: #A1007C;
          border: none;
          border-radius: 0.6rem;
          padding: 0.5rem 1rem;
          font-size: 0.9rem;
          font-weight: 500;
          transition: all 0.2s ease-in-out;
        }
        .fc .fc-button:hover {
          background-color: #7d0061;
          transform: translateY(-1px);
        }
        .fc-daygrid-day {
          transition: background 0.2s ease;
          border-radius: 0.5rem !important;
          margin: 2px;
          border: 1px solid #FFF !important;
        }
        .fc-daygrid-day:hover {
          background: #f3f4f6 !important;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          border-radius: 0.5rem !important;
        }
        .fc .fc-daygrid-day-frame {
          border-radius: 0.5rem;
          padding: 4px;
        }
        .fc .fc-daygrid-day-number {
          padding: 4px 8px;
          border-radius: 50%;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 32px;
          height: 32px;
          font-weight: 600;
          transition: all 0.2s ease;
        }
        .fc .fc-daygrid-day-number:hover {
          background-color: #A1007C;
          color: white;
        }
        .fc .fc-day-today .fc-daygrid-day-number {
          background-color: #A1007C;
          color: white;
          font-weight: 700;
        }
        .fc-event {
          border-radius: 0.5rem !important;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
          font-weight: 500;
          cursor: pointer;
          margin: 2px 0;
        }
        .fc-event:hover {
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          transform: translateY(-1px);
        }
        .fc .fc-more-link {
          color: #A1007C;
          font-weight: 500;
          border-radius: 0.25rem;
          padding: 2px 6px;
        }
        .fc .fc-col-header-cell {
          border-radius: 0.5rem 0.5rem 0 0;
          background-color: #FFF;
          font-weight: 600;
          color: #475569;
        }
        .fc .fc-scrollgrid-section-body > td {
          border-radius: 0 0 0.5rem 0.5rem;
        }
      `}</style>
    </div>
  );
};

export default CalendarPage;