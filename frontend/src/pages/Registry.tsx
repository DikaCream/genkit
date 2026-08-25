import { useEffect, useMemo, useState } from "react";
import { listEntries } from "../lib/contract";
import type { Entry } from "../lib/types";
import EntryCard from "../components/EntryCard";

export default function Registry() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    listEntries(0, 200)
      .then((v) => {
        if (alive) setEntries(v);
      })
      .catch((e: unknown) => {
        if (alive) setError(e instanceof Error ? e.message : "Failed to load the registry.");
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.contract_address.toLowerCase().includes(q) ||
        e.network.toLowerCase().includes(q) ||
        e.version.toLowerCase().includes(q)
    );
  }, [entries, query]);

  return (
    <main className="page">
      <section className="page-head">
        <p className="eyebrow">REGISTRY</p>
        <h1>Published contracts</h1>
        <p className="page-sub">
          Every entry holds the immutable schema hash of a deployed Intelligent Contract, committed
          through validator consensus on the GenKit registry.
        </p>
      </section>

      <div className="toolbar">
        <input
          className="search-input"
          type="search"
          placeholder="Search by name, address, or network…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <span className="dim mono">
          {filtered.length} of {entries.length}
        </span>
      </div>

      {error && <p className="error-banner">{error}</p>}
      {loading ? (
        <p className="dim">Loading registry…</p>
      ) : filtered.length ? (
        <div className="entry-grid">
          {filtered.map((e) => (
            <EntryCard entry={e} key={e.id} />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <p>{query ? "No contracts match your search." : "The registry is empty."}</p>
          <a className="btn btn-primary" href="/publish">
            Publish the first contract
          </a>
        </div>
      )}
    </main>
  );
}
