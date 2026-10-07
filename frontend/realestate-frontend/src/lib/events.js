/** Wraps a handler so a click inside an action cell doesn't also trigger the row click. */
export const stop = (fn) => (e) => {
  e.stopPropagation();
  fn();
};

/** Case-insensitive "does any of these fields contain the query". */
export function matches(query, ...fields) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return fields.some((f) => String(f ?? "").toLowerCase().includes(q));
}
