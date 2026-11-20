import type { Metadata, Viewport } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "Sepehr Panel", description: "Sepehr Panel team boards", applicationName: "Sepehr Panel" };
export const viewport: Viewport = { themeColor: "#ffffff" };
export default function RootLayout({children}:{children:React.ReactNode}) {return <html lang="en"><body>{children}</body></html>}
