import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "NOIR VAULT — Cine premium", description: "Un universo de historias para descubrir." };
export default function RootLayout({children}:{children:React.ReactNode}) { return <html lang="es"><body>{children}</body></html>; }
