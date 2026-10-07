import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight } from "lucide-react";
import { Skeleton } from "./primitives";

/**
 * columns: [{ key, header, render?(row), sort?(row) => comparable, align?, className? }]
 * A column is sortable when it has `sort`.
 */
export default function DataTable({
  columns,
  rows,
  rowKey,
  onRowClick,
  loading,
  empty,
  initialSort,
  footer,
  skeletonRows = 5,
  pageSize = 10,
}) {
  const [sort, setSort] = useState(initialSort || null); // { key, dir: "asc" | "desc" }
  const [page, setPage] = useState(0);

  const sorted = useMemo(() => {
    if (!sort) return rows;
    const col = columns.find((c) => c.key === sort.key);
    if (!col?.sort) return rows;
    const dir = sort.dir === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      const va = col.sort(a);
      const vb = col.sort(b);
      if (va === vb) return 0;
      if (va === null || va === undefined) return 1;
      if (vb === null || vb === undefined) return -1;
      if (typeof va === "string") return va.localeCompare(vb) * dir;
      return (va < vb ? -1 : 1) * dir;
    });
  }, [rows, sort, columns]);

  const toggleSort = (key) =>
    setSort((s) => (s?.key !== key ? { key, dir: "asc" } : s.dir === "asc" ? { key, dir: "desc" } : null));

  const showEmpty = !loading && rows.length === 0;
  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
  const current = Math.min(page, pageCount - 1); // stays valid when filters shrink the list
  const visible = sorted.slice(current * pageSize, current * pageSize + pageSize);

  return (
    <div className="card">
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              {columns.map((col) => {
                const sorted = sort?.key === col.key;
                const Icon = !sorted ? ArrowUpDown : sort.dir === "asc" ? ArrowUp : ArrowDown;
                return (
                  <th
                    key={col.key}
                    className={`${col.sort ? "sortable" : ""} ${sorted ? "sorted" : ""} ${
                      col.align ? `align-${col.align}` : ""
                    }`}
                    onClick={col.sort ? () => toggleSort(col.key) : undefined}
                    aria-sort={sorted ? (sort.dir === "asc" ? "ascending" : "descending") : undefined}
                    scope="col"
                  >
                    <span className="th-inner">
                      {col.header}
                      {col.sort && <Icon className="sort-icon" aria-hidden />}
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {loading &&
              Array.from({ length: skeletonRows }).map((_, i) => (
                <tr key={`sk-${i}`}>
                  {columns.map((col) => (
                    <td key={col.key}>
                      <Skeleton width={col.key === "actions" ? 48 : `${50 + ((i * 17 + col.key.length * 7) % 45)}%`} />
                    </td>
                  ))}
                </tr>
              ))}
            {!loading &&
              visible.map((row) => (
                <tr
                  key={rowKey(row)}
                  className={onRowClick ? "clickable" : ""}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                >
                  {columns.map((col) => (
                    <td key={col.key} className={`${col.align ? `align-${col.align}` : ""} ${col.className || ""}`}>
                      {col.render ? col.render(row) : row[col.key]}
                    </td>
                  ))}
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      {showEmpty && empty}
      {(footer || pageCount > 1) && !showEmpty && (
        <div className="table-foot">
          <span>{footer}</span>
          {pageCount > 1 && (
            <div className="pager">
              <span>
                {current * pageSize + 1}–{Math.min(sorted.length, (current + 1) * pageSize)} of {sorted.length}
              </span>
              <button
                type="button"
                className="icon-btn"
                onClick={() => setPage(current - 1)}
                disabled={current === 0}
                aria-label="Previous page"
              >
                <ChevronLeft />
              </button>
              <button
                type="button"
                className="icon-btn"
                onClick={() => setPage(current + 1)}
                disabled={current >= pageCount - 1}
                aria-label="Next page"
              >
                <ChevronRight />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
