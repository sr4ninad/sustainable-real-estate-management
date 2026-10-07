import { useLayoutEffect, useRef, useState } from "react";

/* --------------------------------------------------------------------------
   BarList — horizontal single-series bars, value at the tip, hover tooltip.
   rows: [{ label, value, tooltip? }]
   -------------------------------------------------------------------------- */
export function BarList({ rows, format = (v) => v, max, ariaLabel }) {
  const [tip, setTip] = useState(null);
  const ref = useRef(null);
  const top = max ?? Math.max(1, ...rows.map((r) => r.value));

  const show = (row, e) => {
    const box = ref.current.getBoundingClientRect();
    const target = e.currentTarget.querySelector(".bar-fill").getBoundingClientRect();
    setTip({
      x: target.right - box.left,
      y: target.top - box.top,
      title: row.label,
      text: row.tooltip ?? format(row.value),
    });
  };

  return (
    <div className="chart" ref={ref}>
      <div className="bar-list" role="list" aria-label={ariaLabel}>
        {rows.map((row) => (
          <div
            key={row.label}
            className="bar-row"
            role="listitem"
            tabIndex={0}
            aria-label={`${row.label}: ${row.tooltip ?? format(row.value)}`}
            onMouseEnter={(e) => show(row, e)}
            onFocus={(e) => show(row, e)}
            onMouseLeave={() => setTip(null)}
            onBlur={() => setTip(null)}
          >
            <span className="bar-row-label">{row.label}</span>
            <span className="bar-track">
              <span className="bar-fill" style={{ width: `${(row.value / top) * 88}%` }} />
              <span className="bar-value num">{format(row.value)}</span>
            </span>
          </div>
        ))}
      </div>
      {tip && (
        <div className="chart-tooltip" style={{ left: tip.x, top: tip.y }}>
          <strong>{tip.title}</strong>
          {tip.text}
        </div>
      )}
    </div>
  );
}

/* --------------------------------------------------------------------------
   ColumnChart — vertical single-series columns with a clean y-axis.
   data: [{ label, value, tooltip? }]
   -------------------------------------------------------------------------- */
function niceScale(max, ticks = 4) {
  if (max <= 0) return { top: 1, step: 0.25 };
  const raw = max / ticks;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const norm = raw / mag;
  const step = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10) * mag;
  return { top: Math.ceil(max / step) * step, step };
}

function columnPath(x, y, w, h, r) {
  const rr = Math.min(r, h, w / 2);
  if (h <= 0) return "";
  return `M${x},${y + h} V${y + rr} Q${x},${y} ${x + rr},${y} H${x + w - rr} Q${x + w},${y} ${x + w},${y + rr} V${y + h} Z`;
}

export function ColumnChart({ data, height = 220, format = (v) => v, tickFormat = format, ariaLabel }) {
  const ref = useRef(null);
  const [width, setWidth] = useState(0);
  const [active, setActive] = useState(null);

  useLayoutEffect(() => {
    const el = ref.current;
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const pad = { top: 22, right: 8, bottom: 28, left: 52 };
  const innerW = Math.max(0, width - pad.left - pad.right);
  const innerH = height - pad.top - pad.bottom;
  const maxVal = Math.max(0, ...data.map((d) => d.value));
  const { top, step } = niceScale(maxVal);
  const ticks = [];
  for (let v = 0; v <= top + step / 2; v += step) ticks.push(v);

  const band = data.length ? innerW / data.length : 0;
  const colW = Math.min(24, band * 0.55);
  const y = (v) => pad.top + innerH - (v / top) * innerH;
  const peak = data.reduce((best, d, i) => (d.value > (data[best]?.value ?? -1) ? i : best), 0);

  return (
    <div className="chart col-chart" ref={ref} style={{ height }}>
      {width > 0 && (
        <svg width={width} height={height} role="img" aria-label={ariaLabel}>
          {ticks.map((t) => (
            <g key={t}>
              <line
                x1={pad.left}
                x2={width - pad.right}
                y1={y(t)}
                y2={y(t)}
                stroke={t === 0 ? "var(--axis)" : "var(--grid)"}
                strokeWidth="1"
              />
              <text x={pad.left - 10} y={y(t)} dy="0.35em" textAnchor="end" className="num">
                {tickFormat(t)}
              </text>
            </g>
          ))}
          {data.map((d, i) => {
            const cx = pad.left + band * i + band / 2;
            const h = innerH - (y(d.value) - pad.top);
            return (
              <g key={d.label}>
                <path
                  className={`col ${active === i ? "active" : ""}`}
                  d={columnPath(cx - colW / 2, y(d.value), colW, h, 4)}
                />
                {i === peak && d.value > 0 && (
                  <text x={cx} y={y(d.value) - 8} textAnchor="middle" className="col-value">
                    {format(d.value)}
                  </text>
                )}
                <text x={cx} y={height - 8} textAnchor="middle">
                  {d.label}
                </text>
                <rect
                  className="hit"
                  x={pad.left + band * i}
                  y={pad.top}
                  width={band}
                  height={innerH}
                  tabIndex={0}
                  aria-label={`${d.label}: ${d.tooltip ?? format(d.value)}`}
                  onMouseEnter={() => setActive(i)}
                  onMouseLeave={() => setActive(null)}
                  onFocus={() => setActive(i)}
                  onBlur={() => setActive(null)}
                />
              </g>
            );
          })}
        </svg>
      )}
      {active !== null && data[active] && (
        <div
          className="chart-tooltip"
          style={{ left: pad.left + band * active + band / 2, top: y(data[active].value) }}
        >
          <strong>{data[active].label}</strong>
          {data[active].tooltip ?? format(data[active].value)}
        </div>
      )}
    </div>
  );
}

/* --------------------------------------------------------------------------
   Meter — share of a whole, track is a lighter step of the same hue.
   -------------------------------------------------------------------------- */
export function Meter({ label, icon: Icon, value, total, suffix }) {
  const pct = total ? value / total : 0;
  return (
    <div className="meter" role="meter" aria-valuemin={0} aria-valuemax={total} aria-valuenow={value} aria-label={label}>
      <div className="meter-top">
        <span className="meter-label">
          {Icon && <Icon aria-hidden />}
          {label}
        </span>
        <span className="meter-value num">
          {Math.round(pct * 100)}% <span className="muted" style={{ fontWeight: 500 }}>{suffix ?? `· ${value}/${total}`}</span>
        </span>
      </div>
      <div className="meter-track">
        <div className="meter-fill" style={{ width: `${pct * 100}%` }} />
      </div>
    </div>
  );
}

/* --------------------------------------------------------------------------
   ScoreRing — a single headline ratio.
   -------------------------------------------------------------------------- */
export function ScoreRing({ value, max, size = 96, stroke = 9, label, caption }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = max ? Math.min(1, value / max) : 0;
  return (
    <div className="ring" style={{ width: size, height: size }} role="img" aria-label={`${label}: ${caption}`}>
      <svg width={size} height={size}>
        <circle className="ring-track" cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} />
        <circle
          className="ring-fill"
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
        />
      </svg>
      <div className="ring-label">
        <div className="ring-value">{label}</div>
        {caption && <div className="ring-caption">{caption}</div>}
      </div>
    </div>
  );
}
