export interface ParentOrg {
  id: string;
  name: string;
  contactEmail: string;
  isParentOrg: boolean;
  settings?: {
    allowChildOrgs?: boolean;
    maxChildOrgs?: number;
    features?: Record<string, boolean>;
  };
}

export interface ChildOrg {
  id: string;
  name: string;
  contactEmail: string;
  contactPhone?: string;
  status: 'active' | 'suspended' | 'archived';
  planType: string;
  owner?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
  industry?: string;
  companySize?: string;
  createdAt: string;
  updatedAt: string;
  stats: {
    userCount: number;
  };
}

export interface InitFormData {
  name: string;
  contactEmail: string;
  contactPhone: string;
  adminEmail: string;
  adminFirstName: string;
  adminLastName: string;
}

export interface CreateFormData {
  name: string;
  contactEmail: string;
  contactPhone: string;
  planType: string;
  ownerEmail: string;
  ownerFirstName: string;
  ownerLastName: string;
  industry: string;
  companySize: string;
}