
export type FunctionLanguage = "javascript" | "typescript";
export type FunctionRuntime = "nodejs18.x" | "nodejs20.x";
export type FunctionStatus = "active" | "disabled" | "error";

export interface CloudFunction {
  id: string;
  name: string;
  description?: string;
  code: string;
  language: FunctionLanguage;
  runtime: FunctionRuntime;
  status: FunctionStatus;
  createdAt: string;
  updatedAt: string;
  boundRoutes?: string[]; // IDs of routes this function is bound to
}

export interface CloudFunctionState {
  functions: CloudFunction[];
  selectedFunctionId: string | null;
  isLoading: boolean;
  error: string | null;
}
