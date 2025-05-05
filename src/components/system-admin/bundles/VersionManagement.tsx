
import React, { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Download, Trash2, MoreHorizontal, Check, X } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

interface Bundle {
  id: string;
  type: string;
  version: string;
  description: string;
  createdAt: string;
  isActive: boolean;
  fileSize: string;
}

export const VersionManagement = () => {
  const [bundles, setBundles] = useState<Bundle[]>([
    {
      id: "bundle-1",
      type: "standard",
      version: "1.2.0",
      description: "Standard app bundle with basic features",
      createdAt: "2023-05-20",
      isActive: true,
      fileSize: "15.4 MB"
    },
    {
      id: "bundle-2",
      type: "professional",
      version: "1.1.5",
      description: "Professional app bundle with advanced analytics",
      createdAt: "2023-05-12",
      isActive: true,
      fileSize: "22.8 MB"
    },
    {
      id: "bundle-3",
      type: "enterprise",
      version: "1.0.8",
      description: "Enterprise bundle with multi-chain support",
      createdAt: "2023-04-28",
      isActive: false,
      fileSize: "34.2 MB"
    }
  ]);
  
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [bundleToDelete, setBundleToDelete] = useState<Bundle | null>(null);
  
  const handleDeleteRequest = (bundle: Bundle) => {
    setBundleToDelete(bundle);
    setShowDeleteDialog(true);
  };
  
  const handleDownload = (bundleId: string) => {
    toast.success(`Bundle ${bundleId} download started`);
  };
  
  const handleToggleActive = (bundleId: string) => {
    setBundles(bundles.map(bundle => {
      if (bundle.id === bundleId) {
        const newStatus = !bundle.isActive;
        toast.success(`Bundle ${bundle.version} ${newStatus ? "activated" : "deactivated"}`);
        return { ...bundle, isActive: newStatus };
      }
      return bundle;
    }));
  };
  
  const confirmDelete = () => {
    if (bundleToDelete) {
      setBundles(bundles.filter(bundle => bundle.id !== bundleToDelete.id));
      toast.success(`Bundle ${bundleToDelete.version} deleted successfully`);
      setShowDeleteDialog(false);
      setBundleToDelete(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-gray-50 p-4 rounded-md">
        <p className="text-sm text-gray-600">
          Manage your uploaded app bundles. Active bundles can be used for deployments.
        </p>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Bundle Type</TableHead>
            <TableHead>Version</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Size</TableHead>
            <TableHead>Uploaded</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-[100px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {bundles.map(bundle => (
            <TableRow key={bundle.id}>
              <TableCell>
                <Badge variant={bundle.type === "enterprise" ? "destructive" : bundle.type === "professional" ? "default" : "secondary"}>
                  {bundle.type.charAt(0).toUpperCase() + bundle.type.slice(1)}
                </Badge>
              </TableCell>
              <TableCell className="font-medium">{bundle.version}</TableCell>
              <TableCell>{bundle.description}</TableCell>
              <TableCell>{bundle.fileSize}</TableCell>
              <TableCell>{bundle.createdAt}</TableCell>
              <TableCell>
                <Badge variant={bundle.isActive ? "success" : "outline"}>
                  {bundle.isActive ? "Active" : "Inactive"}
                </Badge>
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleDownload(bundle.id)}>
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleToggleActive(bundle.id)}>
                      {bundle.isActive ? (
                        <>
                          <X className="h-4 w-4 mr-2" />
                          Deactivate
                        </>
                      ) : (
                        <>
                          <Check className="h-4 w-4 mr-2" />
                          Activate
                        </>
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      className="text-destructive"
                      onClick={() => handleDeleteRequest(bundle)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Bundle</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the {bundleToDelete?.type} bundle version {bundleToDelete?.version}?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Bundle
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
