import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NOIR VAULT — The Cinema Club",
  description: "Una selección de cine independiente, animación de autor y obras abiertas para descubrir.",
  applicationName: "NOIR VAULT",
  metadataBase: new URL("https://noir-vault-cruzgalindocamiloandres574-8998.vercel.app"),
  openGraph: {
    title: "NOIR VAULT — The Cinema Club",
    description: "Una nueva forma de descubrir historias extraordinarias.",
    siteName: "NOIR VAULT",
    type: "website",
    locale: "es_CO",
  },
  icons: { icon: "/noir-mark.svg", shortcut: "/noir-mark.svg" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#080909",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="es"><body>{children}</body></html>;
}
