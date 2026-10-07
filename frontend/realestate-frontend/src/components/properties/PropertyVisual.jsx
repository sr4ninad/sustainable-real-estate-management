import { Building, Building2, Castle, Home, LandPlot, Store } from "lucide-react";

const VISUALS = {
  apartment: { icon: Building2, hue: "teal" },
  villa: { icon: Castle, hue: "amber" },
  residential: { icon: Home, hue: "green" },
  commercial: { icon: Store, hue: "indigo" },
  office: { icon: Building, hue: "indigo" },
  plot: { icon: LandPlot, hue: "olive" },
};

/** Decorative header for a property (there are no photos in the schema). */
export default function PropertyVisual({ property, tall, children }) {
  const v = VISUALS[String(property.type || "").toLowerCase()] || { icon: Building2, hue: "slate" };
  const Icon = v.icon;
  return (
    <div className={`pv pv-${v.hue} ${tall ? "tall" : ""}`} aria-hidden={!children}>
      <div className="pv-grid" />
      <Icon className="pv-icon" strokeWidth={1.25} />
      <span className="pv-type">{property.type || "Property"}</span>
      {children}
    </div>
  );
}
