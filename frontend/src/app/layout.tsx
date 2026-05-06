import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "EuroGrant AI | Elite Intelligence for EU Public Grants",
  description: "Automate your EU grant search and public tender proposals with EuroGrant AI. Leverage RAG-powered intelligence to identify and win high-value opportunities.",
  keywords: ["EU Grants", "Public Tenders", "Grant Writing AI", "EuroGrant", "EU Funding", "Innovation Grants"],
  authors: [{ name: "EuroGrant Team" }],
  creator: "EuroGrant AI",
  publisher: "EuroGrant AI",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || "https://eurogrant.ai"),
  openGraph: {
    title: "EuroGrant AI | Elite Intelligence for EU Public Grants",
    description: "Automate your EU grant search and public tender proposals with EuroGrant AI.",
    url: "https://eurogrant.ai",
    siteName: "EuroGrant AI",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "EuroGrant AI | Elite Intelligence for EU Public Grants",
    description: "Automate your EU grant search and public tender proposals with EuroGrant AI.",
    creator: "@eurogrant_ai",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="font-body-md">
        <AuthProvider>
          {children}
        </AuthProvider>
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}
