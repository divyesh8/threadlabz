"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Heart, Menu, Search, ShoppingBag, SlidersHorizontal, X } from "lucide-react";
import { useState } from "react";
import { Logo } from "@/components/brand/logo";

export function Header() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  return <>
    <div className="announcement"><span>Made for your everyday. And your big days.</span><Link href="/customize">Make it yours <span aria-hidden="true">↗</span></Link></div>
    <header className="site-header">
      <div className="header-main page-width">
        <Link href="/" className="logo-link" aria-label="ThreadLabz home"><Logo /></Link>
        <nav className="desktop-nav" aria-label="Main navigation">
          <Link href="/shop" aria-current={pathname === "/shop" ? "page" : undefined}>Shop all</Link>
          <Link href="/#festivals">The festive edit</Link>
          <Link href="/customize">Customize <span className="tiny-spark">✳</span></Link>
        </nav>
        <div className="header-actions">
          <Link href="/wishlist" className="icon-button" aria-label="Wishlist"><Heart /></Link>
          <Link href="/cart" className="icon-button" aria-label="Shopping bag"><ShoppingBag /></Link>
          <button className="icon-button menu-toggle" aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} aria-controls="mobile-menu" onClick={() => setOpen(!open)}>{open ? <X /> : <Menu />}</button>
        </div>
      </div>
      {open && <nav className="mobile-menu page-width" id="mobile-menu" aria-label="Mobile menu" onClick={() => setOpen(false)}>
        <Link href="/shop">Shop all</Link><Link href="/#festivals">The festive edit</Link><Link href="/customize">Customize</Link><Link href="/account">My account</Link>
      </nav>}
      <div className="header-discover page-width">
        <form action="/shop" role="search" className="search-form">
          <Search size={19} aria-hidden="true" /><label className="sr-only" htmlFor="site-search">Search outfits, costumes and accessories</label>
          <input id="site-search" name="q" type="search" placeholder="Search outfits, costumes & accessories…" maxLength={100} />
          <button className="icon-button" aria-label="Search catalogue"><SlidersHorizontal size={18} /></button>
        </form>
        <nav className="category-chips" aria-label="Shop by department">
          {[['Kids','kids'],['Women','women'],['Men','men'],['Fancy Dress','fancy-dress'],['Accessories','accessories']].map(([name,slug]) => <Link key={slug} href={`/shop?category=${slug}`}>{name}</Link>)}
        </nav>
      </div>
    </header>
  </>;
}
