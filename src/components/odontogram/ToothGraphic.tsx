import type { Spot, ToothVisual } from "@/lib/dental/tooth-visual";
import { VIEW_H, VIEW_W, toothGeometry, type Point } from "./tooth-geometry";

export const ODONTOGRAM_COLORS = {
  outline: "#595A5C",
  root: "#E1F4FD",
  canal: "#B9E5FB",
  enamel: "#FFFFFF",
  prosthesis: "#D4D4D4",
  metal: "#5C5C5C",
  metalLine: "#3E3E3E",
  caries: "#EF5B5B",
  cariesLine: "#B32424",
  cariesBack: "#F6A9A9",
  composite: "#DCDCDC",
  compositeLine: "#9E9E9E",
  planned: "#86CF7E",
  plannedLine: "#3C9B3C",
  plannedDark: "#2F8A2F",
  discolored: "#F9D6A3",
  temporary: "#F6D7AE",
  impacted: "#F2A1B3",
  veneerPreparation: "#C9A37C",
  gum: "#F9DADA",
  gumLine: "#E2A6A6",
} as const;

const C = ODONTOGRAM_COLORS;

// Planned work and the "white" restorations (filling, inlay, onlay) are green;
// existing caries is red, amalgam dark and old composite light grey.
function spotStyle(spot: Spot) {
  if (spot.planned || spot.kind === "inlay" || spot.kind === "onlay" || spot.kind === "filling") {
    return { fill: C.planned, stroke: C.plannedLine };
  }
  if (spot.kind === "caries") return { fill: C.caries, stroke: C.cariesLine };
  if (spot.kind === "amalgam") return { fill: C.metal, stroke: C.metalLine };
  return { fill: C.composite, stroke: C.compositeLine };
}

function SpotShape({
  spot,
  at,
  back,
  edgeY,
  crownW,
}: {
  spot: Spot;
  at: Point;
  back: boolean;
  edgeY: number;
  crownW: number;
}) {
  const style = spotStyle(spot);
  if (spot.kind === "inlay" || spot.kind === "onlay") {
    const w = crownW * (spot.kind === "onlay" ? 0.7 : 0.42);
    const top = edgeY - (spot.kind === "onlay" ? 9 : 8);
    return (
      <path
        d={`M${at.x - w / 2} ${edgeY - 0.6} Q${at.x - w / 2} ${top} ${at.x} ${top} Q${at.x + w / 2} ${top} ${at.x + w / 2} ${edgeY - 0.6} Z`}
        fill={style.fill}
        stroke={style.stroke}
        strokeWidth={0.8}
      />
    );
  }
  if (spot.surface === "B" || spot.surface === "L") {
    const back = spot.surface === "L";
    return (
      <circle
        cx={at.x}
        cy={at.y}
        r={3.3}
        fill={back ? (spot.planned ? C.planned : C.cariesBack) : style.fill}
        fillOpacity={back ? 0.75 : 1}
        stroke={back ? "none" : style.stroke}
        strokeWidth={0.8}
      />
    );
  }
  if (spot.surface === "O" || (!spot.surface && back)) {
    const w = crownW * 0.34;
    return (
      <path
        d={`M${at.x - w / 2} ${edgeY - 0.4} Q${at.x - w / 2} ${edgeY - 7.5} ${at.x} ${edgeY - 7.5} Q${at.x + w / 2} ${edgeY - 7.5} ${at.x + w / 2} ${edgeY - 0.4} Z`}
        fill={style.fill}
        stroke={style.stroke}
        strokeWidth={0.8}
      />
    );
  }
  // Mesial/distal: a half-moon against the side of the crown.
  const side = at.x > VIEW_W / 2 ? 1 : -1;
  const edgeX = at.x + side * 3.2;
  return (
    <path
      d={`M${edgeX} ${at.y - 3.4} Q${at.x - side * 2.8} ${at.y - 3.4} ${at.x - side * 2.8} ${at.y} Q${at.x - side * 2.8} ${at.y + 3.4} ${edgeX} ${at.y + 3.4} Z`}
      fill={style.fill}
      stroke={style.stroke}
      strokeWidth={0.8}
    />
  );
}

function crownFill(fill: ToothVisual["crown"]["fill"]) {
  switch (fill) {
    case "gray":
      return C.prosthesis;
    case "discolored":
      return C.discolored;
    case "planned":
      return C.planned;
    case "temporary":
      return C.temporary;
    default:
      return C.enamel;
  }
}

