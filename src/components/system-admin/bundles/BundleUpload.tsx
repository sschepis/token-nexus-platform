/* eslint-disable @typescript-eslint/no-explicit-any */

import Parse from 'parse';
import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, FileUp, ChevronUp, Info } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/hooks/use-toast";

export const BundleUpload = () => {
  const [file, setFile] = useState<File | null>(null);
  const [appDefinitions, setAppDefinitions] = useState<{ id: string, name: string }[]>([]);
  const [selectedAppDefinitionId, setSelectedAppDefinitionId] = useState("");
  const [versionString, setVersionString] = useState(""); // Renamed from version
  const [changelog, setChangelog] = useState(""); // New state
  // description can be used for releaseNotes or a separate field
  const [releaseNotes, setReleaseNotes] = useState(""); // Using description for this
  const [minPlatformVersion, setMinPlatformVersion] = useState(""); // New state
  const [dependenciesString, setDependenciesString] = useState(""); // New state for JSON string
  // bundleType is not directly part of AppVersion schema, but could be metadata for AppDefinition
  
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => {
    // Fetch AppDefinitions to populate a selector
    const fetchDefs = async () => {
      try {
        const defs = await Parse.Cloud.run('listAppsForAdmin', {});
        setAppDefinitions(defs.map((d: any) => ({ id: d.objectId, name: d.name })));
      } catch (error) {
        console.error("Failed to fetch app definitions for upload form", error);
        toast({
          title: "Error",
          description: "Failed to load app definitions for selection.",
          variant: "destructive",
        });
      }
    };
    fetchDefs();
  }, []);
  
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!file) {
      toast({
        title: "Error",
        description: "Please select a bundle file.",
        variant: "destructive",
      });
      return;
    }
    if (!selectedAppDefinitionId) {
      toast({
        title: "Error",
        description: "Please select an Application Definition.",
        variant: "destructive",
      });
      return;
    }
    if (!versionString) {
      toast({
        title: "Error",
        description: "Please enter a version string (e.g., 1.0.0).",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // 1. Upload the file to Parse Server
      const parseFile = new Parse.File(file.name, file);
      await parseFile.save({
        progress: (value) => {
          setUploadProgress(Math.round(value * 100));
        }
      });
      const bundleUrl = parseFile.url();

      // 2. Parse dependencies string if provided
      let dependencies = {};
      if (dependenciesString) {
        try {
          dependencies = JSON.parse(dependenciesString);
        } catch (jsonError) {
          toast({
            title: "Error",
            description: "Invalid JSON format for dependencies.",
            variant: "destructive",
          });
          setIsUploading(false);
          return;
        }
      }

      // 3. Call the cloud function
      const params = {
        appDefinitionId: selectedAppDefinitionId,
        versionString,
        bundleUrl,
        changelog,
        releaseNotes, // Using description state for this
        minPlatformVersion,
        dependencies,
      };

      await Parse.Cloud.run('submitAppForReview', params);
      
      toast({
        title: "Success",
        description: `Version ${versionString} submitted for review successfully!`,
      });
      // Reset form
      setFile(null);
      setSelectedAppDefinitionId("");
      setVersionString("");
      setChangelog("");
      setReleaseNotes("");
      setMinPlatformVersion("");
      setDependenciesString("");
      setUploadProgress(0);

    } catch (error: any) {
      console.error("Failed to submit app for review:", error);
      toast({
        title: "Error",
        description: `Submission failed: ${error.message || "Unknown error"}`,
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Alert variant="default" className="bg-blue-50 text-blue-800 border-blue-200">
        <Info className="h-4 w-4" />
        <AlertDescription>
          Upload a new version of an application for review and publishing to the App Store.
        </AlertDescription>
      </Alert>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="app-definition">Application Definition</Label>
          <Select value={selectedAppDefinitionId} onValueChange={setSelectedAppDefinitionId}>
            <SelectTrigger id="app-definition">
              <SelectValue placeholder="Select an application" />
            </SelectTrigger>
            <SelectContent>
              {appDefinitions.map(def => (
                <SelectItem key={def.id} value={def.id}>{def.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="versionString">Version String</Label>
          <Input
            id="versionString"
            placeholder="e.g., 1.0.0 or 2.1.0-beta.1"
            value={versionString}
            onChange={(e) => setVersionString(e.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="changelog">Changelog (Markdown supported)</Label>
          <Textarea
            id="changelog"
            placeholder="Describe changes in this version..."
            value={changelog}
            onChange={(e) => setChangelog(e.target.value)}
            rows={4}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="releaseNotes">Release Notes (Optional)</Label>
          <Textarea
            id="releaseNotes"
            placeholder="Enter detailed release notes..."
            value={releaseNotes}
            onChange={(e) => setReleaseNotes(e.target.value)}
            rows={3}
          />
        </div>

         <div className="space-y-2">
          <Label htmlFor="minPlatformVersion">Minimum Platform Version (Optional)</Label>
          <Input
            id="minPlatformVersion"
            placeholder="e.g., 1.2.0"
            value={minPlatformVersion}
            onChange={(e) => setMinPlatformVersion(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="dependencies">Dependencies (JSON format, Optional)</Label>
          <Textarea
            id="dependencies"
            placeholder='e.g., { "otherAppSlug": ">=1.2.0" }'
            value={dependenciesString}
            onChange={(e) => setDependenciesString(e.target.value)}
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
