import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { ReactNode } from "react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
}

export const EmptyState = ({ 
  icon: Icon, 
  title, 
  description, 
  action,
  className = "" 
}: EmptyStateProps) => {
  return (
    <Card className={`p-12 text-center border-dashed border-2 bg-gradient-to-br from-background via-muted/20 to-background ${className}`}>
      <div className="flex flex-col items-center gap-6 max-w-md mx-auto">
        <div className="relative">
          <div className="absolute inset-0 bg-primary/20 rounded-full blur-2xl animate-pulse" />
          <div className="relative h-20 w-20 rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center border border-primary/20">
            <Icon className="h-10 w-10 text-primary" />
          </div>
        </div>
        
        <div className="space-y-2">
          <h3 className="text-2xl font-bold">{title}</h3>
          <p className="text-muted-foreground">{description}</p>
        </div>
        
        {action && (
          <div className="mt-2">
            {action}
          </div>
        )}
      </div>
    </Card>
  );
};
