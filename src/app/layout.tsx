// src/app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header"; // Certifique-se que o caminho está correto
import Footer from "@/components/Footer"; // Certifique-se que o caminho está correto

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Echo - Your English Teacher AI",
  description: "Refine your English with your personal AI English teacher.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      {/* ADICIONE ESTAS CLASSES AO BODY */}
      <body className={`${inter.className} flex flex-col min-h-screen`}>
        <Header />
        {/* ADICIONE A CLASSE flex-grow AO MAIN */}
        <main className="flex-grow">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}