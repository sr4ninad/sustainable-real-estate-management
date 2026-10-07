import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Award, Check, Database, Leaf, Loader2, X } from "lucide-react";
import { useAuth, useData, useToast } from "../context/contexts";
import DataTable from "../components/ui/DataTable";
import { Meter, ScoreRing } from "../components/charts/Charts";
import { EmptyState, EnergyBadge, GreenLeaves, PageHeader, Segmented, Skeleton } from "../components/ui/primitives";
import { api } from "../lib/api";
import { energyRank, GREEN_LABELS, isCertified, isYes, nextId } from "../lib/domain";
import { FEATURES } from "../lib/meta";
import { formatINRCompact } from "../lib/format";

/** Normalises a row from get_properties_by_sustainability (array or object). */
function spRow(row) {
  if (Array.isArray(row)) return { id: row[0], address: row[1], price: row[2], count: row[3] };
  return {
    id: row.Property_ID ?? row.propertyId,
    address: row.Address ?? row.address,
    price: row.Price ?? row.price,
    count: row.Feature_Count ?? row.featureCount,
  };
}

function ProcedureResults({ min }) {
  const [state, setState] = useState({ loading: true, rows: [] });
  const { raw } = useData();

  useEffect(() => {
    let cancelled = false;
    api.properties
      .bySustainability(min)
      .then((rows) => !cancelled && setState({ loading: false, rows: (rows || []).map(spRow) }))
      .catch((err) => !cancelled && setState({ loading: false, rows: [], error: err.message }));
    return () => {
      cancelled = true;
    };
    // Re-run when feature data changes so results stay in sync after toggles.
  }, [min, raw.features]);

  if (state.loading) {
    return (
      <div className="sp-results">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} height={56} />
        ))}
      </div>
    );
  }
  if (state.error) return <EmptyState error title="Stored procedure failed" text={state.error} />;
  if (!state.rows.length) return <EmptyState icon={Leaf} title="No matches" text={`No property has ${min} or more green features.`} />;

  return (
    <div className="sp-results">
      {[...state.rows]
        .sort((a, b) => b.count - a.count)
        .map((r) => (
          <Link key={r.id} to={`/properties?id=${r.id}`} className="sp-row">
            <GreenLeaves score={Number(r.count)} />
            <div className="sp-main">
              <div className="sp-title">{r.address}</div>
              <div className="sp-sub">
                #{r.id} · {formatINRCompact(r.price)}
              </div>
            </div>
            <span className="badge good">{GREEN_LABELS[Number(r.count)] ?? r.count}</span>
          </Link>
        ))}
    </div>
  );
}

function FeatureToggle({ on, busy, onClick, label, readOnly }) {
  if (readOnly) {
    return (
      <span className={`feature-cell static ${on ? "on" : ""}`} role="img" aria-label={`${label}: ${on ? "yes" : "no"}`}>
        {on ? <Check /> : <X />}
      </span>
    );
  }
  return (
    <button
      type="button"
      className={`feature-cell ${on ? "on" : ""}`}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      disabled={busy}
      aria-pressed={on}
      aria-label={label}
      title={`${on ? "Remove" : "Add"} ${label.toLowerCase()}`}
    >
      {busy ? <Loader2 className="spin" /> : on ? <Check /> : <X />}
    </button>
  );
}

