import "./globals.css";

export const metadata = {
  title: "YouKar Payment",
  description: "Pay and submit your YouTube song request for karaoke processing.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
