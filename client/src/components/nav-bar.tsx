import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export default function NavBar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, logoutMutation } = useAuth();

  return (
    <nav className="bg-background border-b">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <Link href="/">
            <span className="text-xl font-bold cursor-pointer">Tectanium</span>
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center gap-6">
            <Link href="/">
              <span className="text-sm cursor-pointer hover:text-primary">Home</span>
            </Link>
            {user && (
              <>
                <Link href="/dashboard">
                  <span className="text-sm cursor-pointer hover:text-primary">Dashboard</span>
                </Link>
                {user.role === "candidate" && (
                  <Link href="/timesheet">
                    <span className="text-sm cursor-pointer hover:text-primary">Timesheets</span>
                  </Link>
                )}
                <Button
                  variant="outline"
                  onClick={() => logoutMutation.mutate()}
                  disabled={logoutMutation.isPending}
                >
                  {logoutMutation.isPending ? "Logging out..." : "Logout"}
                </Button>
              </>
            )}
            {!user && (
              <Link href="/auth">
                <Button>Sign In</Button>
              </Link>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1">
            <Link href="/">
              <span className="block px-3 py-2 text-base hover:bg-muted rounded-md">
                Home
              </span>
            </Link>
            {user && (
              <>
                <Link href="/dashboard">
                  <span className="block px-3 py-2 text-base hover:bg-muted rounded-md">
                    Dashboard
                  </span>
                </Link>
                {user.role === "candidate" && (
                  <Link href="/timesheet">
                    <span className="block px-3 py-2 text-base hover:bg-muted rounded-md">
                      Timesheets
                    </span>
                  </Link>
                )}
                <button
                  className="block w-full text-left px-3 py-2 text-base hover:bg-muted rounded-md"
                  onClick={() => logoutMutation.mutate()}
                  disabled={logoutMutation.isPending}
                >
                  {logoutMutation.isPending ? "Logging out..." : "Logout"}
                </button>
              </>
            )}
            {!user && (
              <Link href="/auth">
                <span className="block px-3 py-2 text-base hover:bg-muted rounded-md">
                  Sign In
                </span>
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}