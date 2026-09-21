import type { Metadata } from "next";

// Self-hosted UI font (no external Google Fonts network call at build or
// runtime). The code editor intentionally uses the system Menlo/Monaco
// stack instead — see globals.css — matching VS Code's own default macOS
// editor font rather than a bundled webfont.
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";

// Fonts used by the shadcn/typeset preset (.typeset-docs) — see
// globals.css. Self-hosted via @fontsource rather than next/font/google
// for the same reason as Inter above: builds shouldn't depend on being
// able to reach Google's font CDN.
import "@fontsource/oxanium/600.css";
import "@fontsource/oxanium/700.css";
import "@fontsource/instrument-sans/400.css";
import "@fontsource/instrument-sans/500.css";
import "@fontsource/instrument-sans/600.css";
import "@fontsource/jetbrains-mono/400.css";
import "@fontsource/jetbrains-mono/500.css";

import "@/styles/globals.css";
import { THEME_INIT_SCRIPT, ThemeProvider } from "@/context/theme-context";

export const metadata: Metadata = {
  title: "Playground — HTML, CSS & JS",
  description: "A live HTML, CSS and JavaScript playground.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Sets the light/dark class before paint to avoid a theme flash. */}
        {/* biome-ignore lint/security/noDangerouslySetInnerHtml: static,
            build-time constant string (THEME_INIT_SCRIPT) — no user input
            ever reaches this, and it must run before hydration to avoid a
            flash of the wrong theme. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="antialiased h-full overflow-hidden" suppressHydrationWarning>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
