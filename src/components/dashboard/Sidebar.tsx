import { Link } from "@tanstack/react-router";
import { Home, Settings, Users, BarChart3, Menu, Calculator } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);

  const navItems = [
    { label: "Dashboard", icon: <Home className="w-5 h-5" />, to: "/" },
    { label: "Calculator", icon: <Calculator className="w-5 h-5" />, to: "/calculator" },
    { label: "Users", icon: <Users className="w-5 h-5" />, to: "/users" },
    { label: "Analytics", icon: <BarChart3 className="w-5 h-5" />, to: "/analytics" },
    { label: "Stocks", icon: <BarChart3 className="w-5 h-5" />, to: "/stocks" },
    { label: "Settings", icon: <Settings className="w-5 h-5" />, to: "/settings" },
  ];

  return (
    <aside
      className={cn(
        "bg-background border-r flex flex-col transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      <div className="h-16 flex items-center justify-between px-4 border-b">
        {!collapsed && <span className="font-bold text-lg whitespace-nowrap">My App</span>}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1 hover:bg-muted rounded-md text-muted-foreground"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      <nav className="flex-1 py-4 flex flex-col gap-1 px-3">
        {navItems.map((item) => (
          <Link
            key={item.label}
            to={item.to}
            className="flex items-center gap-3 px-3 py-2 rounded-md text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors"
            activeProps={{
              className: "bg-primary/10 text-primary font-medium hover:bg-primary/20 hover:text-primary",
            }}
          >
            {item.icon}
            {!collapsed && <span>{item.label}</span>}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
