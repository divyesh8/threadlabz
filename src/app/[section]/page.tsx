import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

const sections: Record<string, { title: string; text: string }> = {
  customize: { title: "Your ideas. Your ThreadLabz.", text: "Our T-shirt and hoodie design studio is being stitched together. Text, artwork and your own little signature — all in one place." },
  orders: { title: "Good things are on their way.", text: "Order history and delivery tracking will appear here once checkout opens. This preview does not accept orders." },
  wishlist: { title: "Keep your favourites close.", text: "Your saved styles will have a home here when accounts and the live catalogue are connected." },
  cart: { title: "Room for your next favourite.", text: "The shopping bag will be ready with our live catalogue. This preview does not collect payments." },
  about: { title: "Make Your Mark.", text: "ThreadLabz is about everyday expression and big celebrations. We’re bringing clothing, fancy-dress costumes, accessories and custom designs together for India." },
  contact: { title: "Let’s keep in touch.", text: "Our customer support details will be published before launch. In the meantime, explore the collection preview." },
  shipping: { title: "The details matter.", text: "Delivery charges, serviceable postcodes and return eligibility will be published before checkout opens. Shipping and returns terms are not yet final." },
};

export function generateStaticParams() { return Object.keys(sections).map(section => ({ section })); }
export const dynamicParams = false;
export async function generateMetadata({ params }: { params: Promise<{ section: string }> }): Promise<Metadata> {
  const { section } = await params; return { title: sections[section]?.title ?? "Page not found" };
}
export default async function SectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  const content = sections[section];
  if (!content) notFound();
  return <div className="status-page page-width"><span className="status-icon"><Sparkles size={32} /></span><p className="eyebrow">ThreadLabz / Store preview</p><h1>{content.title}</h1><p>{content.text}</p><Button asChild><Link href="/"><ArrowLeft /> Back to the collection</Link></Button></div>;
}
