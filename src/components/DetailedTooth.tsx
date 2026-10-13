import { useId } from "react";
import { getStatusMeta, type ToothStatus } from "@/lib/patients-store";
type Cat = "molar" | "premolar" | "canine" | "incisor";

function categoryOf(n: number): Cat {
  const t = n % 10;
  if (t >= 6) return "molar";
  if (t >= 4) return "premolar";
  if (t === 3) return "canine";
  return "incisor";
}

// ─── Anatomy constants ──────────────────────────────────────────────────────
// viewBox 0 0 40 80
// Crown: y 4–37   |   Gum band: y 33–41   |   Roots: y 37–77
const GUM_Y = 37;

const SHAPES: Record<Cat, { crown: string; roots: string[] }> = {
  incisor: {
    crown: `M13 ${GUM_Y} L13 15 Q13 7 20 7 Q27 7 27 15 L27 ${GUM_Y} Z`,
    roots: [`M14.5 ${GUM_Y} C14 52 16.5 71 20 75 C23.5 71 25.5 52 25.5 ${GUM_Y} Z`],
  },
  canine: {
    crown: `M11 ${GUM_Y} C11.5 30 14.5 18 19 8 Q20 5 21 8 C25.5 18 28.5 30 29 ${GUM_Y} Z`,
    roots: [`M13 ${GUM_Y} C12 55 15.5 73 20 77 C24.5 73 28 55 27 ${GUM_Y} Z`],
  },
  premolar: {
    crown: `M9.5 ${GUM_Y} C9.5 26 13 11.5 20 10 C27 11.5 30.5 26 30.5 ${GUM_Y} L27.5 38.5 L20 ${GUM_Y} L12.5 38.5 Z`,
    roots: [
      `M12 38.5 C10.5 53 13 70 16.5 74.5 C18 75.5 18 70 17.5 59 L16 38.5 Z`,
      `M28 38.5 C29.5 53 27 70 23.5 74.5 C22 75.5 22 70 22.5 59 L24 38.5 Z`,
    ],
  },
  molar: {
    crown: `M5.5 ${GUM_Y} C5.5 24 9 10.5 16.5 7.5 Q20 5 23.5 7.5 C31 10.5 34.5 24 34.5 ${GUM_Y} L31 38.5 L26 ${GUM_Y} L20 38.5 L14 ${GUM_Y} L9 38.5 Z`,
    roots: [
      `M8.5 38.5 L9.5 42 C8 56 11 70 14 74.5 C15.5 75.5 15.5 70 15 60 L13.5 42 Z`,
      `M31.5 38.5 L30.5 42 C32 56 29 70 26 74.5 C24.5 75.5 24.5 70 25 60 L26.5 42 Z`,
      `M18.5 38 L19 42 L21 42 L21.5 38 L21 58 L19 58 Z`,
    ],
  },
};

