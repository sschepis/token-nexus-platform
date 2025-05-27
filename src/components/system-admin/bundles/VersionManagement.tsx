/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle
} from "@/components/ui/dialog";
import {
    Card, CardContent, CardDescription, CardHeader, CardTitle
} from "@/components/ui/card"; // Added Card imports
import { MoreHorizontal, Check, X, Edit, Eye, Loader2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { AppDefinitionForMarketplace, AppVersionForMarketplace } from "@/types/app-marketplace"; // Use types from central location
import { useAppDispatch } from "@/store/hooks";
import {
    approveAppVersionAdmin,
    rejectAppVersionAdmin,
    publishAppVersionAdmin,
    RejectAppVersionAdminParams
} from "@/store/slices/appSlice";


interface VersionManagementProps {
  appDefinition?: AppDefinitionForMarketplace | null;
  versions?: AppVersionForMarketplace[];
  isLoading?: boolean; // To indicate if versions are being loaded by parent
  // onRefreshVersions: (appDefinitionId: string) => void; // Callback to tell parent to refresh
}

export const VersionManagement: React.FC<VersionManagementProps> = ({
  appDefinition = null,
  versions = [],
  isLoading: isLoadingVersionsProp = false, // Renamed to avoid conflict with local isLoading
  // onRefreshVersions
}) => {
  const dispatch = useAppDispatch();
  const [isSubmittingAction, setIsSubmittingAction] = useState(false); // Local loading for dialog actions
  
  // Dialog states for actions
  const [showActionDialog, setShowActionDialog] = useState(false);
  const [selectedVersionForAction, setSelectedVersionForAction] = useState<AppVersionForMarketplace | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject' | 'publish' | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  
  const openActionDialog = (version: AppVersionForMarketplace, type: 'approve' | 'reject' | 'publish') => {
    setSelectedVersionForAction(version);
    setActionType(type);
    setRejectionReason("");
    setShowActionDialog(true);
  };

  const confirmAction = async () => {
    if (!selectedVersionForAction || !actionType || !appDefinition?.id) return;

    setIsSubmittingAction(true);
    const versionId = selectedVersionForAction.id; // Use 'id' from AppVersionForMarketplace
    let actionPromise;

    try {
      switch (actionType) {
        case 'approve':
          actionPromise = dispatch(approveAppVersionAdmin(versionId)).unwrap();
          break;
        case 'reject': { // Added block scope
          if (!rejectionReason.trim()) {
            toast({
              title: "Error",
              description: "Rejection reason cannot be empty.",
              variant: "destructive",
            });
            setIsSubmittingAction(false);
            return;
          }
          const rejectParams: RejectAppVersionAdminParams = { versionId, reason: rejectionReason };
          actionPromise = dispatch(rejectAppVersionAdmin(rejectParams)).unwrap();
          break;
        }
        case 'publish':
          actionPromise = dispatch(publishAppVersionAdmin(versionId)).unwrap();
          break;
        default:
          setIsSubmittingAction(false);
          return;
      }
      
      await actionPromise;
      // Success toasts are handled by the thunks
      setShowActionDialog(false);
      setSelectedVersionForAction(null);
      // Parent (AppBundles.tsx) will re-fetch versions because thunks dispatch fetchAppVersionsAdmin
      // if (onRefreshVersions && appDefinition?.id) {
      //   onRefreshVersions(appDefinition.id);
      // }

    } catch (error: any) {
      // Error toasts are handled by the thunks
      console.error(`Error performing action ${actionType}:`, error);
    } finally {
      setIsSubmittingAction(false);
    }
  };

  if (!appDefinition) {
    // This component might not be rendered if appDefinition is null by parent,
    // but as a safeguard or if parent logic changes:
    return (
        <Card>
            <CardHeader><CardTitle>Version Management</CardTitle></CardHeader>
            <CardContent><p>No application definition selected.</p></CardContent>
        </Card>
    );
  }

  return (
    <Card className="sticky top-20">
      <CardHeader>
        <CardTitle>Versions for: {appDefinition.name}</CardTitle>
        <CardDescription>Manage submitted versions for this application.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoadingVersionsProp ? (
            <div className="flex items-center justify-center h-32">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                <p className="ml-2">Loading versions...</p>
            </div>
        ) : versions.length === 0 ? (
          <p>No versions found for this application.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Version</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {versions.map(version => (
                <TableRow key={version.id}> {/* Use id from AppVersionForMarketplace */}
                  <TableCell>{version.versionString}</TableCell>
                  <TableCell>
                    <Badge variant={
                      version.status === 'published' ? 'success' :
                      version.status === 'approved' ? 'default' :
                      version.status === 'pending_review' ? 'secondary' :
                      version.status === 'rejected' ? 'destructive' : 'outline'
                    }>
                      {version.status.replace("_", " ")}
                    </Badge>
                  </TableCell>
                  <TableCell>{version.createdAt ? new Date(version.createdAt).toLocaleDateString() : 'N/A'}</TableCell>
                  <TableCell className="text-right">
                    {/* Action buttons based on version status */}
                    {version.status === 'pending_review' && (
                      <>
                        <Button size="sm" variant="outline" className="mr-1" onClick={() => openActionDialog(version, 'approve')}>Approve</Button>
                        <Button size="sm" variant="destructive" onClick={() => openActionDialog(version, 'reject')}>Reject</Button>
                      </>
                    )}
                    {version.status === 'approved' && (
                      <Button size="sm" variant="default" onClick={() => openActionDialog(version, 'publish')}>Publish</Button>
                    )}
                     {version.status === 'rejected' && (
                      <Button size="sm" variant="outline" onClick={() => openActionDialog(version, 'approve')}>Re-Approve</Button>
                    )}
                    {/* TODO: Add View Details / Download Bundle options */}
                     <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="ml-1 w-7 h-7">
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => toast({
                              title: "Info",
                              description: `Viewing details for v${version.versionString}`,
                            })}>
                                <Eye className="mr-2 h-4 w-4" /> View Details
                            </DropdownMenuItem>
                            {/* Add download bundle if bundleUrl exists */}
                        </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <Dialog open={showActionDialog} onOpenChange={setShowActionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === 'approve' && 'Approve App Version'}
              {actionType === 'reject' && 'Reject App Version'}
              {actionType === 'publish' && 'Publish App Version'}
            </DialogTitle>
            <DialogDescription>
              {actionType === 'approve' && `Are you sure you want to approve version ${selectedVersionForAction?.versionString} of ${appDefinition?.name}?`}
              {actionType === 'reject' && `Please provide a reason for rejecting version ${selectedVersionForAction?.versionString} of ${appDefinition?.name}.`}
              {actionType === 'publish' && `Are you sure you want to publish version ${selectedVersionForAction?.versionString} of ${appDefinition?.name}? This will make it available in the marketplace.`}
            </DialogDescription>
          </DialogHeader>
          {actionType === 'reject' && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="rejectionReason" className="text-right">
                  Reason
                </Label>
                <Textarea
                  id="rejectionReason"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="col-span-3"
                  placeholder="Detailed reason for rejection"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowActionDialog(false)}>Cancel</Button>
            <Button
              onClick={confirmAction}
              variant={actionType === 'reject' ? 'destructive' : 'default'}
              disabled={isSubmittingAction}
            >
              {isSubmittingAction ? 'Processing...' :
               actionType === 'approve' ? 'Approve' :
               actionType === 'reject' ? 'Reject Version' : 'Publish'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card> // Added missing closing Card tag
  );
};
