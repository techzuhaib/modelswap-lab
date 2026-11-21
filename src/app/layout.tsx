import "./globals.css";
export const metadata = {
  title: "ModelSwap Lab",
  description:
    "Know whether your next AI model upgrade is actually better before shipping it.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
