import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getEntry, getEntrySchema } from "../lib/contract";
import { formatDate, shortAddress } from "../lib/client";
import type { ContractSchema, Entry, SchemaMethod } from "../lib/types";

function typeLabel(t: unknown): string {
  if (typeof t === "string") return t;
  if (t && typeof t === "object") {
    if ("$dict" in (t as object)) return `dict<${typeLabel((t as { $dict: unknown }).$dict)}>`;
    if ("$rep" in (t as object)) return `${typeLabel((t as { $rep: unknown }).$rep)}[]`;
  }
  return JSON.stringify(t);
}

export default function EntryDetail() {
  const { id } = useParams();
  const entryId = Number(id);

  const [entry, setEntry] = useState<Entry | null>(null);
  const [schema, setSchema] = useState<ContractSchema | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    Promise.all([getEntry(entryId), getEntrySchema(entryId)])
      .then(([e, s]) => {
        if (!alive) return;
        setEntry(e);
        setSchema(s as ContractSchema | null);
      })
      .catch((err: unknown) => {
        if (alive) setError(err instanceof Error ? err.message : "Failed to load entry.");
      });
    return () => {
      alive = false;
    };
  }, [entryId]);

  if (error && !entry) return <main className="page"><p className="error-banner">{error}</p></main>;
  if (!entry) return <main className="page"><p className="dim">Loading entry…</p></main>;

  const methods = schema ? Object.entries(schema.methods) : [];

  return (
    <main className="page">
      <Link to="/registry" className="back-link">
        ← Registry
      </Link>

      <section className="entry-hero">
        <div className="entry-hero-head">
          <h1>{entry.name}</h1>
          <span className={`tag ${entry.status === "ACTIVE" ? "tag-green" : "tag-gray"}`}>{entry.status}</span>
        </div>
        <div className="entry-hero-meta">
          <div>
            <span className="dim">contract</span>
            <code className="mono">{entry.contract_address}</code>
          </div>
          <div>
            <span className="dim">network</span>
            <code className="mono">{entry.network}</code>
          </div>
          <div>
            <span className="dim">version</span>
            <code className="mono">{entry.version}</code>
          </div>
          <div>
            <span className="dim">registered by</span>
            <code className="mono">{shortAddress(entry.owner)}</code>
          </div>
          <div>
            <span className="dim">registered</span>
            <code className="mono">{formatDate(entry.registered_at)}</code>
          </div>
        </div>
        <div className="entry-hash-line">
          <span className="dim">immutable schema hash</span>
          <code className="mono hash">{entry.schema_hash}</code>
          <span className="dim">{entry.total_methods} methods on-chain</span>
        </div>
        <pre className="hero-code compact">
          <span className="code-comment"># generate the SDK for this contract</span>
          {"\n"}
          <span className="code-cmd">$</span> genkit generate --contract {entry.contract_address} --network {entry.network}
        </pre>
      </section>

      {error && <p className="error-banner">{error}</p>}

      <section className="section">
        <div className="section-head">
          <h2>Schema</h2>
          <p>Exact methods exposed by the deployed contract, fetched on-chain at registration.</p>
        </div>

        {methods.length === 0 && <p className="dim">This schema has no public methods.</p>}

        <div className="method-list">
          {methods.map(([name, method]) => {
            const m = method as SchemaMethod;
            return (
              <div className="method-block" key={name}>
                <div className="method-block-head">
                  <div>
                    <code className="method-name">{name}</code>
                    <span className={`tag ${m.readonly === false ? "tag-blue" : "tag-purple"}`}>
                      {m.readonly === false ? "write" : "view"}
                    </span>
                    {m.payable && <span className="tag tag-amber">payable</span>}
                  </div>
                  <span className="method-signature mono">
                    ({Array.isArray(m.params) ? m.params.map((p) => `${p[0]}: ${p[1]}`).join(", ") : ""}) → {typeLabel(m.ret)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}
