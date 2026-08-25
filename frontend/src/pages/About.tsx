import { EXPLORER_URL, CONTRACT_ADDRESS, NETWORK } from "../config";

export default function About() {
  return (
    <main className="page">
      <section className="page-head">
        <p className="eyebrow">ABOUT</p>
        <h1>An SDK factory for Intelligent Contracts</h1>
        <p className="page-sub">
          GenKit closes the gap between a deployed GenLayer contract and the code developers actually
          use to call it.
        </p>
      </section>

      <section className="section">
        <div className="section-head">
          <h2>How it works</h2>
        </div>
        <div className="steps">
          <div className="step">
            <span className="step-num">1</span>
            <h3>Fetch</h3>
            <p>
              GenKit reads the deployed contract's schema through GenLayer RPC (
              <code>gen_getContractSchema</code>). The schema is the source of truth, so generated code
              can never drift from what is actually on-chain.
            </p>
          </div>
          <div className="step">
            <span className="step-num">2</span>
            <h3>Commit</h3>
            <p>
              Publishing registers the schema on the GenKit registry. Validators verify the keccak hash
              of the schema and its method count before the entry is accepted — a deterministic
              equivalence check enforced by consensus.
            </p>
          </div>
          <div className="step">
            <span className="step-num">3</span>
            <h3>Generate</h3>
            <p>
              One command produces a typed TypeScript SDK for genlayer-js, a Python SDK for genlayer-py,
              and a README with copy-ready examples — all generated from the on-chain schema.
            </p>
          </div>
          <div className="step">
            <span className="step-num">4</span>
            <h3>Ship</h3>
            <p>
              Developers install the generated SDK or copy the wrappers into their app. When the
              contract changes, a single <code>genkit generate</code> refreshes everything.
            </p>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <h2>Why GenLayer is central</h2>
        </div>
        <p className="prose">
          The schema a developer builds against should be the schema the network actually deployed.
          GenKit makes that trust explicit: schemas are fetched from the chain and committed to an
          on-chain registry whose hashes GenLayer validators verify through consensus. The registry is
          not a database of claims — it is a consensus-backed record that any tool can verify.
        </p>
      </section>

      <section className="section">
        <div className="section-head">
          <h2>Deployed contract</h2>
        </div>
        <div className="about-contract">
          <div>
            <span className="dim">registry</span>
            <code className="mono">{CONTRACT_ADDRESS}</code>
          </div>
          <div>
            <span className="dim">network</span>
            <code className="mono">{NETWORK}</code>
          </div>
          <div>
            <span className="dim">methods</span>
            <code className="mono">register · deprecate · views</code>
          </div>
          <a className="contract-link" href={EXPLORER_URL} target="_blank" rel="noreferrer">
            View on StudioNet explorer ↗
          </a>
        </div>
      </section>
    </main>
  );
}
