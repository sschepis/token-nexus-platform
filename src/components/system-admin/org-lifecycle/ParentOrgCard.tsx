import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Crown, ShieldCheck, Mail, Building2 } from 'lucide-react';
import { ParentOrg } from './types';

interface ParentOrgCardProps {
  parentOrg: ParentOrg;
}

export function ParentOrgCard({ parentOrg }: ParentOrgCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-yellow-500" />
            <CardTitle>Parent Organization</CardTitle>
          </div>
          <Badge variant="outline" className="flex items-center gap-1">
            <ShieldCheck className="h-3 w-3" />
            Parent Org
          </Badge>
        </div>
        <CardDescription>{parentOrg.name}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Mail className="h-3 w-3" />
            {parentOrg.contactEmail}
          </span>
          {parentOrg.settings?.maxChildOrgs && parentOrg.settings.maxChildOrgs > 0 && (
            <span className="flex items-center gap-1">
              <Building2 className="h-3 w-3" />
              Max Child Orgs: {parentOrg.settings.maxChildOrgs}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}