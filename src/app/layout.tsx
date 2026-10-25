import type { Metadata, Viewport } from "next";
import "@fontsource-variable/archivo/wdth.css"; // substitut OFL de Helvetica Now Extended
import "@fontsource-variable/jetbrains-mono";
import "./globals.css";
import { AppShell } from "@/components/layout/AppShell";

export const metadata: Metadata = {
  title: "SKYLINE — Pre-boarding",
  description: "SKYLINE IBIZA 2027 — l'app des participants. Version de démonstration.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "SKYLINE", statusBarStyle: "black-translucent" },
  icons: { icon: "/icon-192.png", apple: "/icon-192.png" },
};

export const viewport: Viewport = {
  themeColor: "#080A0D",
  colorScheme: "dark",
  viewportFit: "cover", // active les safe areas iPhone
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
