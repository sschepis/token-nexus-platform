export interface ThemeConfig {
  id?: string;
  name: string;
  description: string;
  category: string;
  colors: any;
  typography: any;
  spacing: any;
  branding: any;
  components: any;
  isCustom?: boolean;
  isActive?: boolean;
}