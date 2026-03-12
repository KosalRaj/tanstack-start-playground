import { useRouter } from "@tanstack/react-router";
import { logout } from "@/auth";
import { Button } from "@/components/ui/button";
import { User, LogOut } from "lucide-react";

interface HeaderProps {
  user: { username: string } | null;
}

export function Header({ user }: HeaderProps) {
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.invalidate();
    router.navigate({ to: "/login" });
  };

  return (
    <header className="h-16 border-b bg-background flex items-center justify-between px-6 shrink-0 transition-all">
      <div className="flex-1">
        {/* Placeholder for Breadcrumbs, Search, etc. */}
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-sm text-foreground">
          <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-secondary-foreground border">
            <User className="w-4 h-4" />
          </div>
          <span className="font-medium hidden sm:block">{user?.username}</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          title="Logout"
          onClick={handleLogout}
          className="text-muted-foreground hover:text-destructive"
        >
          <LogOut className="w-4 h-4" />
        </Button>
      </div>
    </header>
  );
}
