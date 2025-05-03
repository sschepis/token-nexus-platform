
import React, { ReactNode } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StyledCardProps {
  header?: ReactNode;
  children: ReactNode;
  headerColor?: "primary" | "secondary" | "accent" | "destructive" | "none";
  footerContent?: ReactNode;
  className?: string;
}

export const StyledCard = ({
  header,
  children,
  headerColor = "none",
  footerContent,
  className,
}: StyledCardProps) => {
  const getHeaderClass = () => {
    switch (headerColor) {
      case "primary":
        return "bg-primary text-primary-foreground";
      case "secondary":
        return "bg-secondary text-secondary-foreground";
      case "accent":
        return "bg-accent text-accent-foreground";
      case "destructive":
        return "bg-destructive text-destructive-foreground";
      default:
        return "";
    }
  };

  return (
    <Card className={cn("overflow-hidden", className)}>
      {header && (
        <CardHeader className={cn("py-3", getHeaderClass())}>
          {header}
        </CardHeader>
      )}
      <CardContent className="p-4">{children}</CardContent>
      {footerContent && (
        <div className="p-4 pt-0 border-t">{footerContent}</div>
      )}
    </Card>
  );
};
