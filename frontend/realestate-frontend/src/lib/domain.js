// Domain helpers shared by pages: sustainability scoring, ratings, joins.

export const FEATURE_KEYS = ["solarPanels", "rainwaterHarvesting", "wasteManagement"];

export const isYes = (value) => String(value ?? "").toLowerCase() === "yes";

/** Number of green features (0–3) a property has. */
export function greenScore(features) {
  if (!features) return 0;
  return FEATURE_KEYS.reduce((n, key) => n + (isYes(features[key]) ? 1 : 0), 0);
}

export const GREEN_LABELS = ["Not green", "Basic", "Good", "Excellent"];

export const ENERGY_RATINGS = ["A+", "A", "B", "C", "D", "E"];
export const CERTIFICATIONS = ["LEED", "GRIHA", "IGBC", "BREEAM", "None"];
export const PROPERTY_TYPES = ["Apartment", "Villa", "Residential", "Commercial", "Office", "Plot"];
export const CLIENT_TYPES = ["buyer", "seller", "renter"];

/** "top" | "mid" | "low" | "none" — used for rating badge styling. */
export function energyTier(rating) {
  const r = String(rating ?? "").toUpperCase().trim();
  if (r === "A+" || r === "A" || r === "HIGH") return "top";
  if (r === "B" || r === "MEDIUM") return "mid";
  if (!r || r === "NONE") return "none";
  return "low";
}

export function energyRank(rating) {
  const idx = ENERGY_RATINGS.indexOf(String(rating ?? "").toUpperCase().trim());
  return idx === -1 ? ENERGY_RATINGS.length : idx;
}

export const isCertified = (cert) => !!cert && String(cert).toLowerCase() !== "none";

export const isAvailable = (p) => String(p?.availabilityStatus ?? "").toLowerCase() === "available";

/** Normalises DB values like "Buyer" / "buyer" to "buyer". */
export const clientType = (client) => String(client?.type ?? "").toLowerCase();

export function nextId(items, key, start = 1) {
  const max = items.reduce((m, item) => Math.max(m, Number(item[key]) || 0), 0);
  return max ? max + 1 : start;
}

/**
 * Joins the flat API tables into rich objects the UI can render directly.
 */
export function buildIndex({ agents, clients, properties, transactions, features, logs }) {
  const agentById = new Map(agents.map((a) => [a.agentId, a]));
  const clientById = new Map(clients.map((c) => [c.clientId, c]));
  const featuresByProperty = new Map(features.map((f) => [f.propertyId, f]));

  const txByProperty = new Map();
  const txByClient = new Map();
  for (const t of transactions) {
    if (!txByProperty.has(t.propertyId)) txByProperty.set(t.propertyId, []);
    txByProperty.get(t.propertyId).push(t);
    if (!txByClient.has(t.clientId)) txByClient.set(t.clientId, []);
    txByClient.get(t.clientId).push(t);
  }

  const logsByProperty = new Map();
  for (const l of logs) {
    if (!logsByProperty.has(l.propertyId)) logsByProperty.set(l.propertyId, []);
    logsByProperty.get(l.propertyId).push(l);
  }

  const richProperties = properties.map((p) => {
    const f = featuresByProperty.get(p.propertyId) || null;
    return {
      ...p,
      features: f,
      score: greenScore(f),
      agent: agentById.get(p.agentId) || null,
      transactions: txByProperty.get(p.propertyId) || [],
      logs: logsByProperty.get(p.propertyId) || [],
      pricePerSqft: p.size > 0 ? p.price / p.size : null,
      available: isAvailable(p),
    };
  });
  const propertyById = new Map(richProperties.map((p) => [p.propertyId, p]));

  const richAgents = agents.map((a) => {
    const listings = richProperties.filter((p) => p.agentId === a.agentId);
    const deals = listings.flatMap((p) => p.transactions);
    const closedValue = deals.reduce((s, t) => s + (Number(t.amount) || 0), 0);
    return {
      ...a,
      listings,
      deals,
      portfolioValue: listings.reduce((s, p) => s + (Number(p.price) || 0), 0),
      closedValue,
      commission: closedValue * 0.03,
      availableCount: listings.filter((p) => p.available).length,
    };
  });

  const richClients = clients.map((c) => {
    const deals = txByClient.get(c.clientId) || [];
    return {
      ...c,
      kind: clientType(c),
      deals,
      totalValue: deals.reduce((s, t) => s + (Number(t.amount) || 0), 0),
    };
  });

  const richTransactions = transactions.map((t) => ({
    ...t,
    property: propertyById.get(t.propertyId) || null,
    client: clientById.get(t.clientId) || null,
  }));

  return {
    agentById,
    clientById,
    propertyById,
    featuresByProperty,
    properties: richProperties,
    agents: richAgents,
    clients: richClients,
    transactions: richTransactions,
  };
}
