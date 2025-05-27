import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import Parse from 'parse';
import { 
  UserPlus, 
  Search, 
  Filter,
  Check,
  X,
  MoreVertical,
  Eye,
  Clock,
  Calendar,
  User,
  Building,
  Mail,
  Phone,
  MapPin,
  Loader2,
  AlertCircle,
  CheckCircle,
  XCircle,
  FileText
} from 'lucide-react';

interface SignupRequest {
  id: string;
  email: string;
  organizationName: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  companySize?: string;
  industry?: string;
  useCase?: string;
  status: 'pending' | 'approved' | 'rejected' | 'waitlisted';
  approvedBy?: {
    id: string;
    email: string;
  };
  createdOrganization?: {
    id: string;
    name: string;
  };
  approvedAt?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  referralSource?: string;
  ipAddress?: string;
  geoLocation?: {
    country?: string;
    region?: string;
    city?: string;
  };
  createdAt: string;
}

const SignupManagement = () => {
  const [requests, setRequests] = useState<SignupRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedRequest, setSelectedRequest] = useState<SignupRequest | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [processing, setProcessing] = useState(false);

  const statuses = [
    { value: 'pending', label: 'Pending', icon: Clock, variant: 'secondary' as const },
    { value: 'approved', label: 'Approved', icon: CheckCircle, variant: 'default' as const },
    { value: 'rejected', label: 'Rejected', icon: XCircle, variant: 'destructive' as const },
    { value: 'waitlisted', label: 'Waitlisted', icon: Clock, variant: 'outline' as const }
  ];

  const companySizes = [
    { value: 'solo', label: 'Solo/Individual' },
    { value: 'small', label: 'Small (2-10)' },
    { value: 'medium', label: 'Medium (11-50)' },
    { value: 'large', label: 'Large (51-200)' },
    { value: 'enterprise', label: 'Enterprise (200+)' }
  ];

  const fetchRequests = async (page = 1) => {
    setLoading(true);
    try {
      const params: { page: number; limit: number; status?: string; searchQuery?: string } = {
        page,
        limit: 20
      };

      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }

      if (searchQuery) {
        params.searchQuery = searchQuery;
      }

      const result = await Parse.Cloud.run('getSignupRequests', params);

      if (result.success) {
        setRequests(result.requests);
        setTotalPages(result.totalPages);
        setCurrentPage(page);
      }
    } catch (error) {
      console.error('Error fetching signup requests:', error);
      toast.error('Failed to load signup requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [statusFilter]);

  const handleSearch = () => {
    fetchRequests(1);
  };

  const handleApprove = async (request: SignupRequest) => {
    if (!confirm(`Approve signup request from ${request.email}?`)) {
      return;
    }

    setProcessing(true);
    try {
      const result = await Parse.Cloud.run('approveSignupRequest', {
        requestId: request.id,
        planType: 'starter'
      });

      if (result.success) {
        toast.success(result.message);
        fetchRequests(currentPage);
        setShowDetailsDialog(false);
      }
    } catch (error) {
      console.error('Error approving request:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to approve request');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedRequest || !rejectionReason) {
      toast.error('Please provide a rejection reason');
      return;
    }

    setProcessing(true);
    try {
      const result = await Parse.Cloud.run('rejectSignupRequest', {
        requestId: selectedRequest.id,
        reason: rejectionReason
      });

      if (result.success) {
        toast.success(result.message);
        fetchRequests(currentPage);
        setShowRejectDialog(false);
        setShowDetailsDialog(false);
        setRejectionReason('');
      }
    } catch (error) {
      console.error('Error rejecting request:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to reject request');
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const config = statuses.find(s => s.value === status) || statuses[0];
    const Icon = config.icon;
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const getCompanySizeLabel = (size?: string) => {
    const config = companySizes.find(s => s.value === size);
    return config?.label || size || 'Unknown';
  };

  const filteredRequests = requests; // Already filtered server-side

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Signup Management</h2>
          <p className="text-muted-foreground">Review and approve platform signup requests</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by email, name, or organization..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="pl-8"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {statuses.map(status => (
                  <SelectItem key={status.value} value={status.value}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={handleSearch} variant="outline">
              <Search className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Applicant</TableHead>
                    <TableHead>Organization</TableHead>
                    <TableHead>Company Size</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRequests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{request.firstName} {request.lastName}</div>
                          <div className="text-sm text-muted-foreground">{request.email}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{request.organizationName}</div>
                          {request.industry && (
                            <div className="text-sm text-muted-foreground">{request.industry}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{getCompanySizeLabel(request.companySize)}</TableCell>
                      <TableCell>{getStatusBadge(request.status)}</TableCell>
                      <TableCell>
                        {new Date(request.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => {
                              setSelectedRequest(request);
                              setShowDetailsDialog(true);
                            }}>
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                            {request.status === 'pending' && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => handleApprove(request)}>
                                  <Check className="mr-2 h-4 w-4" />
                                  Approve
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => {
                                    setSelectedRequest(request);
                                    setShowRejectDialog(true);
                                  }}
                                  className="text-destructive"
                                >
                                  <X className="mr-2 h-4 w-4" />
                                  Reject
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchRequests(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchRequests(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Signup Request Details</DialogTitle>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Name</Label>
                  <p className="font-medium">{selectedRequest.firstName} {selectedRequest.lastName}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Email</Label>
                  <p className="font-medium">{selectedRequest.email}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Organization</Label>
                  <p className="font-medium">{selectedRequest.organizationName}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Phone</Label>
                  <p className="font-medium">{selectedRequest.phoneNumber || 'Not provided'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Company Size</Label>
                  <p className="font-medium">{getCompanySizeLabel(selectedRequest.companySize)}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Industry</Label>
                  <p className="font-medium">{selectedRequest.industry || 'Not specified'}</p>
                </div>
              </div>

              {selectedRequest.useCase && (
                <div>
                  <Label className="text-muted-foreground">Use Case</Label>
                  <p className="mt-1 p-3 bg-muted rounded-lg">{selectedRequest.useCase}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Status</Label>
                  <div className="mt-1">{getStatusBadge(selectedRequest.status)}</div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Submitted</Label>
                  <p className="font-medium">
                    {new Date(selectedRequest.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>

              {selectedRequest.referralSource && (
                <div>
                  <Label className="text-muted-foreground">Referral Source</Label>
                  <p className="font-medium">{selectedRequest.referralSource}</p>
                </div>
              )}

              {selectedRequest.geoLocation && (
                <div>
                  <Label className="text-muted-foreground">Location</Label>
                  <p className="font-medium">
                    {[
                      selectedRequest.geoLocation.city,
                      selectedRequest.geoLocation.region,
                      selectedRequest.geoLocation.country
                    ].filter(Boolean).join(', ')}
                  </p>
                </div>
              )}

              {selectedRequest.status === 'approved' && selectedRequest.createdOrganization && (
                <div className="border-t pt-4">
                  <Label className="text-muted-foreground">Created Organization</Label>
                  <p className="font-medium">{selectedRequest.createdOrganization.name}</p>
                  <p className="text-sm text-muted-foreground">
                    Approved by {selectedRequest.approvedBy?.email} on{' '}
                    {selectedRequest.approvedAt && new Date(selectedRequest.approvedAt).toLocaleString()}
                  </p>
                </div>
              )}

              {selectedRequest.status === 'rejected' && selectedRequest.rejectionReason && (
                <div className="border-t pt-4">
                  <Label className="text-muted-foreground">Rejection Reason</Label>
                  <p className="mt-1 p-3 bg-destructive/10 text-destructive rounded-lg">
                    {selectedRequest.rejectionReason}
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Rejected on {selectedRequest.rejectedAt && new Date(selectedRequest.rejectedAt).toLocaleString()}
                  </p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            {selectedRequest?.status === 'pending' && (
              <>
                <Button
                  variant="destructive"
                  onClick={() => {
                    setShowRejectDialog(true);
                  }}
                >
                  Reject
                </Button>
                <Button onClick={() => handleApprove(selectedRequest)}>
                  Approve
                </Button>
              </>
            )}
            <Button variant="outline" onClick={() => setShowDetailsDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Signup Request</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this signup request.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="reason">Rejection Reason</Label>
              <Textarea
                id="reason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Enter the reason for rejection..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowRejectDialog(false);
              setRejectionReason('');
            }}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleReject}
              disabled={!rejectionReason || processing}
            >
              {processing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Rejecting...
                </>
              ) : (
                'Reject Request'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SignupManagement;