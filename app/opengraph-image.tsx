import { ImageResponse } from "next/og";
import { profile } from "@/content/profile";

export const alt = `An original amber dragon scroll for ${profile.name}'s portfolio`;
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
          background: "#0d0500",
          color: "#f3e3c8",
          fontFamily: "Georgia, serif",
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
          <rect x="35" y="32" width="260" height="350" rx="18" fill="#1a0a00" stroke="#c47a20" strokeWidth="5" />
          <path d="M54 58h222M54 357h222" stroke="#7a3d00" strokeWidth="4" />
          <path d="M52 37c-18 8-18 34 0 42h226c18-8 18-34 0-42-76-11-150-11-226 0ZM52 378c-18 8-18 34 0 42h226c18-8 18-34 0-42-76 11-150 11-226 0Z" fill="#2a1200" stroke="#c47a20" strokeWidth="4" />
          <path d="M112 291c36-28 25-76 78-87 36-8 51-34 31-51-16-14-45 2-35 21 8 15 32 7 24-6m-95 125c24-17 47-10 62-28 14-17 34-12 47-2m-20-109c-8-24 7-42 25-45 8-24 38-26 48-2 25 0 34 26 18 41-4 17-23 23-38 14l-18 11-17-12m-4-42c-13-15-8-32 5-42 5 14 12 19 21 22m19-1c10-14 25-16 35-8-12 4-17 12-19 23" fill="none" stroke="#e8a045" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="245" cy="160" r="3" fill="#e8a045" />
          <path d="M93 124c17-19 37-10 43 5-17 13-31 12-43-5Zm21-5c0 9 4 16 11 22" fill="none" stroke="#c47a20" strokeWidth="3" />
        </svg>
      </div>
    ),
    { ...size },
  );
}
