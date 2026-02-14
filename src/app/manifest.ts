import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "WorthIt",
    short_name: "WorthIt",
    description: "Personal finance tracker with smart analysis.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#6C5CE7", 
    icons: [
      {
        src: "/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
