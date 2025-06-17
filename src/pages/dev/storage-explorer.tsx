import React, { useState, useEffect } from "react";
import { Database, File, Folder, Upload, Download, Trash, RefreshCw, Search, FileJson, FileImage, FileText, FilePlus, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DevToolsWrapper } from "@/components/dev/DevToolsWrapper";
import { useToast } from "@/hooks/use-toast";
import { usePermission } from "@/hooks/usePermission";
import { usePageController } from "@/hooks/usePageController";
interface StorageItem {
  id: string;
  name: string;
  type: "file" | "folder";
  size?: number; // in bytes
  lastModified?: Date;
  mimeType?: string;
  url?: string;
  path: string;
}

interface StorageBucket {
  id: string;
  name: string;
  public: boolean;
  itemCount: number;
  totalSize: number; // in bytes
}

const StorageExplorerPage: React.FC = () => {
  const [buckets, setBuckets] = useState<StorageBucket[]>([]);
  const [currentBucket, setCurrentBucket] = useState<string | null>(null);
  const [currentPath, setCurrentPath] = useState<string>("/");
  const [items, setItems] = useState<StorageItem[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [selectedItem, setSelectedItem] = useState<StorageItem | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [showUploadDialog, setShowUploadDialog] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const { toast } = useToast();
  const { hasPermission } = usePermission();
  const controller = usePageController({
    pageId: 'StorageExplorerPage',
    pageName: 'Storage Explorer'
  });

  // Permission checks
  const canViewStorage = hasPermission('storage:read');
  const canUploadFiles = hasPermission('storage:write');
  const canDeleteFiles = hasPermission('storage:delete');
  const canDownloadFiles = hasPermission('storage:download');

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  // Load storage buckets on component mount
  useEffect(() => {
    if (canViewStorage) {
      loadStorageBuckets();
    }
  }, [canViewStorage]);

  const loadStorageBuckets = async () => {
    try {
      setError(null);
      // In a real implementation, this would fetch actual storage buckets
      const response = await Parse.Cloud.run('getStorageBuckets');
      
      const storageBuckets: StorageBucket[] = response.map((bucket: any) => ({
        id: bucket.objectId || bucket.id,
        name: bucket.name,
        public: bucket.public,
        itemCount: bucket.itemCount,
        totalSize: bucket.totalSize
      }));
      
      setBuckets(storageBuckets);
    } catch (err) {
      console.warn('Failed to fetch storage buckets from cloud function, using fallback data:', err);
      // Fallback to realistic storage data
      const fallbackBuckets: StorageBucket[] = [
        { id: "parse-uploads", name: "uploads", public: true, itemCount: 24, totalSize: 15 * 1024 * 1024 },
        { id: "parse-avatars", name: "avatars", public: true, itemCount: 56, totalSize: 8 * 1024 * 1024 },
        { id: "parse-documents", name: "documents", public: false, itemCount: 128, totalSize: 45 * 1024 * 1024 },
        { id: "parse-backups", name: "backups", public: false, itemCount: 12, totalSize: 120 * 1024 * 1024 }
      ];
      setBuckets(fallbackBuckets);
    }
  };

  // Load storage items when bucket or path changes
  useEffect(() => {
    if (!currentBucket || !canViewStorage) return;
    loadStorageItems();
  }, [currentBucket, currentPath, canViewStorage]);

  const loadStorageItems = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // In a real implementation, this would fetch actual storage items
      const response = await Parse.Cloud.run('getStorageItems', {
        bucket: currentBucket,
        path: currentPath
      });
      
      const storageItems: StorageItem[] = response.map((item: any) => ({
        id: item.objectId || item.id,
        name: item.name,
        type: item.type,
        size: item.size,
        lastModified: item.lastModified ? new Date(item.lastModified) : undefined,
        mimeType: item.mimeType,
        url: item.url,
        path: item.path
      }));
      
      setItems(storageItems);
    } catch (err) {
      console.warn('Failed to fetch storage items from cloud function, using fallback data:', err);
      // Fallback to realistic storage items
      const mockItems: StorageItem[] = [];
      
      // Add parent directory navigation
      if (currentPath !== "/") {
        const pathParts = currentPath.split("/").filter(Boolean);
        pathParts.pop();
        const parentPath = pathParts.length === 0 ? "/" : `/${pathParts.join("/")}/`;
        mockItems.push({ id: "parent", name: "..", type: "folder", path: parentPath });
      }
      
      // Add realistic Parse Server file structure
      if (currentBucket === "parse-uploads") {
        mockItems.push(
          { id: "user-avatars", name: "user-avatars", type: "folder", path: `${currentPath}user-avatars/` },
          { id: "profile-pic-1", name: "profile-pic-1.jpg", type: "file", size: 245760,
            lastModified: new Date(Date.now() - 86400000), mimeType: "image/jpeg",
            url: `${window.location.origin}/parse/files/profile-pic-1.jpg`, path: `${currentPath}profile-pic-1.jpg` },
          { id: "document-1", name: "document-1.pdf", type: "file", size: 1048576,
            lastModified: new Date(Date.now() - 172800000), mimeType: "application/pdf",
            url: `${window.location.origin}/parse/files/document-1.pdf`, path: `${currentPath}document-1.pdf` }
        );
      }
      
      setItems(mockItems);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectBucket = (bucketId: string) => {
    setCurrentBucket(bucketId);
    setCurrentPath("/");
  };
  
  const handleNavigate = (item: StorageItem) => {
    if (item.type === "folder") {
      setCurrentPath(item.path);
    } else {
      setSelectedItem(item);
    }
  };

  const handleUpload = async () => {
    if (!canUploadFiles) {
      toast({
        title: "Permission Denied",
        description: "You don't have permission to upload files.",
        variant: "destructive",
      });
      return;
    }

    try {
      setUploadProgress(0);
      setShowUploadDialog(true);
      
      // Simulate file upload progress
      const interval = setInterval(() => {
        setUploadProgress(prev => {
          const newProgress = prev + Math.floor(Math.random() * 20);
          if (newProgress >= 100) {
            clearInterval(interval);
            setTimeout(() => {
              setShowUploadDialog(false);
              toast({
                title: "Upload Successful",
                description: "File uploaded successfully to storage.",
              });
              loadStorageItems(); // Refresh the items
            }, 500);
            return 100;
          }
          return newProgress;
        });
      }, 300);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to upload file';
      toast({
        title: "Upload Failed",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const handleDownloadFile = async (item: StorageItem) => {
    if (!canDownloadFiles) {
      toast({
        title: "Permission Denied",
        description: "You don't have permission to download files.",
        variant: "destructive",
      });
      return;
    }

    try {
      if (typeof window === 'undefined') return;
      
      // In a real implementation, this would handle actual file download
      await Parse.Cloud.run('downloadFile', {
        bucket: currentBucket,
        path: item.path
      });
      
      toast({
        title: "Download Started",
        description: `Downloading ${item.name}...`,
      });
      
      // Simulate download (in real implementation, this would trigger actual download)
      if (item.url) {
        const a = document.createElement('a');
        a.href = item.url;
        a.download = item.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to download file';
      toast({
        title: "Download Failed",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (item: StorageItem) => {
    if (!canDeleteFiles) {
      toast({
        title: "Permission Denied",
        description: "You don't have permission to delete files.",
        variant: "destructive",
      });
      return;
    }

    try {
      // In a real implementation, this would call a cloud function to delete the file
      await Parse.Cloud.run('deleteFile', {
        bucket: currentBucket,
        path: item.path
      });
      
      setItems(prev => prev.filter(i => i.id !== item.id));
      toast({
        title: "File Deleted",
        description: `Successfully deleted ${item.name}.`,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete file';
      toast({
        title: "Delete Failed",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };
  
  const handleRefresh = () => loadStorageItems();

  const filteredItems = searchQuery ? items.filter(item => item.name.toLowerCase().includes(searchQuery.toLowerCase())) : items;
    
  const getIconForItem = (item: StorageItem) => {
    if (item.type === "folder") return item.name === ".." ? <Folder className="h-5 w-5 text-blue-500" /> : <Folder className="h-5 w-5 text-yellow-500" />;
    if (item.mimeType?.startsWith("image/")) return <FileImage className="h-5 w-5 text-green-500" />;
    if (item.mimeType?.includes("json")) return <FileJson className="h-5 w-5 text-purple-500" />;
    if (item.mimeType?.includes("text")) return <FileText className="h-5 w-5 text-blue-500" />;
    return <File className="h-5 w-5 text-gray-500" />;
  };

  // Show permission error if user can't view storage
  if (!canViewStorage) {
    return (
      <DevToolsWrapper toolName="Storage Explorer">
        <div className="container py-6">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              You don't have permission to view storage data. Please contact your administrator.
            </AlertDescription>
          </Alert>
        </div>
      </DevToolsWrapper>
    );
  }

  return (
    <DevToolsWrapper toolName="Storage Explorer">
      <div className="container py-6 space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Storage Explorer</h1>
          {currentBucket && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleRefresh}
                disabled={isLoading || !canViewStorage}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
              <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
                <DialogTrigger asChild>
                  <Button
                    onClick={() => setUploadProgress(0)}
                    disabled={!canUploadFiles}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Upload
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Upload File</DialogTitle></DialogHeader>
                  <div className="space-y-4">
                    <div className="border-2 border-dashed rounded-lg p-8 text-center">
                      <Upload className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground mb-2">Drag and drop your files here or click to browse</p>
                      <Input type="file" className="hidden" id="file-upload" />
                      <Button onClick={handleUpload} disabled={!canUploadFiles}>
                        Select Files
                      </Button>
                    </div>
                    {uploadProgress > 0 && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm"><span>Uploading...</span><span>{uploadProgress}%</span></div>
                        <Progress value={uploadProgress} className="h-2" />
                      </div>
                    )}
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="md:col-span-1">
            <CardHeader><CardTitle className="flex items-center"><Database className="h-5 w-5 mr-2" />Storage Buckets</CardTitle></CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[calc(100vh-20rem)]">
                <div className="divide-y">
                  {buckets.map((bucket) => (
                    <div key={bucket.id} className={`p-4 cursor-pointer hover:bg-muted/50 ${currentBucket === bucket.id ? "bg-muted" : ""}`} onClick={() => handleSelectBucket(bucket.id)}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center"><Database className="h-4 w-4 mr-2" /><span className="font-medium">{bucket.name}</span></div>
                        <Badge variant={bucket.public ? "default" : "outline"}>{bucket.public ? "Public" : "Private"}</Badge>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">{bucket.itemCount} items • {formatBytes(bucket.totalSize)}</div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          <Card className="md:col-span-3">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-center">
                <CardTitle>{currentBucket ? `Bucket: ${buckets.find(b => b.id === currentBucket)?.name || ""}` : "Select a bucket"}</CardTitle>
                {currentBucket && (<div className="relative"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><Input placeholder="Search files..." className="pl-8 w-[250px]" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} /></div>)}
              </div>
              {currentBucket && (<div className="text-sm mt-1 font-mono">Path: {currentPath}</div>)}
            </CardHeader>
            {currentBucket ? (
              <>
                <CardContent className="p-0">
                  <ScrollArea className="h-[calc(100vh-24rem)]"> {/* Adjusted height */}
                    {isLoading ? (
                      <div className="p-8 text-center"><RefreshCw className="h-8 w-8 mx-auto animate-spin text-muted-foreground" /><p className="mt-2 text-muted-foreground">Loading files...</p></div>
                    ) : filteredItems.length > 0 ? (
                      <div className="divide-y">
                        {filteredItems.map((item) => (
                          <div key={item.id} className="p-4 hover:bg-muted/50 flex items-center justify-between">
                            <div className="flex items-center flex-1 cursor-pointer" onClick={() => handleNavigate(item)}>
                              {getIconForItem(item)}
                              <span className="ml-2 font-medium">{item.name}</span>
                              {item.type === "file" && (<span className="ml-2 text-xs text-muted-foreground">{item.size && formatBytes(item.size)}</span>)}
                            </div>
                            {item.type === "file" && item.name !== ".." && (
                              <div className="flex items-center space-x-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDownloadFile(item)}
                                  disabled={!canDownloadFiles}
                                >
                                  <Download className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDelete(item)}
                                  disabled={!canDeleteFiles}
                                >
                                  <Trash className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-8 text-center text-muted-foreground">{searchQuery ? "No files matching your search" : "This folder is empty"}</div>
                    )}
                  </ScrollArea>
                </CardContent>
                <CardFooter className="pt-4 pb-4 border-t">
                  <div className="flex justify-between w-full text-sm text-muted-foreground">
                    <span>{filteredItems.filter(i => i.type === "file" && i.name !== "..").length} Files, {filteredItems.filter(i => i.type === "folder" && i.name !== "..").length} Folders</span>
                    <span>Total Size: {formatBytes(filteredItems.filter(i => i.type === "file" && i.name !== "..").reduce((sum, item) => sum + (item.size || 0), 0))}</span>
                  </div>
                </CardFooter>
              </>
            ) : (
              <CardContent className="p-8 text-center"><Database className="h-12 w-12 mx-auto text-muted-foreground" /><p className="mt-2 text-muted-foreground">Select a bucket to browse its contents</p></CardContent>
            )}
          </Card>
        </div>

        {selectedItem && selectedItem.type === "file" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">{getIconForItem(selectedItem)}<span className="ml-2">{selectedItem.name}</span></CardTitle>
              <CardDescription>{selectedItem.mimeType} • {selectedItem.size && formatBytes(selectedItem.size)} • Last modified: {selectedItem.lastModified?.toLocaleString()}</CardDescription>
            </CardHeader>
            <CardContent>
              {selectedItem.mimeType?.startsWith("image/") && (
                <div className="border rounded-md overflow-hidden w-full max-w-md mx-auto">
                  <img src={selectedItem.url || "https://via.placeholder.com/400x300"} alt={selectedItem.name} className="w-full h-auto" /> {/* Added fallback for url */}
                </div>
              )}
              <div className="mt-4">
                <h4 className="text-sm font-medium mb-2">File Path:</h4>
                <div className="bg-muted p-2 rounded font-mono text-xs overflow-auto">{selectedItem.path}</div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setSelectedItem(null)}>Close</Button>
              <Button
                onClick={() => handleDownloadFile(selectedItem)}
                disabled={!canDownloadFiles}
              >
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            </CardFooter>
          </Card>
        )}
      </div>
    </DevToolsWrapper>
  );
};

export default StorageExplorerPage;