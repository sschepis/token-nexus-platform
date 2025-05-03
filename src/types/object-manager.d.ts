
export interface CustomField {
  id: string;
  apiName: string;
  label: string;
  type: string;
  required: boolean;
  description?: string;
  defaultValue?: string;
  options?: string[];
  referenceTo?: string;
}

export interface CustomObject {
  id: string;
  apiName: string;
  label: string;
  description?: string;
  fields: CustomField[];
  createdAt: string;
  updatedAt: string;
  recordCount?: number;
}

export interface ObjectTrigger {
  id: string;
  objectApiName: string;
  eventType: 'beforeInsert' | 'afterInsert' | 'beforeUpdate' | 'afterUpdate' | 'beforeDelete' | 'afterDelete';
  code: string;
  active: boolean;
}

export interface ObjectRecord {
  id: string;
  [key: string]: any;
}
