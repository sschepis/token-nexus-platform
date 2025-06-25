import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Plus, 
  Search, 
  Filter,
  MoreVertical,
  User,
  Users,
  Calendar,
  Loader2,
  Mail,
  Phone,
  Edit,
  Eye,
  TrendingUp,
  CreditCard,
  Trash2,
  Archive,
  RefreshCw,
  GitBranch,
  UserPlus,
  ArrowRight
} from 'lucide-react';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChildOrg } from './types';
import { Badge } from '@/components/ui/badge';

// Utility functions for badges
function getStatusBadge(status: string) {
  const statusConfig = {
    active: { variant: 'default' as const, label: 'Active' },
    suspended: { variant: 'destructive' as const, label: 'Suspended' },
    archived: { variant: 'secondary' as const, label: 'Archived' },
    pending: { variant: 'outline' as const, label: 'Pending' }
  };

  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

function getPlanBadge(planType: string) {
  const planConfig = {
    starter: { variant: 'outline' as const, label: 'Starter' },
    professional: { variant: 'default' as const, label: 'Professional' },
    enterprise: { variant: 'secondary' as const, label: 'Enterprise' }
  };

  const config = planConfig[planType as keyof typeof planConfig] || planConfig.starter;
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

interface ChildOrgsListProps {
  childOrgs: ChildOrg[];
  loading: boolean;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  statusFilter: string;
  onStatusFilterChange: (status: string) => void;
  onSearch: () => void;
  onCreateChild: () => void;
  onViewOrg: (org: ChildOrg) => void;
  onEditOrg: (org: ChildOrg) => void;
  onLifecycleAction: (org: ChildOrg, action: string) => void;
  onTransferOwnership: (org: ChildOrg) => void;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function ChildOrgsList({
  childOrgs,
  loading,
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  onSearch,
  onCreateChild,
  onViewOrg,
  onEditOrg,
  onLifecycleAction,
  onTransferOwnership,
  currentPage,
  totalPages,
  onPageChange
}: ChildOrgsListProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <CardTitle>Child Organizations</CardTitle>
            <CardDescription>Manage organizations under the parent organization</CardDescription>
          </div>
          <Button onClick={onCreateChild}>
            <Plus className="mr-2 h-4 w-4" />
            Create Child Organization
          </Button>
        </div>
        <div className="flex flex-col sm:flex-row gap-4 mt-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search organizations..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && onSearch()}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={onStatusFilterChange}>
            <SelectTrigger className="w-[180px]">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="suspended">Suspended</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            {childOrgs.map((org) => (
              <div
                key={org.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-3">
                    <h3 className="font-medium">{org.name}</h3>
                    {getStatusBadge(org.status)}
                    {getPlanBadge(org.planType)}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      {org.contactEmail}
                    </span>
                    {org.contactPhone && (
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {org.contactPhone}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {org.stats.userCount} users
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(org.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  {org.owner && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <User className="h-3 w-3" />
                      Owner: {org.owner.firstName} {org.owner.lastName} ({org.owner.email})
                    </div>
                  )}
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onViewOrg(org)}>
                      <Eye className="mr-2 h-4 w-4" />
                      View Details
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onEditOrg(org)}>
                      <Edit className="mr-2 h-4 w-4" />
                      Edit Organization
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    {org.status !== 'archived' && (
                      <DropdownMenuItem onClick={() => onLifecycleAction(org, 'suspend')}>
                        <Archive className="mr-2 h-4 w-4" />
                        {org.status === 'suspended' ? 'Reactivate' : 'Suspend'}
                      </DropdownMenuItem>
                    )}
                    {org.status === 'archived' && (
                      <DropdownMenuItem onClick={() => onLifecycleAction(org, 'reactivate')}>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Reactivate
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={() => onTransferOwnership(org)}>
                      <UserPlus className="mr-2 h-4 w-4" />
                      Transfer Ownership
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => onLifecycleAction(org, 'archive')}>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Archive
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}
            
            {childOrgs.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No child organizations found
              </div>
            )}
            
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPageChange(currentPage - 1)}
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
                  onClick={() => onPageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}