import { Backdrop } from "@/components/Backdrop";
import { Navbar } from "@/components/Navbar";
import { Hero } from "@/components/landing/Hero";
import { Cta, Faq, Footer, Modes, Scoring, Skills } from "@/components/landing/Sections";

export default function Home() {
  return (
    <>
      <Backdrop />
      <Navbar />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4">
        <Hero />
        <Skills />
        <Modes />
        <Scoring />
        <Faq />
        <Cta />
      </main>
      <Footer />
    </>
  );
}
