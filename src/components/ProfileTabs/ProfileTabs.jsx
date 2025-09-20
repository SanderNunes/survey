import { Tabs } from "@material-tailwind/react";
import { OverviewTab } from "../ProfileOverviewTab";
import { useGraph } from "@/hooks/useGraph";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { CalendarTab } from "../CalendarTab";
import { FilesTab } from "../FilesTab";
import { OrganizationTab } from "../OrganizationTab";

export default function ProfileTabs({ user }) {
    const { accessToken } = useAuth();
    const { calendarEvents, recentFiles, getCalendarEvents, getRecentFiles } = useGraph();
    const [ isLoading, setIsloading ] = useState(true);

    useEffect(() => {
        const handleGetItems = async () => {
            await getCalendarEvents();
            await getRecentFiles();
            setIsloading(false)
        }

        handleGetItems()

    }, [accessToken, getCalendarEvents, getRecentFiles]);

    if (isLoading) {
        <></>
    }


    return (
        <div className="h-[45rem] overflow-auto">
        <Tabs defaultValue="overview">
            <Tabs.List className="w-full ">
                <Tabs.Trigger className="w-full" value="overview">
                    Overview
                </Tabs.Trigger>
                <Tabs.Trigger className="w-full" value="calendar">
                    Calendar
                </Tabs.Trigger>
                <Tabs.Trigger className="w-full" value="files">
                    Files
                </Tabs.Trigger>
                {/* <Tabs.Trigger className="w-full" value="org">
                    Org
                </Tabs.Trigger> */}
                 <Tabs.TriggerIndicator className="rounded-none border-b-2 border-primary-500 bg-transparent shadow-none" />
            </Tabs.List>
            <Tabs.Panel value="overview">
                <OverviewTab user={user} />
            </Tabs.Panel>
            <Tabs.Panel value="calendar">
               <CalendarTab calendarEvents={calendarEvents} isLoading={isLoading} />
            </Tabs.Panel>
            <Tabs.Panel value="files">
               <FilesTab recentFiles={recentFiles} isLoading={isLoading}/>
            </Tabs.Panel>
            {/* <Tabs.Panel value="org">
                <OrganizationTab />
            </Tabs.Panel> */}
        </Tabs>
        </div>
    );
}
