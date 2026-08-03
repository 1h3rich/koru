import { Manrope } from "next/font/google";
import { Transicion } from "@/components/Transicion";
import { AvisoCookies } from "@/components/AvisoCookies";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

export const metadata = {
  title: "Koru",
  description: "El diario digital de tu guardería o cuidadora, sin WhatsApp.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es" className={`${manrope.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">
        <Transicion>{children}</Transicion>
        <AvisoCookies />
      </body>
    </html>
  );
}
