import { Hero } from "@/components/store/hero";
import { Categories, FestiveBanner, Festivals, NewArrivals, Newsletter, TrendingCostumes, TrustStrip } from "@/components/store/home-sections";

export default function Home() {
  return <div className="page-width home"><Hero /><TrustStrip /><Categories /><NewArrivals /><FestiveBanner /><Festivals /><TrendingCostumes /><Newsletter /></div>;
}
