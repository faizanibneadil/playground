import type { Metadata } from "next";

// Self-hosted UI font (no external Google Fonts network call at build or
// runtime). The code editor intentionally uses the system Menlo/Monaco
// stack instead — see globals.css — matching VS Code's own default macOS
// editor font rather than a bundled webfont.
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";

import "@/styles/globals.css";
import { ThemeProvider, THEME_INIT_SCRIPT } from "@/context/theme-context";

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
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="antialiased h-full overflow-hidden" suppressHydrationWarning>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
