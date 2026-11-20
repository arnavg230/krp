import type { Metadata } from "next";
import "../styles.css";

export const metadata: Metadata = {
  title: "KRP Dry Fruits — Goodness, thoughtfully picked",
  description: "Thoughtfully picked dry fruits for slow mornings, little cravings, and the people you love.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><head><link rel="preconnect" href="https://fonts.googleapis.com"/><link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous"/><link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Playfair+Display:wght@500;600;700&display=swap" rel="stylesheet"/></head><body>{children}</body></html>;
}
