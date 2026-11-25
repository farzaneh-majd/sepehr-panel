import type { Metadata, Viewport } from "next";
import "./globals.css";
import { MantineProvider } from "@mantine/core";
import { theme } from "./theme";
import QueryProvider from "./providers/QueryProvider";
import LayoutClient from "./layoutClient";

export const metadata: Metadata = { title: { default: "Sepehr Panel", template: "%s | Sepehr Panel" }, description: "Sepehr Panel boards and inventory", applicationName: "Sepehr Panel", appleWebApp: { capable: true, title: "Sepehr Panel", statusBarStyle: "default" } };
export const viewport: Viewport = { themeColor: "#ffffff" };
export default function RootLayout({children}:{children:React.ReactNode}) {
  return <html lang="en"><body><MantineProvider theme={theme} withCssVariables><QueryProvider><LayoutClient>{children}</LayoutClient></QueryProvider></MantineProvider></body></html>
}
