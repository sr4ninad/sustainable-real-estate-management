import { useState } from "react";
import { Building2, Pencil } from "lucide-react";
import Modal from "../ui/Modal";
import { Field } from "../ui/primitives";
import { useAuth, useData, useToast } from "../../context/contexts";
import { api } from "../../lib/api";
import { CERTIFICATIONS, ENERGY_RATINGS, isYes, nextId, PROPERTY_TYPES } from "../../lib/domain";
import { FEATURES } from "../../lib/meta";
import { formatINRCompact } from "../../lib/format";

function initialValues(property, properties, user) {
  if (property) {
    return {
      propertyId: String(property.propertyId),
      address: property.address ?? "",
      type: property.type ?? "",
      size: property.size ?? "",
      price: property.price ?? "",
      energyEfficiency: property.energyEfficiency ?? "",
      greenCertification: property.greenCertification ?? "None",
      availabilityStatus: property.availabilityStatus ?? "Available",
      agentId: property.agentId ?? "",
      solarPanels: isYes(property.features?.solarPanels),
      rainwaterHarvesting: isYes(property.features?.rainwaterHarvesting),
      wasteManagement: isYes(property.features?.wasteManagement),
    };
  }
  return {
    propertyId: String(nextId(properties, "propertyId", 201)),
    address: "",
    type: "Apartment",
    size: "",
    price: "",
    energyEfficiency: "A",
    greenCertification: "None",
    availabilityStatus: "Available",
    agentId: user?.role === "AGENT" ? String(user.agentId) : "",
    solarPanels: false,
    rainwaterHarvesting: false,
    wasteManagement: false,
  };
}

function validate(v, { isEdit, properties }) {
  const errors = {};
  const id = Number(v.propertyId);
  if (!v.propertyId || !Number.isInteger(id) || id <= 0) errors.propertyId = "Enter a positive whole number";
  else if (!isEdit && properties.some((p) => p.propertyId === id)) errors.propertyId = `ID ${id} is already taken`;
  if (!v.address.trim()) errors.address = "Address is required";
  if (v.price === "" || Number(v.price) <= 0) errors.price = "Enter a price above zero";
  if (v.size !== "" && (!Number.isFinite(Number(v.size)) || Number(v.size) <= 0)) errors.size = "Size must be a positive number";
  return errors;
}

