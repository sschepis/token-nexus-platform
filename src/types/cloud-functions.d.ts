export interface CloudFunction {
  id: string;
  name: string;
  description: string;
  code: string;
  language: 'javascript' | 'typescript';
  runtime: string;
  status: 'active' | 'inactive' | 'draft';
  createdAt: string;
  updatedAt: string;
  category: string;
  boundRoutes?: string[];
}

export interface CloudFunctionState {
  functions: CloudFunction[];
  selectedFunctionId: string | null;
  isLoading: boolean;
  error: string | null;
}