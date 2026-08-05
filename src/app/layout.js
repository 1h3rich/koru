import { cookies } from "next/headers";
import { Manrope } from "next/font/google";
import { Transicion } from "@/components/Transicion";
import { AvisoCookies } from "@/components/AvisoCookies";
import { SelectorVistaAdmin } from "@/components/SelectorVistaAdmin";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

export const metadata = {
  title: "Koru",
  description: "El diario digital de tu guardería o cuidadora, sin WhatsApp.",
};

export default async function RootLayout({ children }) {
  const cookieStore = await cookies();
  const tema = cookieStore.get("tema")?.value;

  return (
    <html
      lang="es"
      className={`${manrope.variable} h-full antialiased`}
      data-tema={tema === "claro" || tema === "oscuro" ? tema : undefined}
    >
      <body className="min-h-full flex flex-col font-sans">
        <Transicion>{children}</Transicion>
        <AvisoCookies />
        <SelectorVistaAdmin />
      </body>
    </html>
  );
}
