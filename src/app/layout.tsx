import type { Metadata, Viewport } from "next";
import { Inter, Outfit } from "next/font/google";
import { Header } from "@/components/store/header";
import { Footer } from "@/components/store/footer";
import { BottomNav } from "@/components/store/bottom-nav";
import { LandingIntro, type IntroManifest } from "@/features/landing-intro";
import introManifest from "@/features/landing-intro/generated/manifest.json";
import "./globals.css";

const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit", display: "swap" });
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  title: { default: "ThreadLabz — Make Your Mark", template: "%s | ThreadLabz" },
  description: "Everyday fits, festive favourites, and a little more you. Discover ThreadLabz clothing, costumes and custom designs. Made for India.",
  applicationName: "ThreadLabz",
  robots: { index: false, follow: false }, // Enable only when the real catalogue and policies are ready.
  icons: { icon: "/brand/monogram.png", apple: "/brand/monogram.png" },
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#F4EDE5" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en-IN" suppressHydrationWarning><body className={`${outfit.variable} ${inter.variable}`}><LandingIntro manifest={introManifest as IntroManifest} /><a className="skip-link" href="#main-content">Skip to content</a><Header /><main id="main-content" tabIndex={-1}>{children}</main><Footer /><BottomNav /></body></html>;
}
