"use client";

import { WorksWheel, type WorksWheelItem } from "@/components/ui/works-wheel";

const photo = (id: string) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1000&q=80`;

const WORKS: WorksWheelItem[] = [
  { title: "Everyday Essentials", image: photo("photo-1521572267360-ee0c2909d518"), href: "/shop/t-shirts" },
  { title: "Oversized Fits", image: photo("photo-1576566588028-4147f3842f27"), href: "/shop/oversized" },
  { title: "Layer Up", image: photo("photo-1556905055-8f358a7a47b2"), href: "/shop/hoodies" },
  { title: "Off Duty", image: photo("photo-1620799140408-edc6dcb6d633"), href: "/shop/sweatshirts" },
  { title: "Fresh Shirts", image: photo("photo-1596755094514-f87e34085b2c"), href: "/shop/shirts" },
  { title: "Denim Days", image: photo("photo-1542272604-787c3835535d"), href: "/shop/jeans" },
  { title: "The Edit", image: photo("photo-1441986300917-64674bd600d8"), href: "/shop" },
  { title: "Color Stories", image: photo("photo-1490481651871-ab68de25d43d"), href: "/shop" },
  { title: "Make It Yours", image: photo("photo-1489987707025-afc232f7ea0f"), href: "/design-studio" },
];

export default function WorksWheelDemo() {
  return (
    <div className="bg-background text-foreground h-[min(80svh,52rem)] min-h-[32rem] w-full">
      <WorksWheel items={WORKS} label="Threads '26" action="Explore" />
    </div>
  );
}
