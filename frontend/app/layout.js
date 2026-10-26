import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "PixelForge",
  description: "Cloud-native image design platform",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={inter.className}>
      <body className="min-h-screen bg-page text-text antialiased text-body">
        {children}
      </body>
    </html>
  );
}
