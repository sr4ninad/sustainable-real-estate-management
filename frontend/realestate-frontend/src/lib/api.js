// Single place for talking to the Spring Boot backend.
// In dev, Vite proxies /api to http://localhost:8080 (see vite.config.js).
// Set VITE_API_URL to call a backend on another origin directly.
const BASE_URL = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

export class ApiError extends Error {
  constructor(message, { status, detail } = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
  }
}

// Called when the session has expired (401 on anything other than the login call).
let onUnauthorized = null;
export function setUnauthorizedHandler(fn) {
  onUnauthorized = fn;
}

// The backend sends user-friendly messages; keep a few fallbacks for raw database errors.
function friendlyMessage(status, raw) {
  const text = (raw || "").toString();

  if (/not sustainable/i.test(text)) {
    return "Transaction blocked by the database: this property has no sustainability features (solar, rainwater or waste management).";
  }
  if (/already sold/i.test(text)) {
    return "This property is already sold or let.";
  }
  if (/foreign key constraint/i.test(text)) {
    return "This record is still linked to other data (listings, transactions or features). Remove those first.";
  }
  if (/Duplicate entry/i.test(text)) {
    return "A record with this ID already exists.";
  }
  if (text) return text;
  if (status === 401) return "Please sign in to continue.";
  if (status === 403) return "You don't have permission to do that.";
  if (status === 404) return "The requested record was not found.";
  if (status >= 500) return "The server hit an error while processing this request.";
  return `Request failed (${status})`;
}

async function request(path, { method = "GET", body, skipAuthRedirect = false } = {}) {
  let res;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method,
      credentials: "include",
      headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError("Can't reach the server. Is the Spring Boot backend running on port 8080?", {
      status: 0,
    });
  }

  const raw = await res.text();
  let data = null;
  if (raw) {
    try {
      data = JSON.parse(raw);
    } catch {
      data = raw;
    }
  }

  if (!res.ok) {
    const detail = typeof data === "object" && data ? data.message || data.error : data;
    if (res.status === 401 && !skipAuthRedirect) onUnauthorized?.();
    throw new ApiError(friendlyMessage(res.status, detail), { status: res.status, detail });
  }

  return data;
}

const crud = (resource) => ({
  list: () => request(`/api/${resource}`),
  create: (item) => request(`/api/${resource}`, { method: "POST", body: item }),
  update: (id, item) => request(`/api/${resource}/${id}`, { method: "PUT", body: item }),
  remove: (id) => request(`/api/${resource}/${id}`, { method: "DELETE" }),
});

export const api = {
  auth: {
    me: () => request("/api/auth/me", { skipAuthRedirect: true }),
    login: (username, password) =>
      request("/api/auth/login", { method: "POST", body: { username, password }, skipAuthRedirect: true }),
    logout: () => request("/api/auth/logout", { method: "POST", skipAuthRedirect: true }),
    changePassword: (currentPassword, newPassword) =>
      request("/api/auth/password", { method: "POST", body: { currentPassword, newPassword } }),
  },
  users: crud("users"),
  agents: {
    ...crud("agents"),
    // Stored procedure calculate_agent_commission(id)
    commission: (id) => request(`/api/agents/${id}/commission`),
  },
  clients: crud("clients"),
  properties: {
    ...crud("properties"),
    // Property + green features in one database transaction
    createFull: (item) => request("/api/properties/full", { method: "POST", body: item }),
    updateFull: (id, item) => request(`/api/properties/${id}/full`, { method: "PUT", body: item }),
    // Stored procedure get_properties_by_sustainability(min) → [{ propertyId, address, price, featureCount }]
    bySustainability: (min) => request(`/api/properties/filter/${min}`),
    // Strategy pattern: prices adjusted for buyer / seller / renter
    withStrategy: (type) => request(`/api/properties/with-strategy/${type}`),
    // MySQL functions
    pricePerSqft: (id) => request(`/api/functions/price-per-sqft/${id}`),
    propertyTax: (id) => request(`/api/functions/property-tax/${id}`),
  },
  transactions: crud("transactions"),
  features: crud("features"),
  logs: { list: () => request("/api/logs") },
};
