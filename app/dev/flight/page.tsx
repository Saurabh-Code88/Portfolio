import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Home from "@/app/page";
import FlightPreview from "@/app/dev/flight/FlightPreview";
export const metadata: Metadata = {
  title: "Cinematic flight preview",
  robots: { index: false, follow: false },
};
export default function FlightPreviewRoute() {
  if (process.env.NODE_ENV !== "development") notFound();
  return (
    <>
      <FlightPreview />
      <Home />
    </>
  );
}
