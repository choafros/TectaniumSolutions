import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export default function NavBar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user } = useAuth();

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
            <Link href="#services">
              <span className="text-sm cursor-pointer hover:text-primary">Services</span>
            </Link>
            <Link href="#about">
              <span className="text-sm cursor-pointer hover:text-primary">About</span>
            </Link>
            {user ? (
              <Link href="/dashboard">
                <Button>Dashboard</Button>
              </Link>
            ) : (
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
            <Link href="#services">
              <span className="block px-3 py-2 text-base hover:bg-muted rounded-md">
                Services
              </span>
            </Link>
            <Link href="#about">
              <span className="block px-3 py-2 text-base hover:bg-muted rounded-md">
                About
              </span>
            </Link>
            {user ? (
              <Link href="/dashboard">
                <span className="block px-3 py-2 text-base hover:bg-muted rounded-md">
                  Dashboard
                </span>
              </Link>
            ) : (
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
