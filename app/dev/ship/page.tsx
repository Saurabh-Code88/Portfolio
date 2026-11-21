import type { Metadata } from "next";
import ShipPreviewPage from "@/app/dev/ship/ShipPreviewPage";

export const metadata: Metadata = {
  title: "Ship preview",
  robots: { index: false, follow: false },
};

export default function ShipPreviewRoute() {
  return <ShipPreviewPage />;
}
