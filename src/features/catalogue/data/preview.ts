// Layout fixtures only. Production catalogue records will come from Supabase.
export const categories = [
  { name: "Men", slug: "men", detail: "Everyday, elevated", image: "/images/previews/men-3.jpg" },
  { name: "Women", slug: "women", detail: "Your kind of statement", image: "/images/placeholders/women.svg" },
  { name: "Kids", slug: "kids", detail: "Little fits. Big energy.", image: "/images/placeholders/kids.svg" },
  { name: "Accessories", slug: "accessories", detail: "The finishing touch", image: "/images/placeholders/accessories.svg" },
];

export const previews = [
  { name: "The Lavender Edit", category: "Printed shirts", image: "/images/previews/men-1.jpg" },
  { name: "Off-duty Essentials", category: "Everyday polos", image: "/images/previews/men-4.jpg" },
  { name: "A Little Wild", category: "Statement prints", image: "/images/previews/men-5.jpg" },
  { name: "After Hours", category: "Layering favourites", image: "/images/previews/men-13.jpg" },
];

export const festivals = [
  ["Diwali", "🪔"], ["Holi", "🎨"], ["Navratri", "💃"], ["Durga Puja", "🌺"],
  ["Dussehra", "🏹"], ["Ganesh Chaturthi", "🐘"], ["Janmashtami", "🦚"], ["Raksha Bandhan", "🧵"],
  ["Independence Day", "🇮🇳"], ["Onam", "🌴"], ["Pongal", "🌾"], ["Makar Sankranti", "🪁"],
  ["Lohri", "🔥"], ["Baisakhi", "🌻"], ["Maha Shivratri", "🔱"], ["Eid", "🌙"],
  ["Christmas", "🎄"], ["Children’s Day", "🎈"], ["Teachers’ Day", "📚"], ["Republic Day", "🇮🇳"],
] as const;

export function festivalSlug(name: string) {
  return name.toLowerCase().replace(/[’']/g, "").replace(/\s+/g, "-");
}
