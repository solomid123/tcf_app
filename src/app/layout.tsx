import type { Metadata } from "next";
import { Questrial } from "next/font/google";
import { themeScript } from "@/lib/theme";
import "./globals.css";

const questrial = Questrial({
  variable: "--font-questrial",
  weight: "400",
  subsets: ["latin", "latin-ext"],
});

export const metadata: Metadata = {
  title: "TCF Prep — Practice & Mock Exams for TCF Canada",
  description:
    "Prepare for TCF Canada with realistic timed mock exams and targeted practice across all four skills.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // suppressHydrationWarning: the inline script sets data-theme before React hydrates.
    <html lang="en" className={`${questrial.variable} h-full`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
