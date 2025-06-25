import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Switch } from '../ui/switch';
import { 
  Shield, 
  Key, 
  Users, 
  Lock, 
  Unlock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Plus,
  Trash2,
  Edit,
  Eye,
  EyeOff
} from 'lucide-react';
import { useAppSelector } from '../../store/hooks';
import { toast } from 'sonner';
import { securityApiWithMocks } from '../../services/api/security';

interface Permission {
  id: string;
  name: string;
  description: string;
  category: string;
  isSystemPermission: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Role {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  isSystemRole: boolean;
  userCount: number;
  createdAt: string;
  updatedAt: string;
}

interface SecurityPolicy {
  id: string;
  name: string;
  description: string;
  type: 'app_isolation' | 'data_access' | 'api_rate_limit' | 'execution_timeout';
  rules: Record<string, any>;
  enabled: boolean;
  priority: number;
  createdAt: string;
  updatedAt: string;
}

interface AppSecurityContext {
  appId: string;
  appName: string;
  permissions: string[];
  roles: string[];
  policies: string[];
  isolationLevel: 'strict' | 'moderate' | 'relaxed';
  dataAccess: {
    ownData: boolean;
    orgData: boolean;
    crossOrgData: boolean;
  };
  apiAccess: {
    internal: boolean;
    external: boolean;
    rateLimit: number;
  };
}

export const AppSecurityFramework: React.FC = () => {
  const { currentOrg } = useAppSelector((state) => state.org);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [policies, setPolicies] = useState<SecurityPolicy[]>([]);
  const [appContexts, setAppContexts] = useState<AppSecurityContext[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('permissions');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);

  // Form states
  const [newPermission, setNewPermission] = useState({
    name: '',
    description: '',
    category: 'app'
  });
  const [newRole, setNewRole] = useState({
    name: '',
    description: '',
    permissions: [] as string[]
  });
  const [newPolicy, setNewPolicy] = useState({
    name: '',
    description: '',
    type: 'app_isolation' as SecurityPolicy['type'],
    rules: {},
    enabled: true,
    priority: 100
  });

  useEffect(() => {
    loadSecurityData();
  }, [currentOrg]);

  const loadSecurityData = async () => {
    if (!currentOrg?.id) return;
    
    try {
      setLoading(true);
      
      const [permissionsResult, rolesResult, policiesResult, contextsResult] = await Promise.all([
        securityApiWithMocks.getAppPermissions({ organizationId: currentOrg.id }),
        securityApiWithMocks.getAppRoles({ organizationId: currentOrg.id }),
        securityApiWithMocks.getSecurityPolicies({ organizationId: currentOrg.id }),
        securityApiWithMocks.getAppSecurityContexts({ organizationId: currentOrg.id })
      ]);

      setPermissions(permissionsResult.success ? permissionsResult.data : []);
      setRoles(rolesResult.success ? rolesResult.data : []);
      setPolicies(policiesResult.success ? policiesResult.data : []);
      setAppContexts(contextsResult.success ? contextsResult.data : []);
    } catch (error) {
      console.error('Failed to load security data:', error);
      toast.error('Failed to load security framework data');
    } finally {
      setLoading(false);
    }
  };

  const createPermission = async () => {
    if (!currentOrg?.id) return;
    
    try {
      const response = await securityApiWithMocks.createAppPermission({
        organizationId: currentOrg.id,
        ...newPermission
      });
      
      if (response.success) {
        toast.success('Permission created successfully');
        setNewPermission({ name: '', description: '', category: 'app' });
        setShowCreateForm(false);
        await loadSecurityData();
      } else {
        toast.error(response.error || 'Failed to create permission');
      }
    } catch (error) {
      console.error('Failed to create permission:', error);
      toast.error('Failed to create permission');
    }
  };

  const createRole = async () => {
    if (!currentOrg?.id) return;
    
    try {
      const response = await securityApiWithMocks.createAppRole({
        organizationId: currentOrg.id,
        ...newRole
      });
      
      if (response.success) {
        toast.success('Role created successfully');
        setNewRole({ name: '', description: '', permissions: [] });
        setShowCreateForm(false);
        await loadSecurityData();
      } else {
        toast.error(response.error || 'Failed to create role');
      }
    } catch (error) {
      console.error('Failed to create role:', error);
      toast.error('Failed to create role');
    }
  };

  const createPolicy = async () => {
    if (!currentOrg?.id) return;
    
    try {
      const response = await securityApiWithMocks.createSecurityPolicy({
        organizationId: currentOrg.id,
        ...newPolicy
      });
      
      if (response.success) {
        toast.success('Security policy created successfully');
        setNewPolicy({
          name: '',
          description: '',
          type: 'app_isolation',
          rules: {},
          enabled: true,
          priority: 100
        });
        setShowCreateForm(false);
        await loadSecurityData();
      } else {
        toast.error(response.error || 'Failed to create security policy');
      }
    } catch (error) {
      console.error('Failed to create policy:', error);
      toast.error('Failed to create security policy');
    }
  };

  const togglePolicy = async (policyId: string, enabled: boolean) => {
    try {
      const response = await securityApiWithMocks.toggleSecurityPolicy({ policyId, enabled });
      
      if (response.success) {
        toast.success(`Policy ${enabled ? 'enabled' : 'disabled'} successfully`);
        await loadSecurityData();
      } else {
        toast.error(response.error || 'Failed to update policy status');
      }
    } catch (error) {
      console.error('Failed to toggle policy:', error);
      toast.error('Failed to update policy status');
    }
  };

  const deleteItem = async (type: string, id: string) => {
    try {
      let response;
      
      switch (type) {
        case 'Permission':
          response = await securityApiWithMocks.deletePermission({ id });
          break;
        case 'Role':
          response = await securityApiWithMocks.deleteRole({ id });
          break;
        case 'SecurityPolicy':
          response = await securityApiWithMocks.deleteSecurityPolicy({ id });
          break;
        case 'SecurityContext':
          response = await securityApiWithMocks.deleteSecurityContext({ id });
          break;
        default:
          throw new Error(`Unknown type: ${type}`);
      }
      
      if (response.success) {
        toast.success(`${type} deleted successfully`);
        await loadSecurityData();
      } else {
        toast.error(response.error || `Failed to delete ${type}`);
      }
    } catch (error) {
      console.error(`Failed to delete ${type}:`, error);
      toast.error(`Failed to delete ${type}`);
    }
  };

  const validateAppSecurity = async (appId: string) => {
    try {
      const response = await securityApiWithMocks.validateAppSecurity({ appId });
      
      if (response.success) {
        const result = response.data;
        if (result.valid) {
          toast.success('App security validation passed');
        } else {
          toast.error(`Security validation failed: ${result.issues.join(', ')}`);
        }
      } else {
        toast.error(response.error || 'Failed to validate app security');
      }
    } catch (error) {
      console.error('Failed to validate app security:', error);
      toast.error('Failed to validate app security');
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'system': return 'bg-red-100 text-red-800';
      case 'app': return 'bg-blue-100 text-blue-800';
      case 'data': return 'bg-green-100 text-green-800';
      case 'api': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getIsolationLevelColor = (level: string) => {
    switch (level) {
      case 'strict': return 'bg-red-100 text-red-800';
      case 'moderate': return 'bg-yellow-100 text-yellow-800';
      case 'relaxed': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Shield className="h-8 w-8 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">App Security Framework</h1>
          <p className="text-muted-foreground">
            Manage permissions, roles, security policies, and app isolation
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={loadSecurityData} variant="outline" size="sm">
            <Shield className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={() => setShowCreateForm(true)} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add {activeTab.slice(0, -1)}
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="permissions">
            <Key className="h-4 w-4 mr-2" />
            Permissions ({permissions.length})
          </TabsTrigger>
          <TabsTrigger value="roles">
            <Users className="h-4 w-4 mr-2" />
            Roles ({roles.length})
          </TabsTrigger>
          <TabsTrigger value="policies">
            <Lock className="h-4 w-4 mr-2" />
            Policies ({policies.length})
          </TabsTrigger>
          <TabsTrigger value="contexts">
            <Shield className="h-4 w-4 mr-2" />
            App Contexts ({appContexts.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="permissions" className="space-y-4">
          <div className="grid gap-4">
            {permissions.map((permission) => (
              <Card key={permission.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Key className="h-5 w-5" />
                      <CardTitle className="text-lg">{permission.name}</CardTitle>
                      <Badge className={getCategoryColor(permission.category)}>
                        {permission.category}
                      </Badge>
                      {permission.isSystemPermission && (
                        <Badge variant="outline">System</Badge>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline">
                        <Edit className="h-4 w-4" />
                      </Button>
                      {!permission.isSystemPermission && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => deleteItem('AppPermission', permission.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <CardDescription>{permission.description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>

          {showCreateForm && activeTab === 'permissions' && (
            <Card>
              <CardHeader>
                <CardTitle>Create New Permission</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="permission-name">Name</Label>
                  <Input
                    id="permission-name"
                    value={newPermission.name}
                    onChange={(e) => setNewPermission({ ...newPermission, name: e.target.value })}
                    placeholder="e.g., app.data.read"
                  />
                </div>
                <div>
                  <Label htmlFor="permission-description">Description</Label>
                  <Textarea
                    id="permission-description"
                    value={newPermission.description}
                    onChange={(e) => setNewPermission({ ...newPermission, description: e.target.value })}
                    placeholder="Describe what this permission allows"
                  />
                </div>
                <div>
                  <Label htmlFor="permission-category">Category</Label>
                  <select
                    id="permission-category"
                    value={newPermission.category}
                    onChange={(e) => setNewPermission({ ...newPermission, category: e.target.value })}
                    className="w-full p-2 border rounded"
                  >
                    <option value="app">App</option>
                    <option value="data">Data</option>
                    <option value="api">API</option>
                    <option value="system">System</option>
                  </select>
                </div>
                <div className="flex gap-2">
                  <Button onClick={createPermission}>Create Permission</Button>
                  <Button variant="outline" onClick={() => setShowCreateForm(false)}>
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="roles" className="space-y-4">
          <div className="grid gap-4">
            {roles.map((role) => (
              <Card key={role.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      <CardTitle className="text-lg">{role.name}</CardTitle>
                      {role.isSystemRole && (
                        <Badge variant="outline">System</Badge>
                      )}
                      <Badge variant="secondary">{role.userCount} users</Badge>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline">
                        <Edit className="h-4 w-4" />
                      </Button>
                      {!role.isSystemRole && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => deleteItem('AppRole', role.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <CardDescription>{role.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div>
                    <p className="text-sm font-medium mb-2">Permissions ({role.permissions.length})</p>
                    <div className="flex flex-wrap gap-1">
                      {role.permissions.slice(0, 5).map((permissionId) => {
                        const permission = permissions.find(p => p.id === permissionId);
                        return permission ? (
                          <Badge key={permissionId} variant="outline" className="text-xs">
                            {permission.name}
                          </Badge>
                        ) : null;
                      })}
                      {role.permissions.length > 5 && (
                        <Badge variant="outline" className="text-xs">
                          +{role.permissions.length - 5} more
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="policies" className="space-y-4">
          <div className="grid gap-4">
            {policies.map((policy) => (
              <Card key={policy.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Lock className="h-5 w-5" />
                      <CardTitle className="text-lg">{policy.name}</CardTitle>
                      <Badge variant="outline">{policy.type.replace('_', ' ')}</Badge>
                      <Badge variant="secondary">Priority: {policy.priority}</Badge>
                    </div>
                    <div className="flex gap-2">
                      <Switch
                        checked={policy.enabled}
                        onCheckedChange={(enabled) => togglePolicy(policy.id, enabled)}
                      />
                      <Button size="sm" variant="outline">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => deleteItem('SecurityPolicy', policy.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <CardDescription>{policy.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div>
                    <p className="text-sm font-medium mb-2">Rules</p>
                    <pre className="text-xs bg-gray-50 p-2 rounded overflow-x-auto">
                      {JSON.stringify(policy.rules, null, 2)}
                    </pre>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="contexts" className="space-y-4">
          <div className="grid gap-4">
            {appContexts.map((context) => (
              <Card key={context.appId}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Shield className="h-5 w-5" />
                      <CardTitle className="text-lg">{context.appName}</CardTitle>
                      <Badge className={getIsolationLevelColor(context.isolationLevel)}>
                        {context.isolationLevel} isolation
                      </Badge>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => validateAppSecurity(context.appId)}
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Validate
                      </Button>
                      <Button size="sm" variant="outline">
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm font-medium mb-2">Permissions ({context.permissions.length})</p>
                      <div className="space-y-1">
                        {context.permissions.slice(0, 3).map((permissionId) => {
                          const permission = permissions.find(p => p.id === permissionId);
                          return permission ? (
                            <Badge key={permissionId} variant="outline" className="text-xs block w-fit">
                              {permission.name}
                            </Badge>
                          ) : null;
                        })}
                        {context.permissions.length > 3 && (
                          <p className="text-xs text-muted-foreground">
                            +{context.permissions.length - 3} more
                          </p>
                        )}
                      </div>
                    </div>

                    <div>
                      <p className="text-sm font-medium mb-2">Data Access</p>
                      <div className="space-y-1 text-xs">
                        <div className="flex items-center gap-2">
                          {context.dataAccess.ownData ? <CheckCircle className="h-3 w-3 text-green-500" /> : <XCircle className="h-3 w-3 text-red-500" />}
                          Own Data
                        </div>
                        <div className="flex items-center gap-2">
                          {context.dataAccess.orgData ? <CheckCircle className="h-3 w-3 text-green-500" /> : <XCircle className="h-3 w-3 text-red-500" />}
                          Org Data
                        </div>
                        <div className="flex items-center gap-2">
                          {context.dataAccess.crossOrgData ? <CheckCircle className="h-3 w-3 text-green-500" /> : <XCircle className="h-3 w-3 text-red-500" />}
                          Cross-Org Data
                        </div>
                      </div>
                    </div>

                    <div>
                      <p className="text-sm font-medium mb-2">API Access</p>
                      <div className="space-y-1 text-xs">
                        <div className="flex items-center gap-2">
                          {context.apiAccess.internal ? <CheckCircle className="h-3 w-3 text-green-500" /> : <XCircle className="h-3 w-3 text-red-500" />}
                          Internal APIs
                        </div>
                        <div className="flex items-center gap-2">
                          {context.apiAccess.external ? <CheckCircle className="h-3 w-3 text-green-500" /> : <XCircle className="h-3 w-3 text-red-500" />}
                          External APIs
                        </div>
                        <div className="text-muted-foreground">
                          Rate Limit: {context.apiAccess.rateLimit}/min
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};