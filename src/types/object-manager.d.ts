
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
}