function Implant({
  g,
  planned,
  onePhase,
  abutment,
  abutmentPlanned,
  cap,
  capPlanned,
}: {
  g: ReturnType<typeof toothGeometry>;
  planned: boolean;
  onePhase: boolean;
  abutment: boolean;
  abutmentPlanned: boolean;
  cap: boolean;
  capPlanned: boolean;
}) {
  const fill = planned ? C.planned : "#C9C9C9";
  const line = planned ? C.plannedLine : C.outline;
  const top = g.neckY - 1;
  const bottom = g.neckY - 36;
  const half = 5.8;
  const threads = Array.from({ length: 7 }, (_, index) => top - 4 - index * 4.4);
  return (
    <g data-implant="true">
      <path
        d={`M${g.cx - half} ${top} L${g.cx - half + 1.6} ${bottom + 2} Q${g.cx} ${bottom - 1} ${g.cx + half - 1.6} ${bottom + 2} L${g.cx + half} ${top} Z`}
        fill={fill}
        stroke={line}
        strokeWidth={0.8}
      />
      {threads.map((y) => (
        <path
          key={y}
          d={`M${g.cx - half + 0.6} ${y + 1.4} L${g.cx + half - 0.6} ${y - 1.4}`}
          stroke={line}
          strokeWidth={0.7}
        />
      ))}
      {(abutment || onePhase) && (
        <path
          d={`M${g.cx - 4} ${top} L${g.cx - 3} ${top + 7} L${g.cx - 4.2} ${top + 7} L${g.cx - 4.2} ${top + 10.5} L${g.cx + 4.2} ${top + 10.5} L${g.cx + 4.2} ${top + 7} L${g.cx + 3} ${top + 7} L${g.cx + 4} ${top} Z`}
          fill={(onePhase ? planned : abutmentPlanned) ? C.planned : "#C9C9C9"}
          stroke={(onePhase ? planned : abutmentPlanned) ? C.plannedLine : C.outline}
          strokeWidth={0.8}
        />
      )}
      {cap && !abutment && !onePhase && (
        <rect
          x={g.cx - 5.6}
          y={top}
          width={11.2}
          height={3}
          rx={1}
          fill={capPlanned ? C.planned : "#C9C9C9"}
          stroke={capPlanned ? C.plannedLine : C.outline}
          strokeWidth={0.7}
        />
      )}
    </g>
  );
}

/**
 * One tooth of the odontogram. Draws the natural tooth (roots, canals, crown)
 * and layers the findings and planned work on top, in the same order a
 * dentist would picture them.
 */
