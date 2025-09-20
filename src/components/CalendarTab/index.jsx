
import { Card, Typography } from "@material-tailwind/react"
import { Calendar, Clock } from "lucide-react"


export function CalendarTab({ calendarEvents, isLoading }) {

    if (isLoading) {
        return (
            <div className="max-w-full animate-pulse overflow-auto">
                <Typography
                    as="div"
                    variant="h1"
                    className="mb-4 h-3 w-56 rounded-full bg-gray-300"
                >
                    &nbsp;
                </Typography>
            </div>
        )
    }
    const myEvents = simplifyEvents(calendarEvents)

    function simplifyEvents(fullEvents) {
        return fullEvents ? fullEvents.map(event => ({
            id: event.id,
            subject: event.subject,
            start: {
                dateTime: event.start?.dateTime || "",
                timeZone: event.start?.timeZone || "UTC",
            },
            end: {
                dateTime: event.end?.dateTime || "",
                timeZone: event.end?.timeZone || "UTC",
            },
            location: {
                displayName: event.location?.displayName || "",
            },
            organizer: {
                emailAddress: {
                    name: event.organizer?.emailAddress?.name || "",
                    address: event.organizer?.emailAddress?.address || "",
                }
            }
        })) : [];
    }



    // Format date and time for display
 const formatDateTime = (dateTimeStr) => {
  const date = new Date(dateTimeStr);
  date.setHours(date.getHours() + 1);

  return {
    date: date.toLocaleDateString("pt-AO", { weekday: "short", month: "short", day: "numeric" }),
    time: date.toLocaleTimeString("pt-AO", { hour: "numeric", minute: "2-digit", hour12: true }),
  };
};


    return (
        <div className="space-y-6">
            <Card className="border-0 shadow-none">
                <Card.Body className="p-6">
                    <h3 className="text-lg font-medium mb-4">Upcoming Events</h3>
                    <div className="space-y-4">
                        {myEvents.map((event) => {
                            const start = formatDateTime(event.start.dateTime)
                            const end = formatDateTime(event.end.dateTime)

                            return (
                                <div
                                    key={event.id}
                                    className="flex flex-col sm:flex-row gap-4 p-4 border border-border/40 rounded-lg bg-background"
                                >
                                    <div className="flex-shrink-0 flex flex-col items-center justify-center w-16 h-16 bg-white rounded-md">
                                        <Calendar className="h-6 w-6 text-muted-foreground" />
                                        <span className="text-xs font-medium mt-1">{start.date}</span>
                                    </div>

                                    <div className="flex-1">
                                        <h3 className="font-normal">{event.subject}</h3>
                                        <div className="flex items-center gap-1 mt-1 text-sm text-muted-foreground">
                                            <Clock className="h-3.5 w-3.5" />
                                            <span>
                                                {start.time} - {end.time}
                                            </span>
                                        </div>
                                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                                            <span className="text-muted-foreground">Location: {event.location.displayName}</span>
                                            <span className="text-muted-foreground">Organizer: {event.organizer.emailAddress.name}</span>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </Card.Body>
            </Card>
        </div>
    )
}
