import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Logo } from "@/components/brand/logo";

export function Footer() {
  return <footer className="site-footer page-width">
    <div className="footer-brand"><Link href="/" aria-label="ThreadLabz home"><Logo /></Link><p>A little everyday. A little extra.<br />Always, unapologetically you.</p></div>
    <div className="footer-links">
      <div><h3>Explore</h3><Link href="/shop">The collection</Link><Link href="/#festivals">Festival fits</Link><Link href="/customize">Make it yours <ArrowUpRight size={13} /></Link></div>
      <div><h3>Here to help</h3><Link href="/about">Our story</Link><Link href="/contact">Get in touch</Link><Link href="/shipping">Shipping & returns</Link></div>
      <div><h3>Your ThreadLabz</h3><Link href="/account">My account</Link><Link href="/orders">Track an order</Link><Link href="/wishlist">Your wishlist</Link></div>
    </div>
    <div className="footer-bottom"><span>© {new Date().getFullYear()} ThreadLabz. Make Your Mark.</span><span>India · INR ₹</span><span className="preview-note">Store preview · Orders aren’t open yet</span></div>
  </footer>;
}
