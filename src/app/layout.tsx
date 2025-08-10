import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
// Import layout components
import Header from "@/components/Header"; // Make sure the path is correct
import Footer from "@/components/Footer"; // Make sure the path is correct

// Initialize Inter font with Latin subset
const inter = Inter({ subsets: ["latin"] });

/**
 * Metadata for the application
 * Used for SEO and browser tab information
 */
export const metadata: Metadata = {
  title: "Echo - Your English Teacher AI",
  description: "Refine your English with your personal AI English teacher.",
};

/**
 * RootLayout Component
 * The main layout wrapper for all pages in the application
 * 
 * @param children - The page content to be rendered
 * @returns The complete page structure with header, main content and footer
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      {/* 
        Body with flex layout to ensure footer stays at bottom 
        - inter.className applies the font
        - flex flex-col creates a vertical flex layout
        - min-h-screen ensures at least full viewport height
      */}
      <body className={`${inter.className} flex flex-col min-h-screen`}>
        {/* Header component - appears at the top of all pages */}
        <Header />
        
        {/*
          Main content area
          - flex-grow allows this section to expand and push footer down
          - Contains all page-specific content via children prop
        */}
        <main className="flex-grow">
          {children}
        </main>
        
        {/* Footer component - appears at the bottom of all pages */}
        <Footer />
      </body>
    </html>
  );
}