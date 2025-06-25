import { CustomObject, CustomField, ObjectRecord } from '@/types/object-manager';

export interface FetchObjectsParams {
  orgId: string;
  includeInactive?: boolean;
  objectType?: string;
  searchTerm?: string;
  includeRecordCount?: boolean;
}

export interface CreateObjectParams {
  orgId: string;
  apiName: string;
  label: string;
  description?: string;
  fields?: CustomField[];
}

export interface FetchRecordsParams {
  orgId: string;
  objectApiName: string;
  limit?: number;
  skip?: number;
  filters?: Record<string, any>;
  sortBy?: string;
  sortOrder?: string;
}

export interface CreateRecordParams {
  orgId: string;
  objectApiName: string;
  recordData: Record<string, any>;
}

export interface UpdateRecordParams {
  orgId: string;
  objectApiName: string;
  recordId: string;
  updates: Record<string, any>;
}

export interface DeleteRecordParams {
  orgId: string;
  objectApiName: string;
  recordId: string;
}

export interface AddFieldParams {
  objectApiName: string;
  field: CustomField;
}

export interface UpdateFieldParams {
  objectApiName: string;
  fieldApiName: string;
  updates: Partial<CustomField>;
}

export interface DeleteFieldParams {
  objectApiName: string;
  fieldApiName: string;
}

export interface DeleteObjectParams {
  objectApiName: string;
  confirmDelete: boolean;
}