import React, { useState, useEffect } from 'react';
import { useAppSelector } from '@/store/hooks';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
  Users, 
  Plus, 
  Search, 
  MoreHorizontal, 
  Shield, 
  User, 
  Eye, 
  Trash2,
  Mail,
  Loader2,
  CheckCircle
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface Member {
  id: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    fullName: string;
    avatar: string | null;
  };
  role: 'admin' | 'member' | 'viewer';
  isActive: boolean;
  assignedAt: string;
  lastActiveAt?: string;
}

const OrganizationMembers = () => {
  const { currentOrg } = useAppSelector((state) => state.org);
  const currentUser = useAppSelector((state) => state.auth.user);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'member' | 'viewer'>('member');
  const [inviting, setInviting] = useState(false);
  const [processingMemberId, setProcessingMemberId] = useState<string | null>(null);

  const fetchMembers = async (page = 1) => {
    if (!currentOrg?.id) return;

    setLoading(true);
    try {
      const result = await Parse.Cloud.run('getOrganizationMembers', {
        organizationId: currentOrg.id,
        page,
        limit: 10
      });

      if (result.success) {
        setMembers(result.members);
        setTotalPages(result.totalPages);
        setCurrentPage(page);
      }
    } catch (error) {
      console.error('Error fetching members:', error);
      toast.error('Failed to load organization members');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, [currentOrg?.id]);

  const handleInvite = async () => {
    if (!currentOrg?.id || !inviteEmail) return;

    setInviting(true);
    try {
      const result = await Parse.Cloud.run('inviteUserToOrganization', {
        organizationId: currentOrg.id,
        email: inviteEmail,
        role: inviteRole
      });

      if (result.success) {
        toast.success(result.message);
        setShowInviteDialog(false);
        setInviteEmail('');
        setInviteRole('member');
        fetchMembers(currentPage);
      }
    } catch (error) {
      console.error('Error inviting user:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to invite user');
    } finally {
      setInviting(false);
    }
  };

  const handleRoleChange = async (memberId: string, userId: string, newRole: 'admin' | 'member' | 'viewer') => {
    if (!currentOrg?.id) return;

    setProcessingMemberId(memberId);
    try {
      const result = await Parse.Cloud.run('updateOrganizationMemberRole', {
        organizationId: currentOrg.id,
        userId,
        newRole
      });

      if (result.success) {
        toast.success(result.message);
        fetchMembers(currentPage);
      }
    } catch (error) {
      console.error('Error updating role:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update member role');
    } finally {
      setProcessingMemberId(null);
    }
  };

  const handleRemoveMember = async (memberId: string, userId: string) => {
    if (!currentOrg?.id) return;

    if (!confirm('Are you sure you want to remove this member from the organization?')) {
      return;
    }

    setProcessingMemberId(memberId);
    try {
      const result = await Parse.Cloud.run('removeOrganizationMember', {
        organizationId: currentOrg.id,
        userId
      });

      if (result.success) {
        toast.success(result.message);
        fetchMembers(currentPage);
      }
    } catch (error) {
      console.error('Error removing member:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to remove member');
    } finally {
      setProcessingMemberId(null);
    }
  };

  const getRoleBadge = (role: string) => {
    const roleConfig = {
      admin: { icon: Shield, label: 'Admin', variant: 'default' as const },
      member: { icon: User, label: 'Member', variant: 'secondary' as const },
      viewer: { icon: Eye, label: 'Viewer', variant: 'outline' as const }
    };

    const config = roleConfig[role as keyof typeof roleConfig] || roleConfig.member;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const filteredMembers = members.filter(member =>
    member.user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.user.fullName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!currentOrg) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Organization Members</CardTitle>
          <CardDescription>No organization selected</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Please select an organization to manage its members.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Organization Members</CardTitle>
              <CardDescription>Manage users and their roles in your organization</CardDescription>
            </div>
            <Button onClick={() => setShowInviteDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Invite Member
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search members..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Member</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead>Last Active</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMembers.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            {member.user.avatar && <AvatarImage src={member.user.avatar} />}
                            <AvatarFallback>
                              {member.user.fullName.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">{member.user.fullName}</div>
                            <div className="text-sm text-muted-foreground">{member.user.email}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{getRoleBadge(member.role)}</TableCell>
                      <TableCell>
                        {member.isActive ? (
                          <Badge variant="outline" className="text-green-600 border-green-600">
                            <CheckCircle className="mr-1 h-3 w-3" />
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground">
                            Inactive
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {new Date(member.assignedAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {member.lastActiveAt ? 
                          new Date(member.lastActiveAt).toLocaleDateString() : 
                          'Never'
                        }
                      </TableCell>
                      <TableCell className="text-right">
                        {processingMemberId === member.id ? (
                          <Loader2 className="h-4 w-4 animate-spin ml-auto" />
                        ) : (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem 
                                onClick={() => handleRoleChange(member.id, member.user.id, 'admin')}
                                disabled={member.role === 'admin'}
                              >
                                <Shield className="mr-2 h-4 w-4" />
                                Make Admin
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => handleRoleChange(member.id, member.user.id, 'member')}
                                disabled={member.role === 'member'}
                              >
                                <User className="mr-2 h-4 w-4" />
                                Make Member
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => handleRoleChange(member.id, member.user.id, 'viewer')}
                                disabled={member.role === 'viewer'}
                              >
                                <Eye className="mr-2 h-4 w-4" />
                                Make Viewer
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => handleRemoveMember(member.id, member.user.id)}
                                className="text-destructive"
                                disabled={member.user.id === currentUser?.id}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Remove Member
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
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
                    onClick={() => fetchMembers(currentPage - 1)}
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
                    onClick={() => fetchMembers(currentPage + 1)}
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

      {/* Invite Member Dialog */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite Member</DialogTitle>
            <DialogDescription>
              Invite a new member to your organization. They will receive an email with instructions.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="member@example.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="role">Role</Label>
              <Select value={inviteRole} onValueChange={(value) => setInviteRole(value as 'admin' | 'member' | 'viewer')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="member">Member</SelectItem>
                  <SelectItem value="viewer">Viewer</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInviteDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleInvite} disabled={!inviteEmail || inviting}>
              {inviting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Inviting...
                </>
              ) : (
                <>
                  <Mail className="mr-2 h-4 w-4" />
                  Send Invite
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OrganizationMembers;