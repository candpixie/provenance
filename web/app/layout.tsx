import type { Metadata } from "next";
import "./globals.css";

const title = "Provenance — who built this site?";
const description =
  "Paste a URL. Find out which AI agent or builder made it: Lovable, v0, Bolt, Framer, Webflow, Wix and more. Markers prove, stacks suggest.";

export const metadata: Metadata = {
  title,
  description,
  openGraph: { title, description, type: "website" },
  twitter: { card: "summary_large_image", title, description },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
