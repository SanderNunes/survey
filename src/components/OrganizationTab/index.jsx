import { Avatar, Card } from "@material-tailwind/react"



export function OrganizationTab({ user, isLoading }) {
  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-[500px] w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card className="border border-border/40 shadow-sm">
        <Card.Body className="p-6">
          <h3 className="text-lg font-medium mb-6">Organization Chart</h3>
          <div className="flex flex-col items-center">
            {/* Manager */}
            {user.manager && (
              <div className="mb-8">
                <div className="flex flex-col items-center">
                  <Avatar className="h-16 w-16 mb-2 border border-border/50" />
                  <div className="text-center">
                    <p className="font-medium">{user?.manager.displayName}</p>
                    <p className="text-sm text-muted-foreground">{user?.manager.jobTitle}</p>
                  </div>
                </div>
                <div className="h-8 w-0.5 bg-border mx-auto my-2"></div>
              </div>
            )}

            {/* Current User */}
            <div className="mb-8">
              <div className="flex flex-col items-center">
                <Avatar className="h-20 w-20 mb-2 border-2 border-primary-500/20 shadow-sm" />
                <div className="text-center">
                  <p className="font-medium">{user.displayName}</p>
                  <p className="text-sm text-muted-foreground">{user.jobTitle}</p>
                </div>
              </div>
            </div>

            {/* Direct Reports */}
            {user.directReports && user.directReports.length > 0 && (
              <>
                <div className="h-8 w-0.5 bg-border mx-auto mb-4"></div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 w-full">
                  {user.directReports.map((report) => (
                    <div key={report.mail} className="flex flex-col items-center">
                      <Avatar className="h-16 w-16 mb-2 border border-border/50" />
                      <div className="text-center">
                        <p className="font-medium">{report.displayName}</p>
                        <p className="text-sm text-muted-foreground">{report.jobTitle}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </Card.Body>
      </Card>
    </div>
  )
}
