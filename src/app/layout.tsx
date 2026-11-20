import type { Metadata, Viewport } from "next";
import "@fontsource-variable/inter";
import "@fontsource-variable/space-grotesk";
import "@fontsource-variable/jetbrains-mono";
import "@/styles/globals.css";
import { Particles } from "@/components/layout/Particles";

export const metadata: Metadata = {
  title: { default: "SI ACOUSTIC | R&D COMMAND CENTRE", template: "%s · SI Acoustic R&D" },
  description: "Private R&D productivity and project command centre for SI Acoustic Sdn Bhd.",
  robots: { index: false, follow: false },
  icons: { icon: "/icon.svg" },
};

export const viewport: Viewport = { themeColor: "#050B17", width: "device-width", initialScale: 1, viewportFit: "cover" };

// Applies the saved low-motion preference before first paint (avoids animation flash on TVs).
const BOOT = `try{var q=new URLSearchParams(location.search).get('motion');var m=q||localStorage.getItem('sia-motion');if(q)localStorage.setItem('sia-motion',q);if(m==='low')document.documentElement.dataset.motion='low';}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: BOOT }} />
      </head>
      <body>
        <div className="hud-backdrop" aria-hidden />
        <Particles />
        {children}
      </body>
    </html>
  );
}
