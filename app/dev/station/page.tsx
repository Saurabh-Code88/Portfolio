import type { Metadata } from "next";
import StationPreviewPage from "@/app/dev/station/StationPreviewPage";

export const metadata: Metadata = {
  title: "Station preview",
  robots: { index: false, follow: false },
};

export default function StationPreviewRoute() {
  return <StationPreviewPage />;
}
