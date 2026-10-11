import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return { name: "ThreadLabz — Make Your Mark", short_name: "ThreadLabz", description: "Clothing, costumes and custom designs. Make Your Mark.", start_url: "/", display: "standalone", background_color: "#F4EDE5", theme_color: "#A74224", icons: [{ src: "/brand/monogram.png", sizes: "1254x1254", type: "image/png", purpose: "any" }] };
}
