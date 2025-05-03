
export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

export interface RouteHandler {
  id: string;
  type: "page" | "function" | "redirect";
  target: string; // Page component name, function ID, or redirect URL
  description?: string;
  functionId?: string; // Optional reference to cloud function ID
}

export interface Route {
  id: string;
  path: string;
  methods: {
    [key in HttpMethod]?: RouteHandler;
  };
  active: boolean;
  protected: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RouteState {
  routes: Route[];
  selectedRouteId: string | null;
}
