import type { Metadata } from "next";
import { IBM_Plex_Sans_Thai } from "next/font/google";
import "./globals.css";
import { LangProvider } from "@/i18n/LangProvider";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const plexThai = IBM_Plex_Sans_Thai({
  subsets: ["latin", "thai"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-plex-thai",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: {
    default: "เที่ยวไหนดี | Thiao Nai Dee — คาเฟ่เมืองพะเยา",
    template: "%s | Thiao Nai Dee",
  },
  description:
    "รวมคาเฟ่น่านั่งในเมืองพะเยา ทั้งริมกว๊านถึงโซนมหาวิทยาลัย พร้อมพิกัด เวลาเปิด-ปิด เมนูแนะนำ และรีวิว A curated guide to cafes in Phayao from the lakefront to the university area, with map, reviews and filters.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="th" className={`${plexThai.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <LangProvider>
          <Navbar />
          <main className="flex-1">{children}</main>
          <Footer />
        </LangProvider>
      </body>
    </html>
  );
}
