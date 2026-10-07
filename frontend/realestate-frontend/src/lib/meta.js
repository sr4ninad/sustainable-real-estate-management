import { Briefcase, Droplets, Home, KeyRound, Recycle, ShoppingBag, Sun, Tag } from "lucide-react";

export const FEATURES = [
  { key: "solarPanels", label: "Solar panels", short: "Solar", icon: Sun, blurb: "On-site renewable power" },
  { key: "rainwaterHarvesting", label: "Rainwater harvesting", short: "Rainwater", icon: Droplets, blurb: "Captures and reuses rainfall" },
  { key: "wasteManagement", label: "Waste management", short: "Waste", icon: Recycle, blurb: "Segregation & composting" },
];

export const CLIENT_META = {
  buyer: { label: "Buyer", icon: ShoppingBag, tone: "info", strategy: "Price after discount" },
  seller: { label: "Seller", icon: Tag, tone: "warn", strategy: "Max selling price" },
  renter: { label: "Renter", icon: KeyRound, tone: "good", strategy: "Monthly rent" },
};

export const TYPE_ICONS = {
  apartment: Home,
  villa: Home,
  residential: Home,
  commercial: Briefcase,
  office: Briefcase,
};
