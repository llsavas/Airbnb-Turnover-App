import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "AirComplex Cleaning 🧼",
    short_name: "AirComplex",
    description: "Gestão de limpezas dos imóveis",
    start_url: "/",
    display: "standalone",
    background_color: "#121214",
    theme_color: "#121214",
    lang: "pt-BR",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