export default function Sustainability() {
  const { properties, raw, loading, reload } = useData();
  const { can } = useAuth();
  const toast = useToast();
  const [min, setMin] = useState(2);
  const [busy, setBusy] = useState(null); // "propertyId:key"

  const stats = useMemo(() => {
    const n = properties.length;
    const avg = n ? properties.reduce((s, p) => s + p.score, 0) / n : 0;
    return {
      n,
      avg,
      certified: properties.filter((p) => isCertified(p.greenCertification)).length,
      fullyGreen: properties.filter((p) => p.score === 3).length,
      notGreen: properties.filter((p) => p.score === 0).length,
      adoption: FEATURES.map((f) => ({ ...f, count: properties.filter((p) => isYes(p.features?.[f.key])).length })),
    };
  }, [properties]);

  const toggle = async (p, key) => {
    setBusy(`${p.propertyId}:${key}`);
    const current = p.features;
    const next = {
      featureId: current?.featureId ?? nextId(raw.features, "featureId", 401),
      propertyId: p.propertyId,
      solarPanels: current?.solarPanels ?? "No",
      rainwaterHarvesting: current?.rainwaterHarvesting ?? "No",
      wasteManagement: current?.wasteManagement ?? "No",
    };
    next[key] = isYes(next[key]) ? "No" : "Yes";
    try {
      if (current) await api.features.update(current.featureId, next);
      else await api.features.create(next);
      await reload(["features"]);
      const label = FEATURES.find((f) => f.key === key).label;
      toast.success(`${label} ${next[key] === "Yes" ? "added" : "removed"}`, p.address);
    } catch (err) {
      toast.error("Couldn't update feature", err.message);
    } finally {
      setBusy(null);
    }
  };

  const columns = [
    {
      key: "address",
      header: "Property",
      sort: (p) => p.address,
      render: (p) => (
        <div>
          <div className="cell-strong">{p.address}</div>
          <div className="muted" style={{ fontSize: 12 }}>
            #{p.propertyId} · {p.type}
          </div>
        </div>
      ),
    },
    ...FEATURES.map((f) => ({
      key: f.key,
      header: f.short,
      align: "center",
      sort: (p) => (isYes(p.features?.[f.key]) ? 1 : 0),
      render: (p) => (
        <FeatureToggle
          on={isYes(p.features?.[f.key])}
          busy={busy === `${p.propertyId}:${f.key}`}
          onClick={() => toggle(p, f.key)}
          label={f.label}
          readOnly={!can.editProperty(p)}
        />
      ),
    })),
    { key: "score", header: "Green score", sort: (p) => p.score, render: (p) => <GreenLeaves score={p.score} showLabel /> },
    { key: "energy", header: "Energy", align: "center", sort: (p) => energyRank(p.energyEfficiency), render: (p) => <EnergyBadge rating={p.energyEfficiency} /> },
    {
      key: "cert",
      header: "Certification",
      sort: (p) => p.greenCertification,
      render: (p) => (isCertified(p.greenCertification) ? <span className="badge good"><Award />{p.greenCertification}</span> : <span className="muted">None</span>),
    },
  ];

  return (
    <>
      <PageHeader
        eyebrow="Portfolio"
        icon={Leaf}
        title="Sustainability"
        description={
          can.isClient
            ? "See how green every property is, and find the most sustainable homes."
            : can.isAgent
              ? "Track green features across the portfolio. Click ✓ or ✗ on your own listings to update them."
              : "Track green features across the portfolio. Click a ✓ or ✗ to update a property's features."
        }
      />

      <div className="green-overview">
        <div className="card card-pad green-score-card">
          {loading ? (
            <Skeleton width={120} height={120} radius="50%" />
          ) : (
            <ScoreRing size={124} stroke={11} value={stats.avg} max={3} label={stats.avg.toFixed(1)} caption="avg of 3" />
          )}
          <div>
            <h2 className="card-title">Portfolio green score</h2>
            <p className="card-sub" style={{ marginBottom: 14 }}>
              Average number of green features per property
            </p>
            <div className="green-facts">
              <div>
                <strong>{stats.fullyGreen}</strong>
                <span>fully green (3/3)</span>
              </div>
              <div>
                <strong>{stats.certified}</strong>
                <span>certified</span>
              </div>
              <div>
                <strong className={stats.notGreen ? "text-bad" : ""}>{stats.notGreen}</strong>
                <span>can't be sold</span>
              </div>
            </div>
          </div>
        </div>
        <div className="card card-pad stack-16">
          <div>
            <h2 className="card-title">Feature adoption</h2>
            <p className="card-sub">Share of properties with each feature</p>
          </div>
          {loading
            ? [0, 1, 2].map((i) => <Skeleton key={i} height={30} />)
            : stats.adoption.map((f) => <Meter key={f.key} label={f.label} icon={f.icon} value={f.count} total={stats.n} />)}
        </div>
      </div>

      {stats.notGreen > 0 && !loading && (
        <div className="callout warn section">
          <Leaf />
          <div>
            <strong>
              {stats.notGreen} propert{stats.notGreen > 1 ? "ies have" : "y has"} no green features.
            </strong>{" "}
            The database trigger <code>trg_check_sustainability</code> will block any sale until at least one feature is added.
          </div>
        </div>
      )}

      <div className="green-split section">
        <section className="card">
          <div className="card-head">
            <div>
              <h2 className="card-title">Find green properties</h2>
              <p className="card-sub">
                <Database className="inline-icon" aria-hidden /> Runs stored procedure <code>get_properties_by_sustainability({min})</code>
              </p>
            </div>
          </div>
          <div className="card-body">
            <div style={{ marginBottom: 14 }}>
              <Segmented
                id="sp-min"
                label="Minimum green features"
                value={min}
                onChange={setMin}
                options={[0, 1, 2, 3].map((n) => ({ value: n, label: n === 0 ? "Any" : n === 3 ? "All 3" : `${n}+`, title: `At least ${n} green features` }))}
              />
            </div>
            <ProcedureResults key={min} min={min} />
          </div>
        </section>

        <div className="green-matrix">
          <DataTable
            columns={columns}
            rows={properties}
            rowKey={(p) => p.propertyId}
            loading={loading}
            initialSort={{ key: "score", dir: "desc" }}
            empty={<EmptyState icon={Leaf} title="No properties yet" />}
            footer={`${raw.features.length} sustainability records`}
          />
        </div>
      </div>
    </>
  );
}
