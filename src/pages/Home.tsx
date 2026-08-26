import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getConfig, listEntries } from "../lib/contract";
import type { Config, Entry } from "../lib/types";

export default function Home() {
  const [config, setConfig] = useState<Config | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    Promise.all([getConfig(), listEntries(0, 6)])
      .then(([cfg, ents]) => {
        if (!alive) return;
        setConfig(cfg);
        setEntries(ents);
      })
      .catch((e: unknown) => {
        if (alive) setError(e instanceof Error ? e.message : "Failed to reach the GenKit registry.");
      });
    return () => {
      alive = false;
    };
  }, []);

  const totalMethods = entries.reduce((n, e) => n + e.total_methods, 0);

  return (
    <main className="page">
      <section className="hero">
        <p className="eyebrow">GENLAYER DEVELOPER TOOLKIT</p>
        <h1>
          Deploy once.
          <br />
          Ship an SDK everywhere.
        </h1>
        <p className="hero-sub">
          GenKit reads a deployed Intelligent Contract's schema straight off the chain and generates a
          typed, documented SDK. No source code needed, no hand-written wrappers, no drift.
        </p>
        <div className="hero-actions">
          <Link to="/publish" className="btn btn-primary">
            Publish a contract
          </Link>
          <Link to="/registry" className="btn btn-ghost">
            Browse the registry
          </Link>
        </div>
        <pre className="hero-code">
          <span className="code-comment"># one command, zero hand-written wrappers</span>
          {"\n"}
          <span className="code-cmd">$</span> genkit generate --contract 0x29cE…951e --network studionet
          {"\n"}
          <span className="code-out">✔ wrote SDK for 11 methods to ./genkit-sdk</span>
          {"\n"}
          <span className="code-out">  ├─ index.ts · types.ts · index.py · README.md</span>
        </pre>
      </section>

      {error && <p className="error-banner">{error}</p>}

      <section className="stats">
        <div className="stat">
          <span className="stat-num">{config ? config.entry_count : "—"}</span>
          <span className="stat-label">contracts registered</span>
        </div>
        <div className="stat">
          <span className="stat-num">{totalMethods || "—"}</span>
          <span className="stat-label">methods on-chain</span>
        </div>
        <div className="stat">
          <span className="stat-num">2</span>
          <span className="stat-label">SDK targets (TS + Python)</span>
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <h2>Why GenKit</h2>
          <p>SDKs should come from the source of truth — the deployed contract — not from copy-paste.</p>
        </div>
        <div className="feature-grid">
          <div className="feature">
            <span className="feature-icon">01</span>
            <h3>Schema straight from the chain</h3>
            <p>
              GenKit pulls the contract schema via GenLayer RPC. No source code required, no stale ABI,
              no drift between what you call and what is deployed.
            </p>
          </div>
          <div className="feature">
            <span className="feature-icon">02</span>
            <h3>Verified on-chain registry</h3>
            <p>
              Published schemas are committed to the GenKit registry with a keccak hash that GenLayer
              validators verify through consensus. Every entry is an immutable record of what the
              contract exposes.
            </p>
          </div>
          <div className="feature">
            <span className="feature-icon">03</span>
            <h3>Typed for TypeScript and Python</h3>
            <p>
              One schema, two idiomatic SDKs. camelCase wrappers for genlayer-js, snake_case functions
              for genlayer-py, plus a generated README with copy-ready examples.
            </p>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <h2>Recently registered</h2>
          <Link to="/registry" className="link-arrow">
            View all →
          </Link>
        </div>
        {entries.length ? (
          <div className="entry-grid">
            {entries.map((e) => (
              <Link to={`/registry/${e.id}`} className="entry-card" key={e.id}>
                <div className="entry-card-head">
                  <span className="entry-name">{e.name}</span>
                  <span className="tag tag-green">{e.status}</span>
                </div>
                <div className="entry-meta">
                  <span className="mono">{e.contract_address.slice(0, 10)}…</span>
                  <span className="dim">·</span>
                  <span>{e.network}</span>
                  <span className="dim">·</span>
                  <span>v{e.version}</span>
                </div>
                <div className="entry-foot">
                  <span className="mono dim">{e.total_methods} methods</span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <p className="dim">Nothing registered yet. Be the first to publish a contract.</p>
        )}
      </section>
    </main>
  );
}
