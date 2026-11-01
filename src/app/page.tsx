import { Hero } from "@/components/store/hero";
import { LandingIntro } from "@/features/landing-intro";
import introManifest from "@/features/landing-intro/generated/manifest.json";
import { NoScriptHome } from "@/features/landing-intro/components/NoScriptHome";
import { Categories, FestiveBanner, Festivals, NewArrivals, Newsletter, TrendingCostumes, TrustStrip } from "@/components/store/home-sections";

export default function Home() {
  return <><NoScriptHome /><LandingIntro asset={introManifest.asset} /><div className="page-width home"><Hero /><TrustStrip /><Categories /><NewArrivals /><FestiveBanner /><Festivals /><TrendingCostumes /><Newsletter /></div></>;
}
