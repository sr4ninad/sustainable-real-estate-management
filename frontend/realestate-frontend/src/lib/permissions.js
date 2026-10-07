// What each role may do in the UI. The backend enforces the same rules;
// these only decide which buttons and pages to show.

export const ROLE_LABELS = { ADMIN: "Admin", AGENT: "Agent", CLIENT: "Client" };

export function permissionsFor(user) {
  const role = user?.role;
  const isAdmin = role === "ADMIN";
  const isAgent = role === "AGENT";
  const isClient = role === "CLIENT";
  const ownsListing = (property) => isAdmin || (isAgent && property?.agentId === user.agentId);

  return {
    role,
    isAdmin,
    isAgent,
    isClient,
    // Properties & sustainability
    createProperty: isAdmin || isAgent,
    editProperty: ownsListing,
    deleteProperty: ownsListing,
    reassignListing: isAdmin,
    // People
    viewClients: isAdmin || isAgent,
    createClient: isAdmin || isAgent,
    editClient: (client) => isAdmin || isAgent || (isClient && client?.clientId === user.clientId),
    deleteClient: isAdmin,
    createAgent: isAdmin,
    editAgent: (agent) => isAdmin || (isAgent && agent?.agentId === user.agentId),
    deleteAgent: isAdmin,
    // Deals
    createTransaction: isAdmin || isAgent,
    editTransaction: (t) => isAdmin || (isAgent && t?.property?.agentId === user.agentId),
    deleteTransaction: isAdmin,
    // Admin
    manageUsers: isAdmin,
  };
}
