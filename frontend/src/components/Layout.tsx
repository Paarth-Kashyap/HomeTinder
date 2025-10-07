import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error("Failed to sign out:", error);
    }
  };

  const navLinks = [
    { to: "/", label: "🏠 Browse" },
    { to: "/likes", label: "❤️ My Likes" },
    { to: "/profile", label: "👤 My Profile" },
  ];

  return (
    <div className="min-h-screen relative overflow-hidden flex flex-col">
      {/* 🔷 Global background (applies to every page) */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-primary-50 via-white to-secondary-50" />
      <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-primary-200 blur-3xl opacity-40 -z-10" />
      <div className="pointer-events-none absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-secondary-200 blur-3xl opacity-40 -z-10" />

      {/* Top Navigation */}
      <nav className="sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-gray-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link
              to="/"
              className="text-2xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-primary-600 to-secondary-600 tracking-tight"
            >
              HomeTinder
            </Link>

            {/* Mobile Menu Toggle */}
            {user && (
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="p-2 rounded-md text-gray-600 hover:bg-gray-100"
                aria-label="Open menu"
              >
                ☰
              </button>
            )}
          </div>
        </div>

        {/* Mobile Dropdown */}
        {menuOpen && user && (
          <div className="bg-white border-t border-gray-200 px-2 py-3 space-y-1 shadow-md">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setMenuOpen(false)}
                className={`block px-3 py-2 rounded-md text-sm font-medium ${
                  location.pathname === link.to
                    ? "bg-primary-50 text-primary-600"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                }`}
              >
                {link.label}
              </Link>
            ))}

            {/* Divider */}
            <hr className="my-2 border-gray-200" />
            <button
              onClick={handleSignOut}
              className="w-full text-left px-3 py-2 text-sm text-gray-600 hover:bg-red-50 hover:text-red-600 rounded-md transition-colors"
            >
              Sign Out
            </button>
          </div>
        )}
      </nav>

      {/* Main Content */}
      <main className="flex-1">{children}</main>

      {/* Footer */}
      <footer className="bg-white/95 backdrop-blur border-t border-gray-200 py-4 mt-auto">
        <div className="max-w-6xl mx-auto px-4 text-center text-sm text-gray-500">
          © {new Date().getFullYear()} HomeTinder. All rights reserved.
        </div>
      </footer>
    </div>
  );
};
