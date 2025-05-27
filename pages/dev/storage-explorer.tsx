import React, { useState, useEffect } from "react";
import { Database, File, Folder, Upload, Download, Trash, RefreshCw, Search, FileJson, FileImage, FileText, FilePlus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
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

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  useEffect(() => {
    const mockBuckets: StorageBucket[] = [
      { id: "bucket-1", name: "uploads", public: true, itemCount: 24, totalSize: 15 * 1024 * 1024 },
      { id: "bucket-2", name: "avatars", public: true, itemCount: 56, totalSize: 8 * 1024 * 1024 },
      { id: "bucket-3", name: "documents", public: false, itemCount: 128, totalSize: 45 * 1024 * 1024 },
      { id: "bucket-4", name: "backups", public: false, itemCount: 12, totalSize: 120 * 1024 * 1024 }
    ];
    setBuckets(mockBuckets);
  }, []);

  useEffect(() => {
    if (!currentBucket) return;
    setIsLoading(true);
    
    setTimeout(() => {
      const mockItems: StorageItem[] = [];
      if (currentPath !== "/") {
        const pathParts = currentPath.split("/").filter(Boolean);
        pathParts.pop();
        const parentPath = pathParts.length === 0 ? "/" : `/${pathParts.join("/")}/`;
        mockItems.push({ id: "parent", name: "..", type: "folder", path: parentPath });
      }
      
      const folderCount = Math.floor(Math.random() * 5);
      for (let i = 0; i < folderCount; i++) {
        mockItems.push({ id: `folder-${i}`, name: `Folder ${i + 1}`, type: "folder", path: `${currentPath}${currentPath.endsWith("/") ? "" : "/"}Folder ${i + 1}/` });
      }
      
      const fileTypes = [
        { ext: "jpg", mime: "image/jpeg" }, { ext: "png", mime: "image/png" },
        { ext: "pdf", mime: "application/pdf" }, { ext: "txt", mime: "text/plain" },
        { ext: "json", mime: "application/json" }
      ];
      const fileCount = Math.floor(Math.random() * 10) + 5;
      for (let i = 0; i < fileCount; i++) {
        const fileType = fileTypes[Math.floor(Math.random() * fileTypes.length)];
        const fileName = `file-${i + 1}.${fileType.ext}`;
        const fileSize = Math.floor(Math.random() * 10 * 1024 * 1024);
        mockItems.push({
          id: `file-${i}`, name: fileName, type: "file", size: fileSize,
          lastModified: new Date(Date.now() - Math.floor(Math.random() * 30) * 86400000),
          mimeType: fileType.mime, url: `https://example.com/storage/${currentBucket}${currentPath}${fileName}`,
          path: `${currentPath}${currentPath.endsWith("/") ? "" : "/"}${fileName}`
        });
      }
      setItems(mockItems);
      setIsLoading(false);
    }, 800);
  }, [currentBucket, currentPath]);

  const handleSelectBucket = (bucketId: string) => { setCurrentBucket(bucketId); setCurrentPath("/"); };
  const handleNavigate = (item: StorageItem) => { if (item.type === "folder") setCurrentPath(item.path); else setSelectedItem(item); };

  const handleUpload = () => {
    setUploadProgress(0);
    setShowUploadDialog(true);
    const interval = setInterval(() => {
      setUploadProgress(prev => {
        const newProgress = prev + Math.floor(Math.random() * 20);
        if (newProgress >= 100) {
          clearInterval(interval);
          setTimeout(() => { setShowUploadDialog(false); toast.success("File uploaded successfully"); handleRefresh(); }, 500);
          return 100;
        }
        return newProgress;
      });
    }, 300);
  };

  const handleDownloadFile = (item: StorageItem) => { // Renamed to avoid conflict with lucide-react Download
    if (typeof window === 'undefined') return;
    toast.success(`Downloading ${item.name}...`);
    // Actual download logic would go here
  };

  const handleDelete = (item: StorageItem) => { toast.success(`Deleted ${item.name}`); setItems(prev => prev.filter(i => i.id !== item.id)); };
  const handleRefresh = () => { setIsLoading(true); setTimeout(() => setIsLoading(false), 800); };

  const filteredItems = searchQuery ? items.filter(item => item.name.toLowerCase().includes(searchQuery.toLowerCase())) : items;
    
  const getIconForItem = (item: StorageItem) => {
    if (item.type === "folder") return item.name === ".." ? <Folder className="h-5 w-5 text-blue-500" /> : <Folder className="h-5 w-5 text-yellow-500" />;
    if (item.mimeType?.startsWith("image/")) return <FileImage className="h-5 w-5 text-green-500" />;
    if (item.mimeType?.includes("json")) return <FileJson className="h-5 w-5 text-purple-500" />;
    if (item.mimeType?.includes("text")) return <FileText className="h-5 w-5 text-blue-500" />;
    return <File className="h-5 w-5 text-gray-500" />;
  };

  return (
    <div className="container py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Storage Explorer</h1>
        {currentBucket && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleRefresh} disabled={isLoading}><RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />Refresh</Button>
            <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
              <DialogTrigger asChild><Button onClick={() => setUploadProgress(0)}><Upload className="h-4 w-4 mr-2" />Upload</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Upload File</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div className="border-2 border-dashed rounded-lg p-8 text-center">
                    <Upload className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground mb-2">Drag and drop your files here or click to browse</p>
                    <Input type="file" className="hidden" id="file-upload" />
                    <Button onClick={handleUpload}>Select Files</Button>
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
                              <Button variant="ghost" size="icon" onClick={() => handleDownloadFile(item)}><Download className="h-4 w-4" /></Button>
                              <Button variant="ghost" size="icon" onClick={() => handleDelete(item)}><Trash className="h-4 w-4 text-destructive" /></Button>
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
            <Button onClick={() => handleDownloadFile(selectedItem)}><Download className="h-4 w-4 mr-2" />Download</Button>
          </CardFooter>
        </Card>
      )}
    </div>
  );
};

export default StorageExplorerPage;