import type { Metadata } from "next";
import { IBM_Plex_Sans_Thai } from "next/font/google";
import "../globals.css";
import { LangProvider } from "@/i18n/LangProvider";
import { AuthProvider } from "@/components/AuthProvider";
import { AdminProvider } from "@/components/AdminProvider";
import { FavoritesProvider } from "@/components/FavoritesProvider";
import { SearchProvider } from "@/components/SearchProvider";
import { CafesProvider } from "@/components/CafesProvider";
import { getCafes } from "@/lib/cafes-server";
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
  openGraph: {
    type: "website",
    siteName: "Thiao Nai Dee",
    locale: "th_TH",
    alternateLocale: ["en_US"],
  },
  twitter: {
    card: "summary_large_image",
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cafes = await getCafes();
  return (
    <html lang="th" className={`${plexThai.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <LangProvider>
          <AuthProvider>
            <AdminProvider>
              <FavoritesProvider>
                <SearchProvider>
                  <CafesProvider initialCafes={cafes}>
                    <Navbar />
                    <main className="flex-1">{children}</main>
                    <Footer />
                  </CafesProvider>
                </SearchProvider>
              </FavoritesProvider>
            </AdminProvider>
          </AuthProvider>
        </LangProvider>
      </body>
    </html>
  );
}
