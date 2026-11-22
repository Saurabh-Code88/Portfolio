import { ImageResponse } from "next/og";
import { profile } from "@/content/profile";

export const alt = `Original orbital artwork with a small ship for ${profile.name}'s portfolio`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "58px 76px",
          background: "#05070a",
          color: "#f3e3c8",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <div style={{ display: "flex", width: 670, flexDirection: "column" }}>
          <div style={{ color: "#e8a045", fontSize: 26 }}>{profile.name}</div>
          <div style={{ marginTop: 40, color: "#e8a045", fontSize: 64, lineHeight: 1.12 }}>
            {profile.headline}
          </div>
          <div style={{ display: "flex", marginTop: 24, color: "#f3e3c8", fontFamily: "Arial, sans-serif", fontSize: 24 }}>
            {profile.role} · {profile.location}
          </div>
        </div>
        <svg width="330" height="420" viewBox="0 0 330 420" role="img" aria-label={alt}>
          <circle cx="168" cy="210" r="150" fill="none" stroke="#c47a20" strokeWidth="3" />
          <ellipse cx="168" cy="210" rx="122" ry="150" fill="none" stroke="#6cb8ff" strokeOpacity=".5" strokeWidth="2" transform="rotate(34 168 210)" />
          <circle cx="57" cy="132" r="7" fill="#e8a045" />
          <circle cx="259" cy="94" r="4" fill="#6cb8ff" />
          <path d="m97 239 31-5 24-46 71 5 47 38 18 5v26H97z" fill="#182635" stroke="#e8a045" strokeLinejoin="round" strokeWidth="5" />
          <path d="m157 190 25-39 28 42m-59 40 37 5 25-37 38 5" fill="none" stroke="#e8a045" strokeLinecap="round" strokeLinejoin="round" strokeWidth="5" />
          <path d="m116 259 8 20m147-20-8 20" stroke="#6cb8ff" strokeLinecap="round" strokeWidth="4" />
          <path d="M149 216h54" stroke="#6cb8ff" strokeWidth="3" />
        </svg>
      </div>
    ),
    { ...size },
  );
}
