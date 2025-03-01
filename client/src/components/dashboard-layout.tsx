import { useAuth } from "@/hooks/use-auth";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useState } from "react";
import {
  LayoutDashboard,
  Clock,
  FileText,
  Users,
  Building2,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";

type SidebarItem = {
  icon: React.ElementType;
  label: string;
  href: string;
  roles?: string[];
};

const sidebarItems: SidebarItem[] = [
  {
    icon: LayoutDashboard,
    label: "Dashboard",
    href: "/dashboard",
  },
  {
    icon: Clock,
    label: "Timesheets",
    href: "/timesheet",
    roles: ["candidate", "admin"],
  },
  {
    icon: FileText,
    label: "Documents",
    href: "/documents",
    roles: ["candidate", "admin"],
  },
  {
    icon: Users,
    label: "Users",
    href: "/users",
    roles: ["admin"],
  },
  {
    icon: Building2,
    label: "Organizations",
    href: "/organizations",
    roles: ["admin"],
  },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, logoutMutation } = useAuth();
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  if (!user) return null;

  const filteredItems = sidebarItems.filter(
    (item) => !item.roles || (user && item.roles.includes(user.role))
  );

  const NavItems = () => (
    <nav className="space-y-1">
      {filteredItems.map((item) => {
        const Icon = item.icon;
        const isActive = location === item.href;
        return (
          <Link key={item.href} href={item.href}>
            <a
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-accent"
              )}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </a>
          </Link>
        );
      })}
      <button
        onClick={() => {
          setIsMobileMenuOpen(false);
          logoutMutation.mutate();
        }}
        disabled={logoutMutation.isPending}
        className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-red-500 transition-colors hover:bg-accent"
      >
        <LogOut className="h-4 w-4" />
        {logoutMutation.isPending ? "Logging out..." : "Logout"}
      </button>
    </nav>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile menu button */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-background border-b px-4">
        <div className="flex items-center justify-between h-16">
          <Link href="/dashboard">
            <span className="text-xl font-bold cursor-pointer">Tectanium</span>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </Button>
        </div>
      </div>

      {/* Mobile menu */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-40 bg-background md:hidden pt-16">
          <div className="p-4">
            <NavItems />
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <div className="hidden md:fixed md:inset-y-0 md:flex md:w-64 md:flex-col border-r bg-card">
        <div className="p-6">
          <Link href="/dashboard">
            <span className="text-xl font-bold cursor-pointer">Tectanium</span>
          </Link>
        </div>
        <div className="px-3 flex-1">
          <NavItems />
        </div>
      </div>

      {/* Main content */}
      <div className="md:pl-64 pt-16 md:pt-0">
        <main className="container mx-auto p-8">{children}</main>
      </div>
    </div>
  );
}