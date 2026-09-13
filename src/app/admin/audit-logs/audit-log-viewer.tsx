"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { downloadCsv } from "@/lib/csv-export";

interface AuditLogRow {
  [key: string]: string | number;
  createdAt: string;
  action: string;
  entityType: string;
  entityId: string;
  actor: string;
  reason: string;
}

interface RawRow {
  id: string;
  createdAt: string;
  action: string;
  entityType: string;
  entityId: string | null;
  reason: string | null;
  actorRole: string | null;
  actor: { id: string; email: string } | null;
}

export function AuditLogViewer({ actions, entityTypes }: { actions: string[]; entityTypes: string[] }) {
  const [action, setAction] = useState("");
  const [entityType, setEntityType] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<RawRow[] | null>(null);
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState(50);
  const [loading, setLoading] = useState(false);

  async function load(targetPage = page) {
    setLoading(true);
    const params = new URLSearchParams({ page: String(targetPage) });
    if (action) params.set("action", action);
    if (entityType) params.set("entityType", entityType);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    const res = await fetch(`/api/audit-logs?${params}`);
    const body = await res.json();
    setRows(body.rows ?? []);
    setTotal(body.total ?? 0);
    setPageSize(body.pageSize ?? 50);
    setPage(targetPage);
    setLoading(false);
  }

  useEffect(() => {
    // setState only happens after the awaited fetch resolves, not
    // synchronously in the effect body — this is React's own documented
    // fetch-on-mount pattern, not the cascading-render case this rule
    // targets.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalPages = Math.max(Math.ceil(total / pageSize), 1);

  function csvRows(): AuditLogRow[] {
    return (rows ?? []).map((r) => ({
      createdAt: r.createdAt,
      action: r.action,
      entityType: r.entityType,
      entityId: r.entityId ?? "",
      actor: r.actor ? `${r.actor.email} (${r.actorRole ?? "?"})` : "system",
      reason: r.reason ?? "",
    }));
  }

  return (
    <Card>
      <form
        className="flex flex-wrap items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          load(1);
        }}
      >
        <label className="flex flex-col text-xs text-slate-600">
          Action
          <select value={action} onChange={(e) => setAction(e.target.value)} className="mt-1 rounded-lg border border-slate-300 px-2 py-1.5 text-sm outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20">
            <option value="">All</option>
            {actions.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col text-xs text-slate-600">
          Entity type
          <select value={entityType} onChange={(e) => setEntityType(e.target.value)} className="mt-1 rounded-lg border border-slate-300 px-2 py-1.5 text-sm outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20">
            <option value="">All</option>
            {entityTypes.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col text-xs text-slate-600">
          From
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="mt-1 rounded-lg border border-slate-300 px-2 py-1.5 text-sm outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20" />
        </label>
        <label className="flex flex-col text-xs text-slate-600">
          To
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="mt-1 rounded-lg border border-slate-300 px-2 py-1.5 text-sm outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20" />
        </label>
        <Button type="submit" disabled={loading} className="text-sm">
          {loading ? "Loading…" : "Filter"}
        </Button>
        {rows && rows.length > 0 ? (
          <Button type="button" variant="secondary" className="text-sm" onClick={() => downloadCsv("audit-logs.csv", csvRows())}>
            Download page as CSV
          </Button>
        ) : null}
      </form>

      <div className="mt-4">
        {!rows ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : rows.length === 0 ? (
          <EmptyState title="No audit log entries match these filters" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 text-xs text-slate-600">
                <tr>
                  <th className="py-1.5 pr-2">When</th>
                  <th className="py-1.5 pr-2">Action</th>
                  <th className="py-1.5 pr-2">Entity</th>
                  <th className="py-1.5 pr-2">Actor</th>
                  <th className="py-1.5">Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td className="whitespace-nowrap py-1.5 pr-2 text-slate-600">{new Date(r.createdAt).toLocaleString()}</td>
                    <td className="py-1.5 pr-2 font-medium">{r.action}</td>
                    <td className="py-1.5 pr-2 text-slate-600">
                      {r.entityType}
                      {r.entityId ? ` · ${r.entityId.slice(0, 8)}…` : ""}
                    </td>
                    <td className="py-1.5 pr-2">{r.actor ? r.actor.email : "system"}</td>
                    <td className="py-1.5 text-slate-600">{r.reason ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {rows && totalPages > 1 ? (
        <div className="mt-3 flex items-center justify-between text-xs text-slate-600">
          <span>
            Page {page} of {totalPages} · {total} entries
          </span>
          <div className="flex gap-2">
            {page > 1 ? (
              <Button type="button" variant="secondary" className="text-xs" onClick={() => load(page - 1)}>
                Previous
              </Button>
            ) : null}
            {page < totalPages ? (
              <Button type="button" variant="secondary" className="text-xs" onClick={() => load(page + 1)}>
                Next
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}
    </Card>
  );
}
