import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, History, RefreshCcw, TrendingDown, TrendingUp } from "lucide-react";
import { useData } from "../context/contexts";
import { Delta, EmptyState, PageHeader, Segmented, Skeleton, StatCard } from "../components/ui/primitives";
import { formatDate, formatINR, formatINRCompact, formatSignedPercent, parseDate } from "../lib/format";

export default function PriceHistory() {
  const { raw, propertyById, loading } = useData();
  const [mode, setMode] = useState("price");
  const [propertyId, setPropertyId] = useState("all");

  const entries = useMemo(
    () =>
      raw.logs
        .map((l) => {
          const oldPrice = Number(l.oldPrice);
          const newPrice = Number(l.newPrice);
          return {
            ...l,
            date: parseDate(l.updatedAt),
            property: propertyById.get(l.propertyId),
            change: oldPrice ? newPrice / oldPrice - 1 : NaN,
            kind: newPrice > oldPrice ? "up" : newPrice < oldPrice ? "down" : "same",
          };
        })
        .sort((a, b) => (b.date?.getTime() ?? 0) - (a.date?.getTime() ?? 0) || b.logId - a.logId),
    [raw.logs, propertyById]
  );

  const priceChanges = entries.filter((e) => e.kind !== "same");
  const biggest = priceChanges.reduce((best, e) => (!best || Math.abs(e.change) > Math.abs(best.change) ? e : best), null);

  const visible = entries
    .filter((e) => mode === "all" || e.kind !== "same")
    .filter((e) => propertyId === "all" || String(e.propertyId) === propertyId);

  // Group by calendar day
  const groups = [];
  for (const e of visible) {
    const label = e.date ? formatDate(e.date, { weekday: "short", day: "numeric", month: "long", year: "numeric" }) : "Unknown date";
    const last = groups[groups.length - 1];
    if (last?.label === label) last.items.push(e);
    else groups.push({ label, items: [e] });
  }

  const loggedProperties = [...new Set(entries.map((e) => e.propertyId))]
    .map((id) => ({ id, address: propertyById.get(id)?.address ?? `Property #${id}` }))
    .sort((a, b) => a.address.localeCompare(b.address));

  return (
    <>
      <PageHeader
        eyebrow="Deals"
        icon={History}
        title="Price history"
        description={
          <>
            Every update to a property, recorded automatically by the <code>trg_property_update_log</code> trigger.
          </>
        }
      />

      <div className="stats" style={{ marginBottom: 20 }}>
        <StatCard loading={loading} label="Price changes" icon={History} value={priceChanges.length} foot={`${entries.length} updates logged in total`} />
        <StatCard
          loading={loading}
          label="Increases"
          icon={TrendingUp}
          value={priceChanges.filter((e) => e.kind === "up").length}
          foot="Prices raised"
        />
        <StatCard
          loading={loading}
          label="Reductions"
          icon={TrendingDown}
          value={priceChanges.filter((e) => e.kind === "down").length}
          foot="Prices cut"
        />
        <StatCard
          loading={loading}
          label="Biggest move"
          icon={RefreshCcw}
          value={biggest ? formatSignedPercent(biggest.change) : "—"}
          foot={biggest ? biggest.property?.address ?? `Property #${biggest.propertyId}` : "No price changes yet"}
        />
      </div>

      <div className="toolbar">
        <Segmented
          id="log-mode"
          label="Which updates to show"
          value={mode}
          onChange={setMode}
          options={[
            { value: "price", label: "Price changes", count: priceChanges.length },
            { value: "all", label: "All updates", count: entries.length },
          ]}
        />
        <select className="select" value={propertyId} onChange={(e) => setPropertyId(e.target.value)} aria-label="Filter by property">
          <option value="all">All properties</option>
          {loggedProperties.map((p) => (
            <option key={p.id} value={String(p.id)}>
              {p.address}
            </option>
          ))}
        </select>
      </div>

      <div className="card">
        {loading ? (
          <div className="card-pad" style={{ display: "grid", gap: 14 }}>
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} height={48} />
            ))}
          </div>
        ) : groups.length ? (
          <div className="timeline">
            {groups.map((g) => (
              <div key={g.label} className="timeline-group">
                <div className="timeline-day">{g.label}</div>
                <ul>
                  {g.items.map((e) => (
                    <li key={e.logId} className={`timeline-item ${e.kind}`}>
                      <span className="timeline-dot" aria-hidden>
                        {e.kind === "up" ? <TrendingUp /> : e.kind === "down" ? <TrendingDown /> : <RefreshCcw />}
                      </span>
                      <div className="timeline-main">
                        <Link to={`/properties?id=${e.propertyId}`} className="timeline-title">
                          {e.property?.address ?? `Property #${e.propertyId}`}
                        </Link>
                        <div className="timeline-sub">
                          {e.kind === "same" ? (
                            <>Record updated (status or details), price unchanged at {formatINRCompact(e.newPrice)}</>
                          ) : (
                            <>
                              <span className="num">{formatINR(e.oldPrice)}</span>
                              <ArrowRight className="inline-icon" aria-hidden />
                              <span className="num strong">{formatINR(e.newPrice)}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="timeline-right">
                        {e.kind !== "same" && <Delta value={e.change} />}
                        <time className="muted">
                          {e.date ? e.date.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" }) : ""}
                        </time>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={History}
            title="No price changes yet"
            text="Edit a property's price and the database trigger will record the change here."
            action={
              <Link to="/properties" className="btn">
                Go to properties
              </Link>
            }
          />
        )}
      </div>
    </>
  );
}
