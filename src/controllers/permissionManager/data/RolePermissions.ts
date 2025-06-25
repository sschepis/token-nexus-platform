// src/controllers/permissionManager/data/RolePermissions.ts

export function getRolePermissions(role: string): string[] {
  const rolePermissions: Record<string, string[]> = {
    'system-admin': ['*'], // All permissions
    'organization-admin': [
      'organization.read',
      'organization.update',
      'organization.members.manage',
      'integrations.manage',
      'billing.read',
      'audit.read',
      // Object Manager permissions
      'objects:read',
      'objects:write',
      'records:read',
      'records:write',
      // Additional data management permissions
      'schema.read',
      'schema.write',
      'data.export',
      'data.import'
    ],
    'organization-member': [
      'organization.read',
      'profile.read',
      'profile.update',
      // Basic object access for members
      'objects:read',
      'records:read',
      'records:write'
    ],
    'user': [
      'profile.read',
      'profile.update',
      // Limited object access for regular users
      'objects:read',
      'records:read'
    ],
    'guest': [
      'public.read'
    ]
  };

  return rolePermissions[role] || [];
}