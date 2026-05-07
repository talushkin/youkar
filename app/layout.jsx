import "./globals.css";

export const metadata = {
  metadataBase: new URL("https://youkar.vercel.app"),
  title: {
    default: "קריוקי מכל יוטיוב - יוקאר | Karaoke from any YouTube - YouKar",
    template: "%s | YouKar",
  },
  description:
    "קריוקי מכל יוטיוב - יוקאר. Karaoke from any YouTube - YouKar. Generate karaoke and vocals tracks from YouTube songs.",
  keywords: [
    "קריוקי מכל יוטיוב - יוקאר",
    "Karaoke from any YouTube - YouKar",
    "YouTube karaoke",
    "karaoke maker",
    "vocals extraction",
    "YouKar",
  ],
  openGraph: {
    title: "קריוקי מכל יוטיוב - יוקאר | Karaoke from any YouTube - YouKar",
    description:
      "Create karaoke and vocals tracks from YouTube songs with YouKar.",
    type: "website",
    siteName: "YouKar",
    locale: "he_IL",
    images: [
      {
        url: "/youkar-logo.png",
        width: 1200,
        height: 630,
        alt: "YouKar logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "קריוקי מכל יוטיוב - יוקאר | Karaoke from any YouTube - YouKar",
    description:
      "Create karaoke and vocals tracks from YouTube songs with YouKar.",
    images: ["/youkar-logo.png"],
  },
  icons: {
    icon: "/youkar-logo.png",
    apple: "/youkar-logo.png",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
