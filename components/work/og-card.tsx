import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

/*
 * Open Graph cards (1200×630 PNG), generated at build time by the opengraph-image routes.
 * Midnight navy, a faint blueprint grid, electric blue + cyan accents. Set in the site's own fonts, Sora and DM Sans
 * (static TTF cuts, SIL OFL, in assets/og-fonts with their licences; next/og's built-in default font is not used).
 * Nothing is fetched. Hex values mirror the dark theme tokens in app/globals.css (CSS variables don't exist here).
 */

const fontFile = (name: string) => readFile(join(process.cwd(), "assets", "og-fonts", name));

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = "image/png";

const C = {
  bg: "#050914",
  surface: "#0c1630",
  grid: "rgba(77, 141, 255, 0.10)",
  line: "rgba(140, 170, 255, 0.22)",
  text: "#e9efff",
  text2: "#b6c2df",
  muted: "#8f9dc0",
  accent: "#4d8dff",
  accent2: "#2ee6ff",
};

const W = OG_SIZE.width;
const H = OG_SIZE.height;
const CELL = 56;
const PAD = 72;

function titleSize(title: string): number {
  const n = title.length;
  if (n <= 14) return 120;
  if (n <= 24) return 96;
  if (n <= 36) return 78;
  return 64;
}

export type OgCardInput = {
  /** Mono label at the top, e.g. "03 / Selected work". */
  eyebrow: string;
  title: string;
  /** One or two lines under the title. */
  lines?: string[];
  footer: string;
};

export async function renderOgCard({ eyebrow, title, lines = [], footer }: OgCardInput) {
  const [sora700, sora800, dm400, dm500] = await Promise.all([
    fontFile("Sora-700.ttf"),
    fontFile("Sora-800.ttf"),
    fontFile("DMSans-400.ttf"),
    fontFile("DMSans-500.ttf"),
  ]);
  const cols = Math.floor(W / CELL);
  const rows = Math.floor(H / CELL);
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: PAD,
          backgroundColor: C.bg,
          position: "relative",
          color: C.text,
          fontFamily: "DM Sans",
        }}
      >
        {Array.from({ length: cols }, (_, i) => (
          <div
            key={`v${i}`}
            style={{ position: "absolute", top: 0, bottom: 0, left: (i + 1) * CELL, width: 1, backgroundColor: C.grid }}
          />
        ))}
        {Array.from({ length: rows }, (_, i) => (
          <div
            key={`h${i}`}
            style={{ position: "absolute", left: 0, right: 0, top: (i + 1) * CELL, height: 1, backgroundColor: C.grid }}
          />
        ))}
        {/* Accent rule down the left edge: blue fading into cyan. */}
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: 10,
            backgroundImage: `linear-gradient(180deg, ${C.accent}, ${C.accent2})`,
          }}
        />

        <div style={{ display: "flex", alignItems: "center", fontSize: 26, fontWeight: 500, letterSpacing: 4, color: C.accent2 }}>
          <div style={{ display: "flex", width: 14, height: 14, borderRadius: 7, backgroundColor: C.accent2, marginRight: 18 }} />
          <div style={{ display: "flex", textTransform: "uppercase" }}>{eyebrow}</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              fontFamily: "Sora",
              fontSize: titleSize(title),
              fontWeight: 800,
              lineHeight: 1.04,
              letterSpacing: -2,
              color: C.text,
              maxWidth: W - PAD * 2,
            }}
          >
            {title}
          </div>
          {lines.map((line, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                marginTop: i === 0 ? 28 : 10,
                fontSize: i === 0 ? 40 : 30,
                color: i === 0 ? C.accent : C.text2,
                lineHeight: 1.25,
              }}
            >
              {line}
            </div>
          ))}
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            paddingTop: 22,
            borderTop: `1px solid ${C.line}`,
            fontSize: 24,
            color: C.muted,
          }}
        >
          <div style={{ display: "flex" }}>{footer}</div>
          <div style={{ display: "flex", width: 120, height: 4, backgroundColor: C.accent }} />
        </div>
      </div>
    ),
    {
      ...OG_SIZE,
      fonts: [
        { name: "Sora", data: sora700, weight: 700, style: "normal" },
        { name: "Sora", data: sora800, weight: 800, style: "normal" },
        { name: "DM Sans", data: dm400, weight: 400, style: "normal" },
        { name: "DM Sans", data: dm500, weight: 500, style: "normal" },
      ],
    },
  );
}
