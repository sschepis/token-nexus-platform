import React from "react";
import Link from "next/link";
import { CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

interface RouteDetailHeaderProps {
  routePath: string;
  isEditing: boolean;
}

const RouteDetailHeader: React.FC<RouteDetailHeaderProps> = ({ routePath, isEditing }) => {
  return (
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle>
        {isEditing ? "Edit Route" : "Route"} : {routePath}
      </CardTitle>
      <Button variant="ghost" size="sm" asChild>
        <Link href="/routes">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Link>
      </Button>
    </CardHeader>
  );
};

export default RouteDetailHeader;