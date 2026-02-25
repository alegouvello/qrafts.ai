import { Link, useLocation } from "react-router-dom";
import { User, BarChart3, Settings, Plus, LayoutDashboard } from "lucide-react";
import { cn } from "@/lib/utils";

interface MobileBottomNavProps {
  onAddApplication: () => void;
}

export const MobileBottomNav = ({ onAddApplication }: MobileBottomNavProps) => {
  const location = useLocation();

  const navItems = [
    { icon: LayoutDashboard, label: "Home", path: "/dashboard" },
    { icon: User, label: "Profile", path: "/profile" },
    { icon: "add", label: "Add", action: onAddApplication },
    { icon: BarChart3, label: "Compare", path: "/comparison" },
    { icon: Settings, label: "Settings", path: "/settings" },
  ] as const;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/40 bg-background/90 backdrop-blur-xl sm:hidden"
      role="navigation"
      aria-label="Mobile navigation"
    >
      <div className="flex items-center justify-around h-16 px-2 pb-[env(safe-area-inset-bottom)]">
        {navItems.map((item) => {
          if (item.icon === "add") {
            return (
              <button
                key="add"
                onClick={item.action}
                className="flex flex-col items-center justify-center -mt-5"
                aria-label="Add new application"
              >
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30">
                  <Plus className="h-6 w-6" />
                </div>
                <span className="text-[10px] mt-0.5 font-medium text-primary">Add</span>
              </button>
            );
          }

          const Icon = item.icon;
          const isActive = location.pathname === item.path;

          return (
            <Link
              key={item.path}
              to={item.path!}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 min-w-[3rem] py-1 transition-colors",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};
