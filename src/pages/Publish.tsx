import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { registerContract } from "../lib/contract";
import { fetchSchema } from "../lib/client";
import { useGenKit } from "../context/GenKitContext";
import type { ContractSchema } from "../lib/types";

const NETWORKS = ["studionet", "testnet-bradbury", "testnet-asimov", "localnet"];

export default function Publish() {
  const { account, connect } = useGenKit();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [version, setVersion] = useState("1.0.0");
  const [contractAddress, setContractAddress] = useState("");
  const [network, setNetwork] = useState("studionet");
  const [schema, setSchema] = useState<ContractSchema | null>(null);
  const [fetching, setFetching] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const onFetch = async () => {
    setError(null);
    setSchema(null);
    const addr = contractAddress.trim();
    if (!/^0x[0-9a-fA-F]{40}$/.test(addr)) {
      setError("Enter a valid 0x-prefixed contract address.");
      return;
    }
    setFetching(true);
    try {
      const s = (await fetchSchema(addr)) as ContractSchema;
      if (!s || !s.methods) throw new Error("No methods found in the schema.");
      setSchema(s);
      if (!name) setName("MyContract");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Could not fetch the contract schema.");
    } finally {
      setFetching(false);
    }
  };

  const onPublish = async () => {
    setError(null);
    setNotice(null);
    if (!schema) {
      setError("Fetch the contract schema first.");
      return;
    }
    if (name.trim().length < 2) {
      setError("Name must be at least 2 characters.");
      return;
    }
    if (!account) {
      await connect();
      return;
    }
    setPublishing(true);
    try {
      await registerContract(name.trim(), version.trim(), contractAddress.trim(), network, JSON.stringify(schema), account);
      setNotice("Published. The registry verified the schema hash through validator consensus.");
      setTimeout(() => navigate("/registry"), 2500);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Publish failed.");
    } finally {
      setPublishing(false);
    }
  };

  const methodCount = schema ? Object.keys(schema.methods).length : 0;

  return (
    <main className="page">
      <section className="page-head">
        <p className="eyebrow">PUBLISH</p>
        <h1>Register a contract</h1>
        <p className="page-sub">
          Point GenKit at any deployed Intelligent Contract. It fetches the schema from the chain, and
          validators commit its immutable hash to the registry.
        </p>
      </section>

      <div className="publish-grid">
        <div className="publish-form">
          <label className="field">
            <span>Contract address</span>
            <input
              type="text"
              placeholder="0x…"
              value={contractAddress}
              onChange={(e) => setContractAddress(e.target.value)}
            />
          </label>

          <label className="field">
            <span>Network</span>
            <select value={network} onChange={(e) => setNetwork(e.target.value)}>
              {NETWORKS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>

          <button className="btn btn-primary" onClick={onFetch} disabled={fetching}>
            {fetching ? "Fetching schema…" : schema ? "Refetch schema" : "Fetch schema"}
          </button>

          {error && <p className="error-banner">{error}</p>}

          {schema && (
            <>
              <div className="divider" />
              <div className="field-row">
                <label className="field">
                  <span>Name</span>
                  <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="MyContract" />
                </label>
                <label className="field">
                  <span>Version</span>
                  <input type="text" value={version} onChange={(e) => setVersion(e.target.value)} />
                </label>
              </div>
              <p className="schema-summary">
                <span className="tag tag-green">{methodCount} methods</span>
                <span className="dim mono">schema fetched from {network} · committed as a keccak hash</span>
              </p>
              <button className="btn btn-primary btn-lg" onClick={onPublish} disabled={publishing || !account}>
                {publishing ? "Publishing…" : account ? "Publish to registry" : "Connect wallet to publish"}
              </button>
              {notice && <p className="notice-banner">{notice}</p>}
            </>
          )}
        </div>

        <div className="publish-preview">
          <div className="preview-head">
            <span className="code-label">schema preview</span>
            <span className="dim mono">{schema ? `${methodCount} methods` : "empty"}</span>
          </div>
          {schema ? (
            <pre className="preview-code">
              {JSON.stringify(
                {
                  ctor: schema.ctor,
                  methods: Object.fromEntries(
                    Object.entries(schema.methods).map(([k, m]) => [
                      k,
                      {
                        params: m.params,
                        readonly: m.readonly,
                        ret: m.ret,
                        payable: m.payable,
                      },
                    ])
                  ),
                },
                null,
                2
              )}
            </pre>
          ) : (
            <pre className="preview-code dim">{"// fetch a schema to preview it here"}</pre>
          )}
        </div>
      </div>
    </main>
  );
}
