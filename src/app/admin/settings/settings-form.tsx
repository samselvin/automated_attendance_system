"use client";

import { useState } from "react";
import { Card, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { SettingDef } from "@/lib/settings-schema";

interface SettingRowData {
  def: SettingDef;
  key: string;
  value: unknown;
  updatedAt: string | null;
  isDefault: boolean;
}

export function SettingsForm({ settings }: { settings: SettingRowData[] }) {
  const groups = new Map<string, SettingRowData[]>();
  for (const s of settings) {
    const list = groups.get(s.def.group) ?? [];
    list.push(s);
    groups.set(s.def.group, list);
  }

  return (
    <div className="space-y-4">
      {[...groups.entries()].map(([group, rows]) => (
        <Card key={group}>
          <CardHeader title={group} />
          <div className="divide-y divide-slate-100">
            {rows.map((row) => (
              <SettingRow key={row.key} def={row.def} settingKey={row.key} value={row.value} isDefault={row.isDefault} />
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
}

function SettingRow({
  def,
  settingKey,
  value,
  isDefault,
}: {
  def: SettingDef;
  settingKey: string;
  value: unknown;
  isDefault: boolean;
}) {
  const [draft, setDraft] = useState<unknown>(value);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const dirty = draft !== value;

  async function handleSave() {
    setError(null);
    setSaved(false);
    setSaving(true);
    const res = await fetch(`/api/settings/${settingKey}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value: draft }),
    });
    const body = await res.json().catch(() => null);
    setSaving(false);
    if (!res.ok) {
      setError(body?.message ?? "Could not save this setting.");
      return;
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <div className="flex flex-wrap items-start justify-between gap-3 py-3">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-slate-900">
          {def.label}
          {def.group.startsWith("Reserved") ? (
            <span className="ml-2 inline-block align-middle">
              <Badge label="Not used yet" variant="neutral" />
            </span>
          ) : null}
          {isDefault ? <span className="ml-2 text-xs font-normal text-slate-400">(default)</span> : null}
        </p>
        <p className="mt-0.5 text-xs text-slate-500">{def.help}</p>
      </div>
      <div className="flex flex-col items-end gap-1">
        <div className="flex items-center gap-2">
          <SettingInput def={def} value={draft} onChange={setDraft} />
          <Button
            type="button"
            variant="secondary"
            className="!px-2 !py-1 text-xs"
            onClick={handleSave}
            disabled={saving || !dirty}
          >
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
        {error ? <span className="text-xs text-red-600">{error}</span> : null}
        {saved ? <span className="text-xs text-emerald-600">Saved</span> : null}
      </div>
    </div>
  );
}

function SettingInput({
  def,
  value,
  onChange,
}: {
  def: SettingDef;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  const inputClass = "rounded-lg border border-slate-300 px-2 py-1.5 text-sm";

  switch (def.type) {
    case "number":
      return (
        <input
          type="number"
          min={def.min}
          max={def.max}
          value={value as number}
          onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))}
          className={`${inputClass} w-24`}
        />
      );
    case "boolean":
      return (
        <input
          type="checkbox"
          checked={Boolean(value)}
          onChange={(e) => onChange(e.target.checked)}
          className="h-4 w-4 rounded border-slate-300"
        />
      );
    case "select":
      return (
        <select value={value as string} onChange={(e) => onChange(e.target.value)} className={inputClass}>
          {(def.options ?? []).map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      );
    case "time":
      return <input type="time" value={value as string} onChange={(e) => onChange(e.target.value)} className={inputClass} />;
    case "text":
      return (
        <textarea
          value={value as string}
          onChange={(e) => onChange(e.target.value)}
          rows={2}
          className={`${inputClass} w-72`}
        />
      );
  }
}
