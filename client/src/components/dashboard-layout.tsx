import { useAuth } from "@/hooks/use-auth";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Clock,
  FileText,
  Users,
  Building2,
  LogOut,
} from "lucide-react";

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

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar */}
      <div className="fixed left-0 top-0 h-screen w-64 border-r bg-card">
        <div className="p-6">
          <Link href="/dashboard">
            <span className="text-xl font-bold cursor-pointer">Tectanium</span>
          </Link>
        </div>
        <nav className="space-y-1 px-3">
          {sidebarItems
            .filter(
              (item) =>
                !item.roles || (user && item.roles.includes(user.role))
            )
            .map((item) => {
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
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </a>
                </Link>
              );
            })}
          <button
            onClick={() => logoutMutation.mutate()}
            disabled={logoutMutation.isPending}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-red-500 transition-colors hover:bg-accent"
          >
            <LogOut className="h-4 w-4" />
            {logoutMutation.isPending ? "Logging out..." : "Logout"}
          </button>
        </nav>
      </div>

      {/* Main content */}
      <div className="ml-64">
        <main className="container mx-auto p-8">{children}</main>
      </div>
    </div>
  );
}
