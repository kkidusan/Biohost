// app/admin/layout.tsx
"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "../context/AuthContext";
import {
  LayoutDashboard,
  Cpu,
  Users,
  FileText,
  DollarSign,
  Settings,
  BookOpen,
  Loader2
} from "lucide-react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { isLoggedIn, user, loading } = useAuth();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading) {
      if (!isLoggedIn) {
        window.location.href = "/login";
      } else if (user?.role !== "admin") {
        window.location.href = "/";
      }
    }
  }, [loading, isLoggedIn, user]);

  const sidebarLinks = [
    { name: "Overview", href: "/admin/dashboard", icon: LayoutDashboard },
    { name: "Matchmaker AI", href: "/admin/matchmaker", icon: Cpu },
    { name: "User Management", href: "/admin/users", icon: Users },
    { name: "Teaching Specialties", href: "/admin/specialties", icon: BookOpen },
    { name: "Sessions & Quality", href: "/admin/sessions", icon: FileText },
    { name: "Financials & Payouts", href: "/admin/financials", icon: DollarSign },
    { name: "System Settings", href: "/admin/settings", icon: Settings },
  ];

  return (
    <div className="min-h-[calc(100vh-5rem)] bg-stone-950 text-stone-100 flex overflow-hidden">
      {/* Left Sidebar - Independent Scrolling */}
      <aside className="w-64 bg-stone-900 border-r border-stone-800 p-6 hidden lg:flex flex-col justify-between shrink-0 sticky top-0 h-[calc(100vh-5rem)] overflow-y-auto">
        <div className="space-y-6">
          <nav className="space-y-1 pt-2">
            {sidebarLinks.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition ${
                    isActive
                      ? "bg-amber-500 text-stone-950 font-bold shadow-lg shadow-amber-500/20"
                      : "text-stone-300 hover:bg-stone-800 hover:text-white"
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? "text-stone-950" : "text-amber-500"}`} />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="pt-6 border-t border-stone-800 text-xs text-stone-500">
          Biruh Tutors Control Center
        </div>
      </aside>

      {/* Main Content Area - Independent Scrolling */}
      <main className="flex-1 p-6 md:p-10 h-[calc(100vh-5rem)] overflow-y-auto relative">
        {loading ? (
          <div className="absolute inset-0 bg-stone-950 flex items-center justify-center z-50">
            <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
          </div>
        ) : null}
        {children}
      </main>
    </div>
  );
}
