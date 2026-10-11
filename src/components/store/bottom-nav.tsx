"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { House, LayoutGrid, Sparkles, ShoppingBag, UserRound } from "lucide-react";

const items = [
  { label: "Home", href: "/", icon: House },
  { label: "Categories", href: "/shop", icon: LayoutGrid },
  { label: "Customize", href: "/customize", icon: Sparkles },
  { label: "Orders", href: "/orders", icon: ShoppingBag },
  { label: "Account", href: "/account", icon: UserRound },
];

export function BottomNav() {
  const pathname = usePathname();
  return <nav className="bottom-nav" aria-label="Quick navigation">
    {items.map(({ label, href, icon: Icon }) => <Link key={href} href={href} aria-current={pathname === href ? "page" : undefined}><Icon size={22} strokeWidth={1.6} aria-hidden="true" /><span>{label}</span></Link>)}
  </nav>;
}
