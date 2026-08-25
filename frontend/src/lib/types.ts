export interface Config {
  entry_count: number;
  registry_name: string;
}

export interface Entry {
  id: number;
  owner: string;
  name: string;
  version: string;
  contract_address: string;
  network: string;
  schema_hash: string;
  total_methods: number;
  status: string;
  registered_at: number;
}

export interface SchemaMethod {
  params: [string, string][];
  kwparams: Record<string, unknown>;
  readonly: boolean;
  ret: unknown;
  payable?: boolean;
}

export interface ContractSchema {
  ctor: { params: unknown[]; kwparams: Record<string, unknown> };
  methods: Record<string, SchemaMethod>;
}

/* ── Mappers ─────────────────────────────── */

export function toInt(v: unknown): number {
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }
  if (typeof v === "bigint") return Number(v);
  return 0;
}

export function toStringValue(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "string") return v;
  if (typeof v === "object") {
    const asAny = v as { as_hex?: unknown; toString?: () => string };
    if (typeof asAny.as_hex === "string") return asAny.as_hex;
    if (typeof asAny.toString === "function") return asAny.toString();
  }
  return String(v);
}

function O(value: unknown): Record<string, unknown> {
  if (value instanceof Map) {
    const r: Record<string, unknown> = {};
    value.forEach((v, k) => {
      r[String(k)] = v;
    });
    return r;
  }
  if (value && typeof value === "object") return value as Record<string, unknown>;
  return {};
}

export function mapConfig(v: unknown): Config {
  const x = O(v);
  return {
    entry_count: toInt(x.entry_count),
    registry_name: toStringValue(x.registry_name) || "GenKit",
  };
}

export function mapEntry(v: unknown): Entry {
  const x = O(v);
  return {
    id: toInt(x.id),
    owner: toStringValue(x.owner),
    name: toStringValue(x.name),
    version: toStringValue(x.version),
    contract_address: toStringValue(x.contract_address),
    network: toStringValue(x.network),
    schema_hash: toStringValue(x.schema_hash),
    total_methods: toInt(x.total_methods),
    status: toStringValue(x.status),
    registered_at: toInt(x.registered_at),
  };
}