export function ToothGraphic({ visual }: { visual: ToothVisual }) {
  const g = toothGeometry(visual.toothId);
  const flip = g.upper ? "" : `translate(0 ${VIEW_H}) scale(1 -1)`;
  const mirror = g.mirrored ? `translate(${VIEW_W} 0) scale(-1 1)` : "";
  const transform = [flip, mirror].filter(Boolean).join(" ") || undefined;
  const { crown } = visual;
  const showCrown = visual.present && crown.shape !== "none";
  const crownPath =
    crown.shape === "worn"
      ? g.worn
      : crown.shape === "fractured"
        ? g.fractured
        : crown.shape === "filed"
          ? g.filed
          : crown.shape === "core"
            ? g.core
            : crown.shape === "telescopic"
              ? g.telescopic
              : g.crown;
  const crownColor =
    crown.shape === "core"
      ? crown.fill === "planned"
        ? C.plannedDark
        : C.metal
      : crownFill(crown.fill);
  const crownLine = crown.fill === "planned" ? C.plannedLine : C.outline;
  const plannedFiled = crown.shape === "filed" && crown.fill === "planned";

  return (
    <svg
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      className="h-full w-full"
      style={{ overflow: "visible" }}
      aria-hidden="true"
      data-tooth-graphic={visual.toothId}
    >
      <g transform={transform}>
        {visual.extraction && (
          <path
            d={`M${g.cx - 5} ${g.edgeY - 18} L${g.cx + 5} ${g.edgeY - 8} M${g.cx + 5} ${g.edgeY - 18} L${g.cx - 5} ${g.edgeY - 8}`}
            stroke={C.plannedLine}
            strokeWidth={2.4}
            strokeLinecap="round"
          />
        )}
        {visual.present &&
          visual.naturalRoot &&
          g.roots.map((root, index) => (
            <g key={index}>
              <path
                d={root}
                fill={C.root}
                stroke={C.outline}
                strokeWidth={0.9}
                strokeLinejoin="round"
              />
              {!visual.rootCanal && <path d={g.canals[index]} fill={C.canal} />}
            </g>
          ))}
        {visual.present && visual.naturalRoot && crown.shape === "none" && (
          <path d={g.radixCap} fill="none" stroke={C.outline} strokeWidth={0.9} />
        )}
        {visual.implant && (
          <Implant
            g={g}
            planned={visual.implant.planned}
            onePhase={visual.implant.onePhase}
            abutment={!!visual.abutment}
            abutmentPlanned={!!visual.abutment?.planned}
            cap={!!visual.healingCap}
            capPlanned={!!visual.healingCap?.planned}
          />
        )}
        {visual.rootCanal &&
          g.canalLines.map((line, index) => (
            <path
              key={index}
              d={line}
              fill="none"
              stroke={visual.rootCanal?.planned ? C.plannedLine : C.metal}
              strokeWidth={1.5}
              strokeLinecap="round"
            />
          ))}
        {showCrown && (
          <>
            {visual.impacted && (
              <path
                d={crownPath}
                fill="none"
                stroke={C.impacted}
                strokeWidth={4.5}
                strokeLinejoin="round"
                opacity={0.85}
              />
            )}
            <path
              d={crownPath}
              fill={plannedFiled ? C.planned : crownColor}
              stroke={crownLine}
              strokeWidth={0.9}
              strokeLinejoin="round"
              data-crown={crown.shape}
            />
            {visual.spots.map((spot, index) => {
              const surface =
                spot.surface ??
                (spot.kind === "inlay" || spot.kind === "onlay" ? "O" : g.defaultSurface);
              if (surface === "O" && !g.back && spot.surface) return null;
              const at =
                surface === "L" ? g.surface.B : g.surface[surface as "M" | "D" | "O" | "B"];
              return (
                <SpotShape
                  key={index}
                  spot={{ ...spot, surface: surface as Spot["surface"] }}
                  at={at}
                  back={g.back}
                  edgeY={g.edgeY}
                  crownW={g.crownW}
                />
              );
            })}
            {visual.pins &&
              (g.back && g.crownW > 30 ? [-4.5, 4.5] : [0]).map((dx) => (
                <path
                  key={dx}
                  d={`M${g.cx + dx} ${g.neckY - 3} L${g.cx + dx} ${g.neckY + 10}`}
                  stroke={visual.pins?.planned ? C.plannedLine : C.metalLine}
                  strokeWidth={1.1}
                />
              ))}
            {visual.veneer && (
              <path
                d={g.crown}
                fill="none"
                stroke={visual.veneer.planned ? C.plannedLine : "#6CB86C"}
                strokeWidth={2.2}
                transform={`translate(${g.cx} ${g.edgeY}) scale(0.86) translate(${-g.cx} ${-g.edgeY})`}
              />
            )}
            {visual.veneerPreparation && (
              <path
                d={g.crown}
                fill="none"
                stroke={C.veneerPreparation}
                strokeWidth={2}
                transform={`translate(${g.cx} ${g.edgeY}) scale(0.86) translate(${-g.cx} ${-g.edgeY})`}
              />
            )}
          </>
        )}
        {/* The post and its core stay visible through a crown placed over them. */}
        {visual.post && (
          <g fill={visual.post.planned ? C.plannedDark : C.metal}>
            <path
              d={`M${g.cx - 1.5} ${g.neckY + 2} L${g.cx - 1} ${g.neckY - 20} L${g.cx + 1} ${g.neckY - 20} L${g.cx + 1.5} ${g.neckY + 2} Z`}
            />
            {crown.shape !== "core" && showCrown && <path d={g.core} opacity={0.9} />}
          </g>
        )}
        {visual.bar && (
          <rect
            x={-2}
            y={g.neckY + 1}
            width={VIEW_W + 4}
            height={4}
            fill={visual.bar.planned ? C.planned : "#C9C9C9"}
            stroke={visual.bar.planned ? C.plannedLine : C.outline}
            strokeWidth={0.7}
          />
        )}
        {visual.attachment && (
          <rect
            x={VIEW_W - 6}
            y={g.neckY + 6}
            width={7}
            height={6}
            fill="#fff"
            stroke={visual.attachment.planned ? C.plannedLine : C.outline}
            strokeDasharray="1.4 1"
            strokeWidth={0.8}
          />
        )}
      </g>
    </svg>
  );
}
