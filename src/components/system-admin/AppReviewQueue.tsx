import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { toast } from 'sonner';
import {
  Clock,
  User,
  Calendar,
  AlertCircle,
  Loader2,
  Check,
  X,
  Eye,
  FileText,
  Package,
  Download,
  Code,
  Shield,
  Globe
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface AppVersionForMarketplace {
  id: string;
  objectId: string;
  versionString: string;
  bundleUrl?: string;
  changelog?: string;
  releaseNotes?: string;
  status: string;
  appDefinition: {
    objectId: string;
    __type: string;
    className: string;
  };
  submittedBy?: {
    objectId: string;
    username: string;
    email: string;
  };
  reviewedBy?: {
    objectId: string;
    username: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
  minPlatformVersion?: string;
  dependencies?: string[];
  publishedTimestamp?: string;
  reviewTimestamp?: string;
}

interface AppReviewQueueProps {
  pendingVersions: AppVersionForMarketplace[];
  onApprove: (versionId: string) => Promise<void>;
  onReject: (versionId: string, reason: string) => Promise<void>;
  onPublish: (versionId: string) => Promise<void>;
  getStatusBadge: (status: string) => React.ReactNode;
  formatDate: (dateString: string) => string;
}

export function AppReviewQueue({
  pendingVersions,
  onApprove,
  onReject,
  onPublish,
  getStatusBadge,
  formatDate
}: AppReviewQueueProps) {
  const [selectedVersion, setSelectedVersion] = useState<AppVersionForMarketplace | null>(null);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [reviewComments, setReviewComments] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject' | null>(null);

  const handleReviewAction = async () => {
    if (!selectedVersion || !reviewAction) return;

    setIsProcessing(true);
    try {
      if (reviewAction === 'approve') {
        await onApprove(selectedVersion.id);
      } else if (reviewAction === 'reject' && rejectionReason) {
        await onReject(selectedVersion.id, rejectionReason);
      }
      
      setIsReviewOpen(false);
      setSelectedVersion(null);
      setReviewComments('');
      setRejectionReason('');
      setReviewAction(null);
    } catch (error) {
      console.error('Review action failed:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const openReviewDialog = (version: AppVersionForMarketplace, action: 'approve' | 'reject') => {
    setSelectedVersion(version);
    setReviewAction(action);
    setIsReviewOpen(true);
  };

  const openDetailDialog = (version: AppVersionForMarketplace) => {
    setSelectedVersion(version);
    setIsDetailOpen(true);
  };

  if (pendingVersions.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Clock className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Pending Reviews</h3>
          <p className="text-muted-foreground text-center">
            All app versions have been reviewed. New submissions will appear here.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Pending App Reviews</h3>
          <p className="text-sm text-muted-foreground">
            {pendingVersions.length} app version{pendingVersions.length !== 1 ? 's' : ''} awaiting review
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {pendingVersions.map((version) => (
          <Card key={version.id} className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1 space-y-3">
                <div className="flex items-center gap-3">
                  <Package className="h-5 w-5 text-blue-600" />
                  <div>
                    <h4 className="font-semibold">App Version {version.versionString}</h4>
                    <p className="text-sm text-muted-foreground">
                      App Definition ID: {version.appDefinition.objectId}
                    </p>
                  </div>
                  {getStatusBadge(version.status)}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span>Submitted by: {version.submittedBy?.username || 'Unknown'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>Submitted: {formatDate(version.createdAt)}</span>
                  </div>
                  {version.minPlatformVersion && (
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-muted-foreground" />
                      <span>Min Platform: {version.minPlatformVersion}</span>
                    </div>
                  )}
                  {version.bundleUrl && (
                    <div className="flex items-center gap-2">
                      <Download className="h-4 w-4 text-muted-foreground" />
                      <span>Bundle Available</span>
                    </div>
                  )}
                </div>

                {version.changelog && (
                  <div className="p-3 bg-muted rounded-lg">
                    <h5 className="font-medium text-sm mb-1">Changelog:</h5>
                    <p className="text-sm text-muted-foreground">{version.changelog}</p>
                  </div>
                )}

                {version.releaseNotes && (
                  <div className="p-3 bg-muted rounded-lg">
                    <h5 className="font-medium text-sm mb-1">Release Notes:</h5>
                    <p className="text-sm text-muted-foreground">{version.releaseNotes}</p>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-2 ml-4">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => openDetailDialog(version)}
                >
                  <Eye className="h-4 w-4 mr-1" />
                  Details
                </Button>
                <Button
                  size="sm"
                  variant="default"
                  onClick={() => openReviewDialog(version, 'approve')}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Check className="h-4 w-4 mr-1" />
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => openReviewDialog(version, 'reject')}
                >
                  <X className="h-4 w-4 mr-1" />
                  Reject
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Review Action Dialog */}
      <Dialog open={isReviewOpen} onOpenChange={setIsReviewOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {reviewAction === 'approve' ? 'Approve' : 'Reject'} App Version
            </DialogTitle>
            <DialogDescription>
              {reviewAction === 'approve' 
                ? 'Approve this app version for publication'
                : 'Reject this app version and provide feedback'
              }
            </DialogDescription>
          </DialogHeader>

          {selectedVersion && (
            <div className="space-y-4">
              <div className="p-4 border rounded-lg bg-muted/50">
                <h4 className="font-semibold">Version {selectedVersion.versionString}</h4>
                <p className="text-sm text-muted-foreground">
                  Submitted by {selectedVersion.submittedBy?.username} on {formatDate(selectedVersion.createdAt)}
                </p>
              </div>

              <div>
                <Label htmlFor="reviewComments">Review Comments</Label>
                <Textarea
                  id="reviewComments"
                  placeholder="Add your review comments..."
                  value={reviewComments}
                  onChange={(e) => setReviewComments(e.target.value)}
                  className="mt-1"
                />
              </div>

              {reviewAction === 'reject' && (
                <div>
                  <Label htmlFor="rejectionReason">Rejection Reason *</Label>
                  <Textarea
                    id="rejectionReason"
                    placeholder="Provide a clear reason for rejection..."
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    className="mt-1"
                    required
                  />
                  <Alert className="mt-2">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Please provide a clear reason for rejection to help the developer improve their submission.
                    </AlertDescription>
                  </Alert>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsReviewOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleReviewAction}
              disabled={isProcessing || (reviewAction === 'reject' && !rejectionReason)}
              variant={reviewAction === 'approve' ? 'default' : 'destructive'}
            >
              {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {reviewAction === 'approve' ? 'Approve Version' : 'Reject Version'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail View Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>App Version Details</DialogTitle>
            <DialogDescription>
              Detailed information about this app version submission
            </DialogDescription>
          </DialogHeader>

          {selectedVersion && (
            <ScrollArea className="h-full max-h-[60vh]">
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Version</Label>
                    <p className="text-sm">{selectedVersion.versionString}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Status</Label>
                    <div className="mt-1">{getStatusBadge(selectedVersion.status)}</div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Submitted By</Label>
                    <p className="text-sm">{selectedVersion.submittedBy?.username} ({selectedVersion.submittedBy?.email})</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Submission Date</Label>
                    <p className="text-sm">{formatDate(selectedVersion.createdAt)}</p>
                  </div>
                </div>

                {selectedVersion.minPlatformVersion && (
                  <div>
                    <Label className="text-sm font-medium">Minimum Platform Version</Label>
                    <p className="text-sm">{selectedVersion.minPlatformVersion}</p>
                  </div>
                )}

                {selectedVersion.dependencies && selectedVersion.dependencies.length > 0 && (
                  <div>
                    <Label className="text-sm font-medium">Dependencies</Label>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {selectedVersion.dependencies.map((dep, index) => (
                        <Badge key={index} variant="outline">{dep}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {selectedVersion.changelog && (
                  <div>
                    <Label className="text-sm font-medium">Changelog</Label>
                    <div className="mt-1 p-3 bg-muted rounded-lg">
                      <p className="text-sm whitespace-pre-wrap">{selectedVersion.changelog}</p>
                    </div>
                  </div>
                )}

                {selectedVersion.releaseNotes && (
                  <div>
                    <Label className="text-sm font-medium">Release Notes</Label>
                    <div className="mt-1 p-3 bg-muted rounded-lg">
                      <p className="text-sm whitespace-pre-wrap">{selectedVersion.releaseNotes}</p>
                    </div>
                  </div>
                )}

                {selectedVersion.bundleUrl && (
                  <div>
                    <Label className="text-sm font-medium">Bundle URL</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Code className="h-4 w-4" />
                      <a 
                        href={selectedVersion.bundleUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline text-sm"
                      >
                        {selectedVersion.bundleUrl}
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDetailOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}