import { useState } from "react";
import type { Cell, Scene } from "./types";
function inside(point: [number, number], polygon: [number, number][]) {
  let hit = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i],
      b = polygon[j];
    if (
      a[1] > point[1] !== b[1] > point[1] &&
      point[0] < ((b[0] - a[0]) * (point[1] - a[1])) / (b[1] - a[1]) + a[0]
    )
      hit = !hit;
  }
  return hit;
}
export default function LassoShelf({
  cells,
  axes,
  selected,
  onSelect,
}: {
  cells: Cell[];
  axes: Scene["data"]["axes"];
  selected: string[];
  onSelect: (ids: string[]) => void;
}) {
  const [points, setPoints] = useState<[number, number][]>([]),
    [drawing, setDrawing] = useState(false);
  if (!axes) return null;
  const width = 1000,
    height = 420,
    locations = cells.map((cell) => ({
      cell,
      x:
        90 +
        (axes.occupations.findIndex((x) => x.id === cell.occupationId) + 0.5) *
          (870 / Math.max(1, axes.occupations.length)),
      y:
        35 +
        (axes.levels.indexOf(cell.level) + 0.5) *
          (330 / Math.max(1, axes.levels.length)),
    }));
  const position = (
    event: React.PointerEvent<SVGSVGElement>,
  ): [number, number] => {
    const rectangle = event.currentTarget.getBoundingClientRect();
    return [
      ((event.clientX - rectangle.left) / rectangle.width) * width,
      ((event.clientY - rectangle.top) / rectangle.height) * height,
    ];
  };
  return (
    <div className="spatial-lasso">
      <p>
        Drag a polygon on this isolated orthographic layer. All cell centers
        inside the polygon are included, including overlapping centers. Release
        previews the draft; Apply commits it. Touch users can use the same
        exact-list checkboxes. Handles have fixed size; use the exact list for
        counts.
      </p>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        aria-label="Isolated shelf lasso. Keyboard equivalent: exact group list below."
        role="img"
        onPointerDown={(event) => {
          if (event.button !== 0) return;
          event.currentTarget.setPointerCapture(event.pointerId);
          setDrawing(true);
          setPoints([position(event)]);
        }}
        onPointerMove={(event) => {
          if (drawing)
            setPoints((old) =>
              old.length < 4096 ? [...old, position(event)] : old,
            );
        }}
        onPointerUp={(event) => {
          if (!drawing) return;
          const polygon = [...points, position(event)];
          setDrawing(false);
          if (polygon.length >= 3)
            onSelect(
              locations
                .filter((p) => inside([p.x, p.y], polygon))
                .map((p) => p.cell.id),
            );
          setPoints([]);
        }}
        onPointerCancel={() => {
          setDrawing(false);
          setPoints([]);
        }}
      >
        {axes.levels.map((level, i) => (
          <g key={level}>
            <text
              x="80"
              y={40 + ((i + 0.5) * 330) / axes.levels.length}
              textAnchor="end"
            >
              {level}
            </text>
            <path
              d={`M90 ${35 + ((i + 0.5) * 330) / axes.levels.length}H960`}
              stroke="#e0e9df"
            />
          </g>
        ))}
        {axes.occupations.map((o, i) => (
          <text
            key={o.id}
            x={90 + ((i + 0.5) * 870) / axes.occupations.length}
            y="390"
            textAnchor="middle"
          >
            {o.id}
          </text>
        ))}
        {locations.map((p) => (
          <circle
            key={p.cell.id}
            cx={p.x}
            cy={p.y}
            r={selected.includes(p.cell.id) ? 8 : 5}
            fill={selected.includes(p.cell.id) ? "#98601c" : "#28776d"}
          >
            <title>
              {p.cell.occupationLabel} · {p.cell.level}: {p.cell.count}
            </title>
          </circle>
        ))}
        {!!points.length && (
          <polyline
            points={points.map((p) => p.join(",")).join(" ")}
            fill="#b7d6c844"
            stroke="#28776d"
            strokeWidth="2"
          />
        )}
        <text x="520" y="417" textAnchor="middle">
          Occupation IDs → (full names in exact list)
        </text>
      </svg>
    </div>
  );
}
