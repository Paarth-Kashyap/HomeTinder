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
  ];

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Top Navigation */}
      <nav className="sticky top-0 z-20 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo + Links */}
            <div className="flex items-center space-x-8">
              <Link
                to="/"
                className="text-2xl font-extrabold text-primary-600 tracking-tight"
              >
                HomeTinder
              </Link>

              {user && (
                <div className="hidden md:flex space-x-2">
                  {navLinks.map((link) => (
                    <Link
                      key={link.to}
                      to={link.to}
                      className={`px-3 py-2 rounded-md text-sm font-medium transition-all ${
                        location.pathname === link.to
                          ? "bg-primary-50 text-primary-600"
                          : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                      }`}
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Mobile Menu Toggle */}
            {user && (
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="p-2 rounded-md text-gray-500 hover:bg-gray-100"
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

            {/* User account section */}
            <div className="px-3 py-2 text-sm text-gray-700 font-medium">
              {user.email}
            </div>
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
      <footer className="bg-white border-t border-gray-200 py-4 mt-auto">
        <div className="max-w-6xl mx-auto px-4 text-center text-sm text-gray-500">
          © {new Date().getFullYear()} HomeTinder. All rights reserved.
        </div>
      </footer>
    </div>
  );
};
