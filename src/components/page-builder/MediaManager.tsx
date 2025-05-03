
import React, { useState, useEffect } from "react";
import { FileUpload } from "@/components/ui/file-upload";
import { StyledCard } from "@/components/ui/styled-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UploadedMedia, usePageBuilderStore } from "@/store/pageBuilderStore";
import ChartPreview from "@/components/ui/chart-preview";
import { Button } from "@/components/ui/button";
import { Image, Trash2, Upload } from "lucide-react";
import { toast } from "@/components/ui/sonner";
import { Card, CardContent } from "@/components/ui/card";
import { UploadedFile } from "@/hooks/useFileUpload";

export default function MediaManager() {
  const { uploadedMedia, addMedia, deleteMedia } = usePageBuilderStore();
  const [usageData, setUsageData] = useState<any[]>([]);
  
  // Create demo data for the chart
  useEffect(() => {
    const mediaTypes = {
      image: 0,
      video: 0,
      document: 0,
      other: 0,
    };
    
    uploadedMedia.forEach((media) => {
      if (media.type.startsWith('image/')) {
        mediaTypes.image += media.size;
      } else if (media.type.startsWith('video/')) {
        mediaTypes.video += media.size;
      } else if (media.type.startsWith('application/pdf') || 
                media.type.startsWith('application/doc')) {
        mediaTypes.document += media.size;
      } else {
        mediaTypes.other += media.size;
      }
    });
    
    const chartData = [
      {
        category: 'Media Storage Usage',
        values: [
          { key: 'Image', value: mediaTypes.image / (1024 * 1024) },
          { key: 'Video', value: mediaTypes.video / (1024 * 1024) },
          { key: 'Document', value: mediaTypes.document / (1024 * 1024) },
          { key: 'Other', value: mediaTypes.other / (1024 * 1024) },
        ],
      },
    ];
    
    setUsageData(chartData);
  }, [uploadedMedia]);
  
  const handleFileUpload = async (files: UploadedFile[]) => {
    try {
      for (const fileData of files) {
        await addMedia(fileData.file);
      }
      toast.success(`${files.length} file(s) uploaded successfully`);
    } catch (error) {
      toast.error('Error uploading files');
      console.error(error);
    }
  };
  
  const handleDeleteMedia = (media: UploadedMedia) => {
    deleteMedia(media.id);
    toast.success(`${media.name} deleted successfully`);
  };
  
  return (
    <Tabs defaultValue="upload" className="w-full">
      <TabsList className="mb-4">
        <TabsTrigger value="upload">Upload Media</TabsTrigger>
        <TabsTrigger value="library">Media Library</TabsTrigger>
        <TabsTrigger value="usage">Storage Usage</TabsTrigger>
      </TabsList>
      
      <TabsContent value="upload" className="space-y-4">
        <StyledCard
          header={
            <div className="flex justify-between items-center w-full">
              <div className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                <h3 className="font-semibold">Upload New Media</h3>
              </div>
            </div>
          }
          headerColor="primary"
        >
          <FileUpload
            onChange={(files) => {
              if (files.length > 0) {
                handleFileUpload(files);
              }
            }}
            maxFiles={10}
            maxSize={10 * 1024 * 1024} // 10MB
          />
        </StyledCard>
      </TabsContent>
      
      <TabsContent value="library">
        <StyledCard
          header={
            <div className="flex justify-between items-center w-full">
              <div className="flex items-center gap-2">
                <Image className="h-5 w-5" />
                <h3 className="font-semibold">Media Library</h3>
              </div>
              <span className="text-sm">{uploadedMedia.length} items</span>
            </div>
          }
          headerColor="secondary"
        >
          {uploadedMedia.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {uploadedMedia.map((media) => (
                <Card key={media.id} className="overflow-hidden group">
                  <div className="aspect-square relative overflow-hidden bg-muted">
                    {media.type.startsWith('image/') ? (
                      <img
                        src={media.url}
                        alt={media.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-muted">
                        <div className="text-muted-foreground">
                          {media.type.split('/')[0]}
                        </div>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Button
                        variant="destructive"
                        size="icon"
                        onClick={() => handleDeleteMedia(media)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <CardContent className="p-2">
                    <p className="text-xs truncate font-medium">{media.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(media.size / 1024).toFixed(1)} KB
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>No media files uploaded yet</p>
              <p className="text-sm">Upload files to see them here</p>
            </div>
          )}
        </StyledCard>
      </TabsContent>
      
      <TabsContent value="usage">
        <StyledCard
          header={
            <div className="flex items-center gap-2">
              <h3 className="font-semibold">Storage Usage</h3>
            </div>
          }
          headerColor="accent"
        >
          {usageData.length > 0 ? (
            <div className="h-[300px] w-full">
              <ChartPreview
                width={800}
                height={300}
                data={usageData}
                keys={['Image', 'Video', 'Document', 'Other']}
              />
              <div className="mt-4 text-center text-sm text-muted-foreground">
                Storage usage in MB
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>No data available</p>
              <p className="text-sm">Upload files to see storage statistics</p>
            </div>
          )}
        </StyledCard>
      </TabsContent>
    </Tabs>
  );
}
