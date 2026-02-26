import type { Metadata } from "next";
import { Space_Grotesk, IBM_Plex_Mono } from "next/font/google";

import "./globals.css";
import { AnalyticsScripts } from "@/components/analytics";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { APP_THEMES, DEFAULT_THEME, THEME_STORAGE_KEY } from "@/lib/theme";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: "NaijaAuto | Buy Cars in Nigeria",
    template: "%s | NaijaAuto",
  },
  description:
    "Find verified cars, SUVs, and pickups across Nigeria. Dealers and private sellers. Fast contact via phone and WhatsApp.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    title: "NaijaAuto",
    description: "Nigeria-focused auto marketplace for verified listings.",
    url: appUrl,
    siteName: "NaijaAuto",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const allowedThemes = APP_THEMES.map((theme) => theme.id);
  const themeBootstrapScript = `(() => {
    try {
      const storedTheme = window.localStorage.getItem("${THEME_STORAGE_KEY}");
      const allowedThemes = ${JSON.stringify(allowedThemes)};
      if (storedTheme && allowedThemes.includes(storedTheme)) {
        document.documentElement.dataset.theme = storedTheme;
      }
    } catch {}
  })();`;

  return (
    <html lang="en" data-theme={DEFAULT_THEME} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrapScript }} />
      </head>
      <body className={`${spaceGrotesk.variable} ${ibmPlexMono.variable}`}>
        <AnalyticsScripts />
        <ThemeSwitcher />
        {children}
      </body>
    </html>
  );
}
