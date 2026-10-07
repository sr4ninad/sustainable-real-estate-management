import {
  ArrowLeftRight,
  Building2,
  History,
  LayoutDashboard,
  Leaf,
  ShieldCheck,
  UserRound,
  Users,
} from "lucide-react";

const ALL = ["ADMIN", "AGENT", "CLIENT"];

// `roles` decides who sees an item; `clientLabel` renames it for clients.
export const NAV = [
  {
    title: "Overview",
    items: [{ to: "/", label: "Dashboard", clientLabel: "My home", icon: LayoutDashboard, end: true, roles: ALL }],
  },
  {
    title: "Portfolio",
    items: [
      { to: "/properties", label: "Properties", icon: Building2, count: "properties", roles: ALL },
      { to: "/sustainability", label: "Sustainability", icon: Leaf, roles: ALL },
    ],
  },
  {
    title: "People",
    items: [
      { to: "/clients", label: "Clients", icon: Users, count: "clients", roles: ["ADMIN", "AGENT"] },
      { to: "/agents", label: "Agents", icon: UserRound, count: "agents", roles: ALL },
    ],
  },
  {
    title: "Deals",
    items: [
      { to: "/transactions", label: "Transactions", clientLabel: "My deals", icon: ArrowLeftRight, count: "transactions", roles: ALL },
      { to: "/price-history", label: "Price history", icon: History, roles: ALL },
    ],
  },
  {
    title: "Admin",
    items: [{ to: "/users", label: "Users & access", icon: ShieldCheck, roles: ["ADMIN"] }],
  },
];

/** The navigation visible to a role, with labels adjusted for clients. */
export function navFor(role) {
  return NAV.map((group) => ({
    ...group,
    items: group.items
      .filter((item) => item.roles.includes(role))
      .map((item) => ({ ...item, label: role === "CLIENT" && item.clientLabel ? item.clientLabel : item.label })),
  })).filter((group) => group.items.length);
}