export default function PropertyForm({ open, property, onClose, onSaved }) {
  const { properties, agents, reload } = useData();
  const { user, can } = useAuth();
  const toast = useToast();
  const isEdit = !!property;
  const [values, setValues] = useState(() => initialValues(property, properties, user));
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);

  const set = (key) => (e) => {
    const value = e?.target ? e.target.value : e;
    const next = { ...values, [key]: value };
    setValues(next);
    if (touched) setErrors(validate(next, { isEdit, properties }));
  };

  const submit = async () => {
    setTouched(true);
    const errs = validate(values, { isEdit, properties });
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setSaving(true);
    const id = Number(values.propertyId);
    const payload = {
      propertyId: id,
      address: values.address.trim(),
      type: values.type || null,
      size: values.size === "" ? null : Number(values.size),
      price: Number(values.price),
      energyEfficiency: values.energyEfficiency || null,
      greenCertification: values.greenCertification || null,
      availabilityStatus: values.availabilityStatus,
      agentId: values.agentId === "" ? null : Number(values.agentId),
    };

    try {
      // Property and its green features are saved in one database transaction.
      const body = {
        ...payload,
        solarPanels: values.solarPanels,
        rainwaterHarvesting: values.rainwaterHarvesting,
        wasteManagement: values.wasteManagement,
      };
      if (isEdit) await api.properties.updateFull(id, body);
      else await api.properties.createFull(body);
    } catch (err) {
      setSaving(false);
      toast.error("Couldn't save property", err.message);
      return;
    }

    await reload(["properties", "features", "logs"]);
    setSaving(false);
    toast.success(isEdit ? "Property updated" : "Property added", `${payload.address} · ${formatINRCompact(payload.price)}`);
    onSaved?.(id);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      as="form"
      onSubmit={submit}
      size="lg"
      icon={isEdit ? Pencil : Building2}
      title={isEdit ? `Edit property #${property.propertyId}` : "Add a property"}
      subtitle={isEdit ? property.address : "List a new property and record its green credentials."}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? "Saving…" : isEdit ? "Save changes" : "Add property"}
          </button>
        </>
      }
    >
      <div className="form-grid">
        <div className="form-section-title">Listing</div>
        <Field label="Property ID" required error={errors.propertyId} hint={!isEdit ? "Suggested next free ID" : "IDs can't be changed"}>
          <input
            className="input num"
            inputMode="numeric"
            value={values.propertyId}
            onChange={set("propertyId")}
            disabled={isEdit}
            aria-invalid={!!errors.propertyId}
          />
        </Field>
        <Field label="Type">
          <select className="select" value={values.type} onChange={set("type")}>
            {[...new Set([...PROPERTY_TYPES, values.type].filter(Boolean))].map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </Field>
        <Field label="Address" required error={errors.address} className="span-2">
          <input
            className="input"
            value={values.address}
            onChange={set("address")}
            placeholder="e.g. 12 MG Road, Bengaluru"
            aria-invalid={!!errors.address}
          />
        </Field>
        <Field label="Price" required error={errors.price} hint={values.price ? formatINRCompact(values.price) : undefined}>
          <div className="input-affix">
            <span className="affix">₹</span>
            <input
              className="input num"
              inputMode="decimal"
              value={values.price}
              onChange={set("price")}
              placeholder="5000000"
              aria-invalid={!!errors.price}
            />
          </div>
        </Field>
        <Field label="Size" error={errors.size}>
          <div className="input-affix">
            <input
              className="input num"
              style={{ paddingLeft: 12 }}
              inputMode="numeric"
              value={values.size}
              onChange={set("size")}
              placeholder="1500"
              aria-invalid={!!errors.size}
            />
            <span className="suffix">sq ft</span>
          </div>
        </Field>
        <Field label="Listing agent" hint={can.reassignListing ? undefined : "Your listings are always assigned to you"}>
          <select className="select" value={values.agentId} onChange={set("agentId")} disabled={!can.reassignListing}>
            <option value="">Unassigned</option>
            {agents.map((a) => (
              <option key={a.agentId} value={a.agentId}>
                {a.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Status">
          <select className="select" value={values.availabilityStatus} onChange={set("availabilityStatus")}>
            <option value="Available">Available</option>
            <option value="Unavailable">Unavailable (sold / let)</option>
          </select>
        </Field>

        <div className="form-section-title">Sustainability</div>
        <Field label="Energy efficiency rating">
          <select className="select" value={values.energyEfficiency} onChange={set("energyEfficiency")}>
            {[...new Set([...ENERGY_RATINGS, values.energyEfficiency].filter(Boolean))].map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
        </Field>
        <Field label="Green certification">
          <select className="select" value={values.greenCertification} onChange={set("greenCertification")}>
            {[...new Set([...CERTIFICATIONS, values.greenCertification].filter(Boolean))].map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </Field>
        <div className="span-2 feature-toggles">
          {FEATURES.map((f) => {
            const on = values[f.key];
            return (
              <button
                key={f.key}
                type="button"
                className={`switch-row ${on ? "on" : ""}`}
                aria-pressed={on}
                onClick={() => set(f.key)(!on)}
              >
                <span className="switch-icon">
                  <f.icon />
                </span>
                <span className="switch-text">
                  <span className="switch-title" style={{ display: "block" }}>
                    {f.label}
                  </span>
                  <span className="switch-sub" style={{ display: "block" }}>
                    {f.blurb}
                  </span>
                </span>
                <span className="switch" aria-hidden />
              </button>
            );
          })}
        </div>
        {!values.solarPanels && !values.rainwaterHarvesting && !values.wasteManagement && (
          <p className="span-2 field-hint">
            With no green features, the database trigger <code>trg_check_sustainability</code> will block any sale of this property.
          </p>
        )}
      </div>
    </Modal>
  );
}
