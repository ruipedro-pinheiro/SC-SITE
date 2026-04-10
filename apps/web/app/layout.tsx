import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Orbitron } from "next/font/google";
import type { ReactNode } from "react";
import "./globals.css";

/* next/font local-host the three families and expose CSS variables that
 * tokens.css consumes via --font-sans / --font-mono / --font-display. */
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const orbitron = Orbitron({
  variable: "--font-orbitron",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800", "900"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "sc-site",
  description: "Star Citizen ship catalog as a 3D hangar bay.",
  icons: { icon: "/favicon.svg" },
};

interface RootLayoutProps {
  children: ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    // suppressHydrationWarning is the Next.js-sanctioned escape hatch for the
    // common case where a browser extension injects attributes / classes onto
    // <html> before React hydrates — it silences the warning ONLY on this
    // single node (not descendants), so real app-level mismatches still error.
    <html
      lang="en"
      className={`${inter.variable} ${jetbrainsMono.variable} ${orbitron.variable}`}
      suppressHydrationWarning
    >
      <body className="bg-base text-text font-sans antialiased">{children}</body>
    </html>
  );
}
