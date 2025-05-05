
import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, FileUp, ChevronUp, Info } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";

export const BundleUpload = () => {
  const [file, setFile] = useState<File | null>(null);
  const [version, setVersion] = useState("");
  const [description, setDescription] = useState("");
  const [bundleType, setBundleType] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!file) {
      toast.error("Please select a bundle file");
      return;
    }
    
    if (!version) {
      toast.error("Please enter a version");
      return;
    }
    
    if (!bundleType) {
      toast.error("Please select a bundle type");
      return;
    }
    
    setIsUploading(true);
    
    // Simulate upload progress
    const interval = setInterval(() => {
      setUploadProgress(prev => {
        const newProgress = prev + 10;
        if (newProgress >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            setIsUploading(false);
            toast.success("Bundle uploaded successfully");
            // Reset form
            setFile(null);
            setVersion("");
            setDescription("");
            setUploadProgress(0);
          }, 500);
          return 100;
        }
        return newProgress;
      });
    }, 500);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Alert variant="default" className="bg-blue-50 text-blue-800 border-blue-200">
        <Info className="h-4 w-4" />
        <AlertDescription>
          App bundles contain the necessary contracts, configurations, and frontend assets for deployment.
        </AlertDescription>
      </Alert>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="bundle-type">Bundle Type</Label>
          <Select value={bundleType} onValueChange={setBundleType}>
            <SelectTrigger id="bundle-type">
              <SelectValue placeholder="Select bundle type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="standard">Standard</SelectItem>
              <SelectItem value="professional">Professional</SelectItem>
              <SelectItem value="enterprise">Enterprise</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="version">Version</Label>
          <Input
            id="version"
            placeholder="e.g., 1.0.0"
            value={version}
            onChange={(e) => setVersion(e.target.value)}
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            placeholder="Enter bundle description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="bundle-file">Upload Bundle File (.zip)</Label>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-center w-full">
                <label htmlFor="bundle-file" className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-md border-gray-300 cursor-pointer hover:bg-gray-50 transition-all">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    {file ? (
                      <>
                        <FileUp className="h-8 w-8 text-green-500 mb-2" />
                        <p className="text-sm text-green-600">{file.name}</p>
                        <p className="text-xs text-muted-foreground">{Math.round(file.size / 1024)} KB</p>
                      </>
                    ) : (
                      <>
                        <Upload className="h-8 w-8 text-gray-400 mb-2" />
                        <p className="text-sm text-gray-600">Click to upload or drag and drop</p>
                        <p className="text-xs text-muted-foreground">ZIP file (max. 100MB)</p>
                      </>
                    )}
                  </div>
                  <Input id="bundle-file" type="file" accept=".zip" className="hidden" onChange={handleFileChange} />
                </label>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      
      {isUploading && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Uploading...</span>
            <span>{uploadProgress}%</span>
          </div>
          <Progress value={uploadProgress} className="h-2" />
        </div>
      )}
      
      <div className="flex justify-end">
        <Button type="submit" disabled={isUploading}>
          {isUploading ? (
            "Uploading..."
          ) : (
            <>
              <ChevronUp className="mr-2 h-4 w-4" /> Upload Bundle
            </>
          )}
        </Button>
      </div>
    </form>
  );
};
