import { Suspense } from "react";
import { Hero } from "@/components/store/hero";
import {
  Categories,
  FestiveBanner,
  Festivals,
  NewArrivals,
  NewArrivalsFallback,
  Newsletter,
  TrendingCostumes,
  TrustStrip,
} from "@/components/store/home-sections";

// When JavaScript is disabled, Next's root loading boundary leaves the streamed
// homepage inside a hidden sibling of <main>. Expose it only in noscript mode.
const noScriptHomeCss = `
  body:has(.home) { display: flex; flex-direction: column; }
  @layer base { body > div[hidden]:has(> .home) { display: block !important; order: 1; } }
  body:has(.home) > footer, body:has(.home) > .bottom-nav { order: 2; }
  body:has(.home) #main-content > .status-page { display: none; }
`;

export default function Home() {
  return (
    <>
      <noscript><style>{noScriptHomeCss}</style></noscript>
      <div className="page-width home">
        <Hero />
        <TrustStrip />
        <Categories />
        <Suspense fallback={<NewArrivalsFallback />}>
          <NewArrivals />
        </Suspense>
        <FestiveBanner />
        <Festivals />
        <TrendingCostumes />
        <Newsletter />
      </div>
    </>
  );
}
