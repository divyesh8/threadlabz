"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "@/app/account/actions";
import {
  LayoutDashboard,
  Package,
  Layers,
  Sparkles,
  Image as ImageIcon,
  ExternalLink,
  LogOut,
  Menu,
  X,
} from "lucide-react";

interface AdminNavProps {
  userEmail: string;
}

export function AdminNav({ userEmail }: AdminNavProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const links = [
    { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
    { href: "/admin/products", label: "Products", icon: Package },
    { href: "/admin/categories", label: "Categories", icon: Layers },
    { href: "/admin/festivals", label: "Festivals", icon: Sparkles },
    { href: "/admin/banners", label: "Banners", icon: ImageIcon },
  ];

  const isActive = (href: string) => {
    if (href === "/admin") return pathname === "/admin";
    return pathname.startsWith(href);
  };

  return (
    <>
      {/* Mobile Top Header */}
      <header className="lg:hidden flex items-center justify-between px-4 py-3 bg-[#2B2625] text-[#F4EDE5] border-b border-stone-800">
        <div className="flex items-center gap-2">
          <Link href="/admin" className="font-bold text-lg tracking-wider text-[#A74224] flex items-center gap-2">
            <span className="bg-[#A74224] text-white px-2 py-0.5 rounded text-xs tracking-widest font-mono">TL</span>
            <span className="text-white font-serif">THREADLABZ ADMIN</span>
          </Link>
        </div>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 rounded hover:bg-stone-800 text-[#F4EDE5]"
          aria-label="Toggle navigation"
        >
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </header>

      {/* Backdrop for Mobile */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/50"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <aside
        className={`fixed lg:static top-0 bottom-0 left-0 z-50 w-64 bg-[#2B2625] text-[#F4EDE5] flex flex-col transition-transform duration-200 ease-in-out border-r border-stone-800 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* Brand Monogram & Title */}
        <div className="px-6 py-6 border-b border-stone-800 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-[#A74224] text-white px-2 py-0.5 rounded text-xs font-mono font-bold tracking-widest">
                TL
              </span>
              <span className="font-bold text-lg tracking-wider text-white">THREADLABZ</span>
            </div>
            <p className="text-xs text-stone-400 mt-1 uppercase tracking-widest font-mono">Administration</p>
          </div>
          <button
            onClick={() => setMobileOpen(false)}
            className="lg:hidden text-stone-400 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          {links.map((link) => {
            const Icon = link.icon;
            const active = isActive(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? "bg-[#A74224] text-white font-semibold shadow-sm"
                    : "text-stone-300 hover:bg-stone-800/80 hover:text-white"
                }`}
              >
                <Icon size={18} className={active ? "text-white" : "text-stone-400"} />
                <span>{link.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User Info & Quick Links */}
        <div className="p-4 border-t border-stone-800 bg-stone-900/40">
          <div className="mb-3 px-2">
            <p className="text-xs text-stone-400 font-mono">Signed in as</p>
            <p className="text-xs font-medium text-stone-200 truncate" title={userEmail}>
              {userEmail}
            </p>
          </div>

          <div className="space-y-1">
            <Link
              href="/"
              target="_blank"
              className="flex items-center gap-2.5 px-2.5 py-2 rounded text-xs text-stone-300 hover:bg-stone-800 hover:text-white transition-colors"
            >
              <ExternalLink size={14} />
              <span>View Live Storefront</span>
            </Link>

            <form action={async () => { await signOut(); }}>
              <button
                type="submit"
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded text-xs text-red-400 hover:bg-stone-800 hover:text-red-300 transition-colors"
              >
                <LogOut size={14} />
                <span>Sign Out</span>
              </button>
            </form>
          </div>
        </div>
      </aside>
    </>
  );
}
