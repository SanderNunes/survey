import { Button, Card, Typography } from "@material-tailwind/react"
import { FileIcon, FileTextIcon, ImageIcon, Download } from "lucide-react"


export function FilesTab({ recentFiles, isLoading }) {


    if (isLoading) {
        return (
            <div className="max-w-full animate-pulse">
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
    const myFiles = simplifyFiles(recentFiles);

    function simplifyFiles(files= []) {
        const simplified = files ? files.map(file => {
            const lastDotIndex = file.name.lastIndexOf(".");

            return {
                id: file.id,
                name: file.name,
                webDavUrl: file.remoteItem?.webDavUrl || "",
                webUrl: file.webUrl,
                lastAccessedDateTime: file.fileSystemInfo?.lastAccessedDateTime || "",
                lastModifiedDateTime: file.fileSystemInfo?.lastModifiedDateTime || "",
                size: file.size,
                type: lastDotIndex !== -1 ? file.name.substring(lastDotIndex + 1) : "",
            };
        }) : [];

        // Sort by lastAccessedDateTime descending and get top 5
        return simplified
            .filter(f => f.lastAccessedDateTime) // Ensure date exists
            .sort((a, b) => new Date(b.lastAccessedDateTime) - new Date(a.lastAccessedDateTime))
            .slice(0, 5);
    }


    // Format file size for display
    const formatFileSize = (bytes) => {
        if (bytes < 1024) return bytes + " B"
        else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB"
        else return (bytes / 1048576).toFixed(1) + " MB"
    }

    // Format date for display
    const formatDate = (dateString) => {
        const date = new Date(dateString)
        return date.toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
        })
    }

    // Get icon based on file type
    const getFileIcon = (type) => {
        switch (type) {
            case "image":
                return <ImageIcon className="h-6 w-6" />
            case "pdf":
                return <FileTextIcon className="h-6 w-6" />
            default:
                return <FileIcon className="h-6 w-6" />
        }
    }

    return (
        <div className="space-y-6">
            <Card className="border-0 shadow-none">
                <Card.Body className="p-6">
                    <h3 className="text-lg font-medium mb-4">Recent Files</h3>
                    <div className="space-y-3">
                        {myFiles && myFiles.map((file) => (
                            <a href={file.webUrl || file.webDavUrl} target="_blank" rel="noopener noreferrer">
                                <div
                                    key={file.id}
                                    className="flex items-center gap-4 p-3 border border-border/40 rounded-lg bg-background hover:bg-primary-500/10 hover:text-primary-500 focus:bg-primary-500/10 focus:text-primary-500 dark:hover:text-primary-500 dark:focus:text-primary-500 mt-2"
                                >
                                    <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center bg-white rounded-md">
                                        {getFileIcon(file.type)}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-normal truncate">{file.name}</h3>
                                        <div className="flex flex-wrap gap-x-4  text-sm text-muted-foreground ">
                                            <span>Modified: {formatDate(file.lastModifiedDateTime)}</span>
                                            <span>{formatFileSize(file.size)}</span>
                                        </div>
                                    </div>


                                </div>
                            </a>
                        ))}
                    </div>
                </Card.Body>
            </Card>
        </div>
    )
}
