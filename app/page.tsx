import type { Metadata } from "next";
import LandingPage from "@/components/LandingPage";
import "./landing.css";

export const metadata: Metadata = {
  title: "Your experience. A sharper story.",
  description:
    "Turn your career experience into a focused, ATS-friendly resume. Build your master profile, find your fit, and export polished LaTeX with Forma.",
};

export default function HomePage() {
  return <LandingPage />;
}
