import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeftRight, ArrowRight, Building2, Leaf, Mail, Phone } from "lucide-react";
import { useAuth, useData } from "../context/contexts";
import StrategyExplorer from "../components/people/StrategyExplorer";
import PropertyVisual from "../components/properties/PropertyVisual";
import { ClientTypeBadge, EmptyState, EnergyBadge, GreenLeaves, Person, Skeleton } from "../components/ui/primitives";
import { formatDate, formatINR, formatINRCompact } from "../lib/format";

function greeting(hour) {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

/** Home page for clients: their deals, their agents, and the greenest homes on offer. */
export default function ClientHome() {
  const { user } = useAuth();
  const { properties, transactions, loading } = useData();
  const [hour] = useState(() => new Date().getHours());
  const firstName = user.displayName.split(" ")[0];

  const myDeals = useMemo(
    () => [...transactions].sort((a, b) => String(b.date).localeCompare(String(a.date))),
    [transactions]
  );
  const myAgents = useMemo(() => {
    const seen = new Map();
    myDeals.forEach((t) => t.property?.agent && seen.set(t.property.agent.agentId, t.property.agent));
    return [...seen.values()];
  }, [myDeals]);
  const greenest = useMemo(
    () =>
      properties
        .filter((p) => p.available && p.score > 0)
        .sort((a, b) => b.score - a.score || a.price - b.price)
        .slice(0, 3),
    [properties]
  );

  return (
    <div className="dash">
      <section className="hero hero-client">
        <div className="hero-bg" aria-hidden />
        <div className="hero-content">
          <div className="hero-text">
            <span className="hero-eyebrow">
              <Leaf aria-hidden /> {greeting(hour)}
            </span>
            <h1 className="hero-title">Welcome back, {firstName}.</h1>
            <p className="hero-lead">
              {properties.filter((p) => p.available && p.score > 0).length} sustainable homes are available right now.
              Every sale is checked against the property's green credentials first.
            </p>
            <div className="hero-actions">
              <Link to="/properties" className="btn btn-primary btn-lg">
                <Building2 /> Browse properties
              </Link>
              <Link to="/sustainability" className="btn btn-lg hero-ghost">
                <Leaf /> Find the greenest homes
              </Link>
            </div>
          </div>
          <div className="hero-glass">
            <div className="hero-glass-row">
              <span>You're a</span>
              {user.clientType && <ClientTypeBadge type={user.clientType} />}
            </div>
            <div className="hero-glass-split">
              <div>
                <span>Your deals</span>
                <strong>{myDeals.length}</strong>
              </div>
              <div>
                <span>Total value</span>
                <strong>{formatINRCompact(myDeals.reduce((s, t) => s + Number(t.amount || 0), 0))}</strong>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="dash-grid section">
        <div className="card span-7">
          <div className="card-head">
            <div>
              <h2 className="card-title">Your deals</h2>
              <p className="card-sub">Properties you've bought or rented through us</p>
            </div>
            <Link to="/transactions" className="card-link">
              All deals <ArrowRight />
            </Link>
          </div>
          <div className="card-body">
            {loading ? (
              <Skeleton height={120} />
            ) : myDeals.length ? (
              <ul className="mini-list">
                {myDeals.map((t) => (
                  <li key={t.transactionId}>
                    <div>
                      <Link to={`/properties?id=${t.propertyId}`} className="mini-title link-strong">
                        {t.property?.address ?? `Property #${t.propertyId}`}
                      </Link>
                      <div className="mini-sub">
                        #{t.transactionId} · {formatDate(t.date)}
                      </div>
                    </div>
                    <strong className="num">{formatINR(t.amount)}</strong>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState icon={ArrowLeftRight} title="No deals yet" text="When you buy or rent a property, it will show up here." />
            )}
          </div>
        </div>

        <div className="card span-5">
          <div className="card-head">
            <div>
              <h2 className="card-title">Your agents</h2>
              <p className="card-sub">The people who handled your deals</p>
            </div>
          </div>
          <div className="card-body stack-16">
            {loading ? (
              <Skeleton height={60} />
            ) : myAgents.length ? (
              myAgents.map((a) => (
                <div key={a.agentId} className="agent-contact-row">
                  <Person name={a.name} sub={`Agent #${a.agentId}`} />
                  <div className="contact-links">
                    {a.contactNo && (
                      <a href={`tel:${a.contactNo}`}>
                        <Phone aria-hidden /> Call
                      </a>
                    )}
                    {a.email && (
                      <a href={`mailto:${a.email}`}>
                        <Mail aria-hidden /> Email
                      </a>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="muted">
                Browse <Link to="/agents" className="card-link">our agents</Link> to find someone to talk to.
              </p>
            )}
          </div>
        </div>
      </div>

      <section className="section">
        <div className="section-head">
          <h2 className="section-title">Greenest homes available now</h2>
          <Link to="/properties" className="card-link">
            See all <ArrowRight />
          </Link>
        </div>
        <div className="prop-grid">
          {greenest.map((p) => (
            <Link key={p.propertyId} to={`/properties?id=${p.propertyId}`} className="card prop-card">
              <PropertyVisual property={p} />
              <div className="prop-card-body">
                <div className="prop-card-price">
                  <span>{formatINRCompact(p.price)}</span>
                </div>
                <h3 className="prop-card-title">{p.address}</h3>
                <div className="prop-card-foot">
                  <div className="prop-card-green">
                    <GreenLeaves score={p.score} showLabel />
                    <EnergyBadge rating={p.energyEfficiency} />
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {user.clientType && (
        <div className="section">
          <StrategyExplorer initialType={user.clientType} />
        </div>
      )}
    </div>
  );
}
