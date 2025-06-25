
import React, { useState, useEffect } from "react";
import { Route, HttpMethod, RouteHandler } from "@/types/routes";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { updateRoute, deleteRoute } from "@/store/slices/routeSlice";
import { CloudFunction } from "@/types/cloud-functions";

import RouteDetailHeader from "./route-detail-components/RouteDetailHeader";
import RouteGeneralTab from "./route-detail-components/RouteGeneralTab";
import RouteHandlerTab from "./route-detail-components/RouteHandlerTab";
import RouteDetailFooter from "./route-detail-components/RouteDetailFooter";

interface RouteDetailProps {
  route: Route;
  onClose: () => void;
}

const RouteDetail: React.FC<RouteDetailProps> = ({ route, onClose }) => {
  const dispatch = useAppDispatch();
  const cloudFunctions = useAppSelector(
    (state) => state.cloudFunction.functions
  );
  const [isEditing, setIsEditing] = useState(false);
  const [path, setPath] = useState(route.path);
  const [active, setActive] = useState(route.active);
  const [isProtected, setIsProtected] = useState(route.protected);
  const [selectedMethod, setSelectedMethod] = useState<HttpMethod>("GET");
  const [selectedHandlerType, setSelectedHandlerType] = useState<RouteHandler['type']>("page");
  const [target, setTarget] = useState("");
  const [description, setDescription] = useState("");
  const [functionId, setFunctionId] = useState<string | undefined>(undefined);

  useEffect(() => {
    setPath(route.path);
    setActive(route.active);
    setIsProtected(route.protected);

    // Initialize handler state based on existing route configuration
    if (route.methods && route.methods[selectedMethod]) {
      const handler = route.methods[selectedMethod] as RouteHandler;
      setSelectedHandlerType(handler.type);
      setTarget(handler.target);
      setDescription(handler.description || "");
      setFunctionId(handler.functionId);
    } else {
      // Reset form if no handler exists for the selected method
      setSelectedHandlerType("page");
      setTarget("");
      setDescription("");
      setFunctionId(undefined);
    }
  }, [route, selectedMethod]);

  const handleSave = () => {
    const updatedRoute: Partial<Route> = {
      id: route.id,
      path: path,
      active: active,
      protected: isProtected,
      methods: {
        [selectedMethod]: {
          id: route.methods?.[selectedMethod]?.id || Math.random().toString(36).substring(2, 15),
          type: selectedHandlerType,
          target: target,
          description: description,
          functionId: selectedHandlerType === "function" ? functionId : undefined,
        } as RouteHandler,
      },
    };

    dispatch(updateRoute({
      routeId: route.id,
      updates: updatedRoute
    }));
    
    setIsEditing(false);
    toast.success("Route updated successfully!");
  };

  const handleDelete = () => {
    dispatch(deleteRoute(route.id));
    toast.success("Route deleted successfully!");
    onClose();
  };


  return (
    <Card className="w-full">
      <RouteDetailHeader routePath={route.path} isEditing={isEditing} />
      <CardContent>
        <Tabs defaultValue="general" className="space-y-4">
          <TabsList>
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="handler">Handler</TabsTrigger>
          </TabsList>
          <RouteGeneralTab
            path={path}
            setPath={setPath}
            active={active}
            setActive={setActive}
            isProtected={isProtected}
            setIsProtected={setIsProtected}
            isEditing={isEditing}
          />
          <RouteHandlerTab
            selectedMethod={selectedMethod}
            setSelectedMethod={setSelectedMethod}
            selectedHandlerType={selectedHandlerType}
            setSelectedHandlerType={setSelectedHandlerType}
            target={target}
            setTarget={setTarget}
            description={description}
            setDescription={setDescription}
            functionId={functionId}
            setFunctionId={setFunctionId}
            cloudFunctions={cloudFunctions}
            isEditing={isEditing}
          />
        </Tabs>
      </CardContent>
      <CardFooter>
        <RouteDetailFooter
          isEditing={isEditing}
          onSave={handleSave}
          onCancel={() => setIsEditing(false)}
          onEdit={() => setIsEditing(true)}
          onDelete={handleDelete}
        />
      </CardFooter>
    </Card>
  );
};

export default RouteDetail;
