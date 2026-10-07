import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeftRight,
  ArrowRight,
  Award,
  BadgeIndianRupee,
  Building2,
  Leaf,
  Plus,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react";
import { useAuth, useData } from "../context/contexts";
import { api } from "../lib/api";
import { BarList, ColumnChart, Meter } from "../components/charts/Charts";
import { Avatar, EmptyState, Skeleton, StatCard } from "../components/ui/primitives";
import { ENERGY_RATINGS, GREEN_LABELS, isCertified } from "../lib/domain";
import { FEATURES } from "../lib/meta";
import { formatDate, formatINRCompact, formatPercent, parseDate } from "../lib/format";

function greeting(hour) {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function useDashboardMetrics() {
  const { properties, transactions, clients, agents, raw } = useData();

  return useMemo(() => {
    const portfolioValue = properties.reduce((s, p) => s + (Number(p.price) || 0), 0);
    const available = properties.filter((p) => p.available).length;
    const salesVolume = transactions.reduce((s, t) => s + (Number(t.amount) || 0), 0);
    const avgScore = properties.length ? properties.reduce((s, p) => s + p.score, 0) / properties.length : 0;
    const certified = properties.filter((p) => isCertified(p.greenCertification)).length;

    const byKind = { buyer: 0, seller: 0, renter: 0 };
    clients.forEach((c) => {
      if (c.kind in byKind) byKind[c.kind] += 1;
    });

    // Sales by month
    const months = new Map();
    for (const t of transactions) {
      const d = parseDate(t.date);
      if (!d) continue;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const entry = months.get(key) || { key, date: d, value: 0, count: 0 };
      entry.value += Number(t.amount) || 0;
      entry.count += 1;
      months.set(key, entry);
    }
    const salesByMonth = [...months.values()]
      .sort((a, b) => a.key.localeCompare(b.key))
      .slice(-8)
      .map((m) => ({
        label: m.date.toLocaleDateString("en-IN", { month: "short", year: "2-digit" }),
        value: m.value,
        tooltip: `${formatINRCompact(m.value)} · ${m.count} deal${m.count === 1 ? "" : "s"}`,
      }));

    // Energy ratings in rating order, then anything unrecognised
    const ratingCounts = new Map();
    properties.forEach((p) => {
      const r = (p.energyEfficiency || "Unrated").toUpperCase();
      ratingCounts.set(r, (ratingCounts.get(r) || 0) + 1);
    });
    const order = [...ENERGY_RATINGS, ...[...ratingCounts.keys()].filter((k) => !ENERGY_RATINGS.includes(k))];
    const energy = order
      .filter((r) => ratingCounts.has(r))
      .map((r) => ({
        label: r === "UNRATED" ? "Unrated" : r,
        value: ratingCounts.get(r),
        tooltip: `${ratingCounts.get(r)} of ${properties.length} properties (${formatPercent(
          ratingCounts.get(r) / properties.length
        )})`,
      }));

    const adoption = FEATURES.map((f) => ({
      ...f,
      count: properties.filter((p) => String(p.features?.[f.key] ?? "").toLowerCase() === "yes").length,
    }));

    const topAgents = [...agents].sort((a, b) => b.closedValue - a.closedValue || b.portfolioValue - a.portfolioValue).slice(0, 5);

    const activity = [
      ...transactions.map((t) => ({
        kind: "sale",
        id: `t-${t.transactionId}`,
        date: parseDate(t.date),
        title: t.property?.address ?? `Property #${t.propertyId}`,
        text: `${t.client?.name ?? `Client #${t.clientId}`} closed for ${formatINRCompact(t.amount)}`,
      })),
      ...raw.logs
        .filter((l) => Number(l.oldPrice) !== Number(l.newPrice))
        .map((l) => {
          const up = Number(l.newPrice) > Number(l.oldPrice);
          return {
            kind: up ? "up" : "down",
            id: `l-${l.logId}`,
            date: parseDate(l.updatedAt),
            title: properties.find((p) => p.propertyId === l.propertyId)?.address ?? `Property #${l.propertyId}`,
            text: `Price ${up ? "raised" : "cut"} ${formatINRCompact(l.oldPrice)} → ${formatINRCompact(l.newPrice)}`,
          };
        }),
    ]
      .filter((a) => a.date)
      .sort((a, b) => b.date - a.date)
      .slice(0, 6);

    const topRated = properties.filter((p) => ["A+", "A"].includes(String(p.energyEfficiency).toUpperCase())).length;

    return {
      topRated,
      portfolioValue,
      available,
      salesVolume,
      avgScore,
      certified,
      byKind,
      salesByMonth,
      energy,
      adoption,
      topAgents,
      activity,
    };
  }, [properties, transactions, clients, agents, raw.logs]);
}

const ACTIVITY_ICONS = { sale: ArrowLeftRight, up: TrendingUp, down: TrendingDown };

/** Agent's own numbers; commission comes from the calculate_agent_commission procedure. */
function AgentPerformance({ agentId }) {
  const { agents } = useData();
  const me = agents.find((a) => a.agentId === agentId);
  const [commission, setCommission] = useState(null);

  useEffect(() => {
    let cancelled = false;
    api.agents
      .commission(agentId)
      .then((c) => !cancelled && setCommission(c))
      .catch(() => !cancelled && setCommission(false));
    return () => {
      cancelled = true;
    };
  }, [agentId]);

  if (!me) return null;
  return (
    <section className="section">
      <div className="section-head">
        <h2 className="section-title">Your performance</h2>
        <Link to="/properties" className="card-link">
          Your listings <ArrowRight />
        </Link>
      </div>
      <div className="stats">
        <StatCard label="Your listings" icon={Building2} value={me.listings.length} foot={`${me.availableCount} still available`} />
        <StatCard label="Portfolio value" icon={BadgeIndianRupee} value={formatINRCompact(me.portfolioValue)} foot="Across your listings" />
        <StatCard
          label="Closed deals"
          icon={ArrowLeftRight}
          loading={commission === null}
          value={commission ? commission.totalSales : me.deals.length}
          foot={commission ? `${formatINRCompact(commission.totalSalesValue)} closed` : "—"}
        />
        <StatCard
          label="Commission earned"
          icon={Award}
          loading={commission === null}
          value={commission ? formatINRCompact(commission.totalCommission) : "—"}
          foot="3% · calculate_agent_commission()"
        />
      </div>
    </section>
  );
}

export default function Dashboard() {
  const { properties, transactions, clients, loading } = useData();
  const { user, can } = useAuth();
  const m = useDashboardMetrics();
  const [hour] = useState(() => new Date().getHours());
  const roundedScore = Math.round(m.avgScore);

  return (
    <div className="dash">
      <section className="hero">
        <div className="hero-bg" aria-hidden />
        <div className="hero-content">
          <div className="hero-text">
            <span className="hero-eyebrow">
              <Leaf aria-hidden /> {greeting(hour)}
            </span>
            <h1 className="hero-title">Your sustainable portfolio, at a glance.</h1>
            <div className="hero-figure">
              <span className="hero-figure-label">Total portfolio value</span>
              {loading ? (
                <Skeleton width={240} height={48} style={{ opacity: 0.3 }} />
              ) : (
                <span className="hero-figure-value">{formatINRCompact(m.portfolioValue)}</span>
              )}
              <span className="hero-figure-sub">
                across {properties.length} properties · {m.available} available now
              </span>
            </div>
            <div className="hero-actions">
              {can.createProperty && (
                <Link to="/properties?new=1" className="btn btn-primary btn-lg">
                  <Plus /> Add property
                </Link>
              )}
              {can.createTransaction && (
                <Link to="/transactions?new=1" className="btn btn-lg hero-ghost">
                  <ArrowLeftRight /> Record a deal
                </Link>
              )}
            </div>
          </div>

          <div className="hero-glass">
            <div className="hero-glass-row">
              <span>Avg. green score</span>
              <strong>
                {m.avgScore.toFixed(1)}
                <small>/3</small>
              </strong>
            </div>
            <div className="hero-glass-bar">
              <span style={{ width: `${(m.avgScore / 3) * 100}%` }} />
            </div>
            <p className="hero-glass-note">{GREEN_LABELS[roundedScore]} on average across the portfolio</p>
            <div className="hero-glass-split">
              <div>
                <span>Certified</span>
                <strong>
                  {m.certified}/{properties.length}
                </strong>
              </div>
              <div>
                <span>Deals closed</span>
                <strong>{transactions.length}</strong>
              </div>
            </div>
          </div>
        </div>
      </section>

      {can.isAgent && !loading && <AgentPerformance agentId={user.agentId} />}

      {can.isAgent && <h2 className="section-title section">Whole portfolio</h2>}
      <div className={`stats ${can.isAgent ? "" : "section"}`} style={can.isAgent ? { marginTop: 12 } : undefined}>
        <StatCard
          loading={loading}
          label="Sales volume"
          icon={BadgeIndianRupee}
          value={formatINRCompact(m.salesVolume)}
          foot={`${transactions.length} completed transactions`}
        />
        <StatCard
          loading={loading}
          label="Available listings"
          icon={Building2}
          value={`${m.available} / ${properties.length}`}
          foot={properties.length ? `${formatPercent(m.available / properties.length)} of inventory on the market` : "No listings yet"}
        />
        <StatCard
          loading={loading}
          label="Clients"
          icon={Users}
          value={clients.length}
          foot={`${m.byKind.buyer} buyers · ${m.byKind.seller} sellers · ${m.byKind.renter} renters`}
        />
        <StatCard
          loading={loading}
          label="Green certified"
          icon={Award}
          value={properties.length ? formatPercent(m.certified / properties.length) : "—"}
          foot="LEED, GRIHA or equivalent"
        />
      </div>

      <div className="dash-grid section">
        <div className="card span-7">
          <div className="card-head">
            <div>
              <h2 className="card-title">Sales by month</h2>
              <p className="card-sub">Transaction value closed per month (₹)</p>
            </div>
            <Link to="/transactions" className="card-link">
              All deals <ArrowRight />
            </Link>
          </div>
          <div className="card-body">
            {loading ? (
              <Skeleton height={220} />
            ) : m.salesByMonth.length ? (
              <ColumnChart
                data={m.salesByMonth}
                format={formatINRCompact}
                ariaLabel="Column chart of sales value by month"
              />
            ) : (
              <EmptyState icon={ArrowLeftRight} title="No sales yet" text="Recorded transactions will appear here by month." />
            )}
          </div>
        </div>

        <div className="card span-5">
          <div className="card-head">
            <div>
              <h2 className="card-title">Energy efficiency</h2>
              <p className="card-sub">Properties by energy rating</p>
            </div>
          </div>
          <div className="card-body">
            {loading ? (
              <Skeleton height={180} />
            ) : m.energy.length ? (
              <BarList
                rows={m.energy}
                format={(v) => `${v}`}
                ariaLabel="Number of properties per energy rating"
              />
            ) : (
              <EmptyState icon={Leaf} title="No ratings yet" />
            )}
            {!loading && properties.length > 0 && (
              <div className="callout good" style={{ marginTop: 18 }}>
                <Leaf />
                <div>
                  <strong>{m.topRated} of {properties.length}</strong> properties are rated A or better. Hover a bar
                  for its share of the portfolio.
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="card span-4">
          <div className="card-head">
            <div>
              <h2 className="card-title">Sustainability adoption</h2>
              <p className="card-sub">Share of properties with each feature</p>
            </div>
            <Link to="/sustainability" className="card-link">
              Details <ArrowRight />
            </Link>
          </div>
          <div className="card-body stack-16">
            {loading
              ? [0, 1, 2].map((i) => <Skeleton key={i} height={30} />)
              : [
                  ...m.adoption.map((f) => (
                    <Meter key={f.key} label={f.label} icon={f.icon} value={f.count} total={properties.length} />
                  )),
                  <Meter key="cert" label="Green certified" icon={Award} value={m.certified} total={properties.length} />,
                  <Meter
                    key="full"
                    label="All three features"
                    icon={Leaf}
                    value={properties.filter((p) => p.score === 3).length}
                    total={properties.length}
                  />,
                ]}
          </div>
        </div>

        <div className="card span-4">
          <div className="card-head">
            <div>
              <h2 className="card-title">Top agents</h2>
              <p className="card-sub">By value of closed deals</p>
            </div>
            <Link to="/agents" className="card-link">
              All agents <ArrowRight />
            </Link>
          </div>
          <div className="card-body">
            <ol className="rank-list">
              {loading
                ? [0, 1, 2, 3].map((i) => <Skeleton key={i} height={34} />)
                : m.topAgents.map((a, i) => (
                    <li key={a.agentId}>
                      <span className="rank-num">{i + 1}</span>
                      <Avatar name={a.name} size="sm" />
                      <div className="rank-main">
                        <div className="rank-name">{a.name}</div>
                        <div className="rank-sub">
                          {a.deals.length} deal{a.deals.length === 1 ? "" : "s"} · {a.listings.length} listing
                          {a.listings.length === 1 ? "" : "s"}
                        </div>
                      </div>
                      <strong className="num">{formatINRCompact(a.closedValue)}</strong>
                    </li>
                  ))}
            </ol>
          </div>
        </div>

        <div className="card span-4">
          <div className="card-head">
            <div>
              <h2 className="card-title">Recent activity</h2>
              <p className="card-sub">Deals and price changes</p>
            </div>
            <Link to="/price-history" className="card-link">
              History <ArrowRight />
            </Link>
          </div>
          <div className="card-body">
            {loading ? (
              [0, 1, 2, 3].map((i) => <Skeleton key={i} height={34} style={{ marginBottom: 10 }} />)
            ) : m.activity.length ? (
              <ul className="activity">
                {m.activity.map((a) => {
                  const Icon = ACTIVITY_ICONS[a.kind];
                  return (
                    <li key={a.id} className={`activity-item ${a.kind}`}>
                      <span className="activity-icon">
                        <Icon aria-hidden />
                      </span>
                      <div className="activity-main">
                        <div className="activity-title">{a.title}</div>
                        <div className="activity-text">{a.text}</div>
                      </div>
                      <time className="activity-date" dateTime={a.date.toISOString()}>
                        {formatDate(a.date, { day: "numeric", month: "short" })}
                      </time>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <EmptyState icon={ArrowLeftRight} title="Nothing yet" text="Deals and price updates will show up here." />
            )}
          </div>
        </div>
      </div>

      {!loading && clients.length > 0 && (
        <p className="dash-foot muted">
          Tip: press <kbd>Ctrl</kbd> <kbd>K</kbd> anywhere to search or jump to a page.
        </p>
      )}
    </div>
  );
}
