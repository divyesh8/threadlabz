import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

export function SectionHeading({ outline, solid, href, eyebrow }: { outline: string; solid: string; href?: string; eyebrow?: string }) {
  return <div className="section-heading">
    <div>{eyebrow && <p className="eyebrow">{eyebrow}</p>}<h2><span className="outline-word">{outline}</span> {solid}</h2></div>
    {href && <Link className="text-link" href={href}>View all <ArrowUpRight size={17} aria-hidden="true" /></Link>}
  </div>;
}
