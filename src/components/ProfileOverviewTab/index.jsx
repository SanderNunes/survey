import { Avatar, Card } from "@material-tailwind/react";
import FallBackAvatar from "../FallBackAvatar";

export function OverviewTab({ user }) {


  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card className="border-0 shadow-none">
        <Card.Body className="p-6">
          <h3 className="text-lg font-medium mb-4">Basic Information</h3>
          <dl className="grid grid-cols-1 gap-3 text-sm">
            <div className="grid grid-cols-3 gap-1">
              <dt className="font-medium text-muted-foreground">Full Name:</dt>
              <dd className="col-span-2">{user?.displayName}</dd>
            </div>
            <div className="grid grid-cols-3 gap-1">
              <dt className="font-medium text-muted-foreground">Position:</dt>
              <dd className="col-span-2">{user?.jobTitle}</dd>
            </div>
            <div className="grid grid-cols-3 gap-1">
              <dt className="font-medium text-muted-foreground">Department:</dt>
              <dd className="col-span-2">{user?.profileBeta?.positions[0]?.detail?.company?.department}</dd>
            </div>
            {user?.officeLocation && (
              <div className="grid grid-cols-3 gap-1">
                <dt className="font-medium text-muted-foreground">Location:</dt>
                <dd className="col-span-2">{user?.officeLocation}</dd>
              </div>
            )}
          </dl>
        </Card.Body>
      </Card>

      <Card className="border-0 shadow-none">
        <Card.Body className="p-6">
          <h3 className="text-lg font-medium mb-4">Manager</h3>
          {user?.profileBeta?.positions[0].manager ? (
            <div className="flex items-center gap-4">

              <FallBackAvatar src={''} alt={user?.profileBeta?.positions[0].manager.displayName} isDark={true} className={'h-20 w-20 text-2xl border-4 border-background shadow-md'}/>

              <div>
                <p className="font-medium">{user?.profileBeta?.positions[0].manager.displayName}</p>
                <p className="text-sm text-muted-foreground">{user?.profileBeta?.positions[0].manager.userPrincipalName}</p>
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground">No manager information available</p>
          )}
        </Card.Body>
      </Card>

      {/* <Card className="md:col-span-2 border-0 shadow-none">
        <Card.Body className="p-6">
          <h3 className="text-lg font-medium mb-4">Direct Reports</h3>
          {user?.directReports && user?.directReports.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {user?.directReports.map((report) => (
                <div
                  key={report.mail}
                  className="flex items-center gap-4 p-4 rounded-lg border border-border/40 bg-background"
                >
                  <Avatar className="h-10 w-10 border border-border/50" />
                  <div>
                    <p className="font-medium">{report.displayName}</p>
                    <p className="text-sm text-muted-foreground">{report.jobTitle}</p>
                    <p className="text-sm text-muted-foreground">{report.mail}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">No direct reports</p>
          )}
        </Card.Body>
      </Card> */}
    </div>
  )
}
