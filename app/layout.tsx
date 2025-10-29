import type { Metadata } from "next";
import { Inter, Source_Code_Pro } from "next/font/google";
import { SafeArea } from "@coinbase/onchainkit/minikit";
import { minikitConfig } from "../minikit.config";
import { RootProvider } from "./rootProvider";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const { miniapp } = minikitConfig;
  const canonicalUrl = miniapp.canonicalDomain
    ? `https://${miniapp.canonicalDomain}`
    : miniapp.homeUrl;
  const metadataBase = canonicalUrl.startsWith("http")
    ? new URL(canonicalUrl)
    : undefined;
  const title = miniapp.ogTitle || `${miniapp.name} • Live Odds & Stream`;
  const description = miniapp.ogDescription || miniapp.description;
  const imageUrl = miniapp.ogImageUrl || miniapp.heroImageUrl || miniapp.iconUrl;

  const frameButtons = [
    {
      title: "Watch live stream",
      target: canonicalUrl,
    },
    {
      title: "View live odds",
      target: `${canonicalUrl}#odds`,
    },
  ];

  const frameMetadata = frameButtons.reduce<Record<string, string>>(
    (acc, button, index) => {
      const ordinal = index + 1;
      acc[`fc:frame:button:${ordinal}`] = button.title;
      acc[`fc:frame:button:${ordinal}:action`] = "launch_frame";
      acc[`fc:frame:button:${ordinal}:target`] = button.target;
      return acc;
    },
    {
      "fc:frame": "vNext",
      "fc:frame:image": imageUrl,
      "fc:frame:post_url": canonicalUrl,
      "fc:frame:state": JSON.stringify({ view: "live" }),
    }
  );

  return {
    metadataBase,
    alternates: {
      canonical: canonicalUrl,
    },
    title,
    description,
    openGraph: {
      type: "website",
      url: canonicalUrl,
      title,
      description,
      images: imageUrl
        ? [
            {
              url: imageUrl,
              width: 1200,
              height: 630,
              alt: `${miniapp.name} hero`,
            },
          ]
        : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: imageUrl ? [imageUrl] : undefined,
    },
    other: frameMetadata,
  };
}

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const sourceCodePro = Source_Code_Pro({
  variable: "--font-source-code-pro",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <RootProvider>
      <html lang="en">
        <body className={`${inter.variable} ${sourceCodePro.variable}`}>
          <SafeArea>{children}</SafeArea>
        </body>
      </html>
    </RootProvider>
  );
}