// ─── Tooth SVG ──────────────────────────────────────────────────────────────
export function DetailedTooth({
  number,
  status,
  note,
  bridgePosition,
  pontic = false,
  treatment = false,
}: {
  number: number;
  status: ToothStatus;
  note?: string;
  pontic?: boolean;
  treatment?: boolean;
  bridgePosition?: "single" | "left" | "middle" | "right";
}) {
  const cat = categoryOf(number);
  const shape = SHAPES[cat];
  const id = `tk${number}-${useId().replace(/:/g, "")}`;

  const crownShape =
    note === "Fractured"
      ? "M8 37 L8 23 L14 27 L18 16 L23 25 L29 19 L32 37 Z"
      : note === "Worn"
        ? "M10 37 L10 22 Q20 19 30 22 L30 37 Z"
        : shape.crown;

  // ── Missing tooth ────────────────────────────────────────────────────────
  if (status === "missing") {
    return (
      <g>
        <defs>
          <linearGradient id={`${id}-socket`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#E8E4DE" />
            <stop offset="100%" stopColor="#D4CEC6" />
          </linearGradient>
        </defs>
        {/* Empty socket outline */}
        <path
          d={shape.roots[0]}
          fill={`url(#${id}-socket)`}
          stroke="#B8B0A8"
          strokeWidth="0.8"
          strokeDasharray="2.5 1.5"
        />
        {/* Stylized X on crown area */}
        <g>
          <line
            x1="14"
            y1="14"
            x2="26"
            y2="28"
            stroke={treatment ? "#4aa44e" : "#C0776A"}
            strokeWidth="2"
            strokeLinecap="round"
            opacity="0.85"
          />
          <line
            x1="26"
            y1="14"
            x2="14"
            y2="28"
            stroke={treatment ? "#4aa44e" : "#C0776A"}
            strokeWidth="2"
            strokeLinecap="round"
            opacity="0.85"
          />
        </g>
      </g>
    );
  }

  // ── Implant ──────────────────────────────────────────────────────────────
  if (status === "implant") {
    const threadColor = "#8AAFC8";
    const threads = [24, 30, 36, 42, 48, 54, 60, 66];
    return (
      <g>
        <defs>
          <linearGradient id={`${id}-metal`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={treatment ? "#8ed987" : "#5C7FA0"} />
            <stop offset="40%" stopColor={treatment ? "#abe5a6" : "#7AA8CC"} />
            <stop offset="70%" stopColor={treatment ? "#6eb969" : "#4A6E8E"} />
            <stop offset="100%" stopColor={treatment ? "#5b9758" : "#3A5878"} />
          </linearGradient>
          <linearGradient id={`${id}-abutment`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={treatment ? "#8ed987" : "#8BB4D0"} />
            <stop offset="100%" stopColor={treatment ? "#6eb969" : "#4A6E8E"} />
          </linearGradient>
        </defs>
        <g>
          {/* Abutment / crown cap */}
          <rect
            x="13"
            y="8"
            width="14"
            height="13"
            rx="3"
            fill={`url(#${id}-abutment)`}
            stroke="#3A5878"
            strokeWidth="0.9"
          />
          <rect x="15" y="9.5" width="10" height="3" rx="1" fill="white" opacity="0.25" />
          {note === "Implant + abutment" && (
            <path
              d="M12 20 H28 L26 24 H14 Z"
              fill={`url(#${id}-abutment)`}
              stroke="#3A5878"
              strokeWidth="0.9"
            />
          )}
          {/* Screw body */}
          <path
            d="M13 21 L27 21 L25 71 Q22.5 76 20 76 Q17.5 76 15 71 Z"
            fill={`url(#${id}-metal)`}
            stroke="#3A5878"
            strokeWidth="0.9"
          />
          {/* Threading */}
          {threads.map((y) => (
            <line key={y} x1="14" y1={y} x2="26" y2={y} stroke={threadColor} strokeWidth="0.7" />
          ))}
          {/* Apex dot */}
          <circle cx="20" cy="75" r="1.5" fill="#3A5878" />
        </g>
      </g>
    );
  }

  // ── Bridge geometry ──────────────────────────────────────────────────────
  const isBridge = status === "bridge" && bridgePosition !== undefined;
  const barLeft = bridgePosition === "left" || bridgePosition === "single" ? 4 : -20;
  const barRight = bridgePosition === "right" || bridgePosition === "single" ? 36 : 60;
  const BRIDGE_COLOR_1 = "#9B6FDB";
  const BRIDGE_COLOR_2 = "#7C4AC9";

  // ── Normal tooth defs ────────────────────────────────────────────────────
  const enamelTop = "#F8F4ED";
  const enamelBottom = "#E4DDD0";
  const gumColor = "rgba(230,160,140,0.28)";

  const crownFill = (() => {
    if (treatment) return "#8ed987";
    if (note === "Discolored") return "#b9a56d";
    if (note === "Necrosis") return "#72717c";
    if (note === "Veneer") return "#fff9dc";
    if (status === "crown") return `url(#${id}-gold)`;
    if (status === "bridge") return `url(#${id}-bridge-c)`;
    return `url(#${id}-enamel)`;
  })();

  const strokeColor = treatment
    ? "#5b9758"
    : status === "crown"
      ? "#8A6820"
      : status === "bridge"
        ? "#5E2FA0"
        : "#B0A090";

  return (
    <g>
      <defs>
        {/* Enamel gradient */}
        <linearGradient id={`${id}-enamel`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={enamelTop} />
          <stop offset="100%" stopColor={enamelBottom} />
        </linearGradient>
        {/* Root gradient */}
        <linearGradient id={`${id}-root`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#F0DDCA" />
          <stop offset="100%" stopColor="#D9BFA8" />
        </linearGradient>
        {/* Crown gold gradient */}
        <linearGradient id={`${id}-gold`} x1="0" y1="0" x2="0.3" y2="1">
          <stop offset="0%" stopColor="#F5D97A" />
          <stop offset="35%" stopColor="#E0B840" />
          <stop offset="75%" stopColor="#C8980C" />
          <stop offset="100%" stopColor="#B07A00" />
        </linearGradient>
        {/* Bridge crown tint */}
        <linearGradient id={`${id}-bridge-c`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#D8C0F8" />
          <stop offset="100%" stopColor="#B890E8" />
        </linearGradient>
        {/* Filled (amalgam) */}
        <linearGradient id={`${id}-fill-grad`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#7A889A" />
          <stop offset="100%" stopColor="#4E5C6E" />
        </linearGradient>
        {/* Caries gradient */}
        <radialGradient id={`${id}-caries`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#3A1A06" />
          <stop offset="60%" stopColor="#7C3C10" />
          <stop offset="100%" stopColor="#A05520" stopOpacity="0.4" />
        </radialGradient>
        {/* Caries crackle outer ring */}
        <radialGradient id={`${id}-caries-ring`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#A05520" stopOpacity="0" />
          <stop offset="100%" stopColor="#8B3A0C" stopOpacity="0.35" />
        </radialGradient>
      </defs>

      <g data-detailed-tooth="true">
        {/* ── Bridge bar behind tooth ── */}
        {isBridge && (
          <>
            <rect
              x={barLeft}
              y={GUM_Y - 5}
              width={barRight - barLeft}
              height={10}
              rx={2.5}
              fill={BRIDGE_COLOR_1}
              opacity={0.25}
            />
            <line
              x1={barLeft}
              y1={GUM_Y}
              x2={barRight}
              y2={GUM_Y}
              stroke={BRIDGE_COLOR_2}
              strokeWidth={2.8}
              strokeLinecap={bridgePosition === "middle" ? "butt" : "round"}
              opacity={0.75}
            />
          </>
        )}

        <defs>
          <clipPath id={id + "-root-clip"}>
            <rect x="0" y="37" width="40" height={note === "Root resorption" ? 23 : 43} />
          </clipPath>
        </defs>
        <g clipPath={"url(#" + id + "-root-clip)"}>
          {/* ── Roots ── */}
          {!pontic &&
            shape.roots.map((d, i) => (
              <path
                key={i}
                data-natural-root="true"
                d={d}
                fill={
                  status === "root-treated" ? (i === 0 ? "#E89878" : "#E88868") : `url(#${id}-root)`
                }
                stroke={status === "root-treated" ? "#C05030" : "#B8A090"}
                strokeWidth="0.85"
                strokeLinejoin="round"
              />
            ))}
        </g>
        {note === "Fractured root" && (
          <path d="M9 51 L17 55 L23 50 L30 54" fill="none" stroke="#a94a38" strokeWidth="2.5" />
        )}
        {/* ── Root-treated: gutta-percha dots ── */}
        {status === "root-treated" &&
          (() => {
            const dots: { cx: number; cy: number }[] =
              cat === "molar"
                ? [
                    { cx: 11, cy: 73 },
                    { cx: 29, cy: 73 },
                  ]
                : cat === "premolar"
                  ? [
                      { cx: 14, cy: 73 },
                      { cx: 26, cy: 73 },
                    ]
                  : [{ cx: 20, cy: 74 }];
            return dots.map((d, i) => (
              <circle key={i} {...d} r="2.2" fill="#C04828" stroke="#901820" strokeWidth="0.6" />
            ));
          })()}

        {/* ── Root treated: pulp line on crown ── */}
        {status === "root-treated" && (
          <line
            x1="20"
            y1={cat === "molar" ? 15 : cat === "canine" ? 14 : 16}
            x2="20"
            y2={GUM_Y}
            stroke="#D05838"
            strokeWidth="1.2"
            strokeLinecap="round"
            opacity="0.55"
          />
        )}

        {/* ── Gum band ── */}
        <rect
          x={cat === "molar" ? 4 : cat === "premolar" ? 8 : cat === "canine" ? 10 : 12}
          y={GUM_Y - 3.5}
          width={cat === "molar" ? 32 : cat === "premolar" ? 24 : cat === "canine" ? 20 : 16}
          height={7}
          rx={3}
          fill={gumColor}
        />

        {/* ── Crown ── */}
        <path
          d={note === "Radix" ? "M10 37 L12 32 L19 35 L26 31 L30 37 Z" : crownShape}
          fill={crownFill}
          stroke={strokeColor}
          strokeWidth={status === "crown" || status === "bridge" ? 1.1 : 0.9}
          strokeLinejoin="round"
        />

        {/* ── Crown shimmer highlight ── */}
        {(status === "crown" || status === "bridge") && (
          <path
            d={crownShape}
            fill="white"
            opacity="0.18"
            style={{ clipPath: "inset(0 40% 75% 10% round 3px)" }}
          />
        )}

        {/* ── Intact: enamel highlight ── */}
        {(status === "intact" || status === "root-treated") && (
          <path
            d={crownShape}
            fill="white"
            opacity="0.35"
            style={{ clipPath: "inset(0 25% 72% 15% round 2px)" }}
          />
        )}

        {/* ── Caries spot ── */}
        {status === "caries" &&
          (() => {
            const cy = cat === "molar" ? 21 : cat === "premolar" ? 20 : 19;
            const rx = cat === "molar" ? 5.5 : cat === "premolar" ? 4.5 : 3.8;
            const ry = cat === "molar" ? 4.5 : 3.8;
            return (
              <>
                {/* outer discoloration halo */}
                <ellipse
                  cx="20"
                  cy={cy}
                  rx={rx + 2.5}
                  ry={ry + 2}
                  fill={`url(#${id}-caries-ring)`}
                />
                {/* cavity */}
                <ellipse cx="20" cy={cy} rx={rx} ry={ry} fill={`url(#${id}-caries)`} />
                {/* inner dark center */}
                <ellipse cx="20" cy={cy} rx={rx * 0.4} ry={ry * 0.4} fill="#1A0802" opacity="0.7" />
              </>
            );
          })()}

        {/* ── Filled restoration ── */}
        {status === "filled" &&
          (() => {
            const fy = cat === "molar" ? 18 : cat === "premolar" ? 17 : 16;
            const fh = cat === "molar" ? 8 : 7;
            const fw = cat === "molar" ? 13 : cat === "premolar" ? 11 : 9;
            const fx = 20 - fw / 2;
            return (
              <>
                <rect
                  x={fx}
                  y={fy}
                  width={fw}
                  height={fh}
                  rx="2"
                  fill={
                    note === "Filled (composite)"
                      ? "#e8ded0"
                      : note === "Inlay"
                        ? "#e6bf56"
                        : `url(#${id}-fill-grad)`
                  }
                  stroke="#3A4A5A"
                  strokeWidth="0.6"
                />
                {/* margin line */}
                <rect
                  x={fx + 1.5}
                  y={fy + 1}
                  width={fw - 3}
                  height={1.5}
                  rx="0.5"
                  fill="white"
                  opacity="0.2"
                />
              </>
            );
          })()}

        {/* ── Crown: dashed margin line ── */}
        {status === "crown" && (
          <path
            d={crownShape}
            fill="none"
            stroke="#F5D060"
            strokeWidth="1.4"
            strokeDasharray="2.5 1.5"
            opacity="0.6"
          />
        )}

        {/* ── Bridge: crown outline ── */}
        {status === "bridge" && (
          <path
            d={crownShape}
            fill="none"
            stroke={BRIDGE_COLOR_2}
            strokeWidth="1.4"
            opacity="0.55"
          />
        )}

        {note === "Mobility" && (
          <path
            d="M3 26 L7 22 M3 26 L7 30 M3 26 H12 M37 26 L33 22 M37 26 L33 30 M37 26 H28"
            fill="none"
            stroke="#c75c32"
            strokeWidth="1.5"
          />
        )}
        {(note === "Post" || note === "Parapulpal pin") && (
          <rect x={note === "Post" ? 18 : 24} y="21" width="3" height="36" rx="1" fill="#687f91" />
        )}
        {note === "Veneer" && <path d={crownShape} fill="none" stroke="#83c7cb" strokeWidth="2" />}
        {note === "Dentures" && <path d="M3 35 Q20 45 37 35 L37 43 Q20 51 3 43 Z" fill="#e7a3ae" />}
        {["Apical lesion", "Cyst", "Granuloma"].includes(note ?? "") && (
          <ellipse
            cx="20"
            cy="70"
            rx={note === "Cyst" ? 10 : 7}
            ry="7"
            fill="#e89d8855"
            stroke="#c05d48"
            strokeDasharray={note === "Granuloma" ? "2 1" : undefined}
          />
        )}
        {[
          "Gingivitis",
          "Periodontitis",
          "Gingival recession",
          "Gingival overgrowth",
          "Plaque",
          "Bone loss",
          "Gummy smile",
        ].includes(note ?? "") && (
          <path
            d={
              note === "Gingival recession"
                ? "M4 46 Q20 54 36 46"
                : note === "Gingival overgrowth"
                  ? "M4 35 Q11 25 17 35 Q25 23 36 35"
                  : note === "Bone loss"
                    ? "M4 50 H12 M28 50 H36 M4 56 H12 M28 56 H36"
                    : note === "Gummy smile"
                      ? "M4 29 Q20 20 36 29"
                      : "M4 38 Q20 49 36 38"
            }
            fill="none"
            stroke={note === "Plaque" ? "#d8bc54" : "#d76b76"}
            strokeWidth={note === "Periodontitis" ? 7 : 4}
          />
        )}
        {["Drifted (front)", "Drifted (back)", "Impacted", "Malocclusion"].includes(note ?? "") && (
          <path
            d={
              note === "Impacted"
                ? "M10 12 L29 32 M29 32 V23 M29 32 H20"
                : note === "Malocclusion"
                  ? "M5 14 H23 L18 10 M35 26 H17 L22 30"
                  : note === "Drifted (back)"
                    ? "M30 15 H7 L12 10 M7 15 L12 20"
                    : "M10 15 H33 L28 10 M33 15 L28 20"
            }
            fill="none"
            stroke="#9a4ba6"
            strokeWidth="2"
          />
        )}
        {/* ── Status badge dot (bottom-right of crown) ── */}
        {status !== "intact" && (
          <circle
            cx={cat === "molar" ? 31 : cat === "premolar" ? 28 : 27}
            cy={GUM_Y - 6}
            r="3.2"
            fill={getStatusMeta(status).color}
            stroke="white"
            strokeWidth="0.8"
          />
        )}

        {/* ── Note dot indicator (top-left, when note is present) ── */}
        {note && status === "intact" && (
          <circle cx="15" cy="14" r="2.8" fill="#6C8EB4" stroke="white" strokeWidth="0.8" />
        )}
      </g>
    </g>
  );
}

export function toothShape(number: number) {
  return SHAPES[categoryOf(number)];
}
