import { type ReactNode } from "react";
import { Inter } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata = {
  title: "FB Automation Dashboard",
  description: "Manage Facebook news automation pipeline.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} antialiased dark`}>
      <body className="flex h-screen overflow-hidden bg-slate-900 text-slate-100">
        {/* Sidebar Component */}
        <Sidebar className="w-64 border-r border-slate-800 bg-slate-900/50 backdrop-blur-xl hidden md:block" />
        
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative z-0">
          {/* Header */}
          <Header />
          
          {/* Main Content Area */}
          <main className="flex-1 overflow-y-auto p-4 md:p-8">
            <div className="max-w-7xl mx-auto">
              {children}
            </div>
          </main>
        </div>
      </body>
    </html>
  );
}
