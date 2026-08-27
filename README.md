# GenKit

Turn any deployed GenLayer Intelligent Contract into a typed SDK.

GenKit fetches a contract's schema from the chain, commits it to an on-chain
registry where validators authenticate the schema against the chain itself
before accepting it, and generates idiomatic TypeScript (`genlayer-js`) and
Python (`genlayer-py`) wrappers. No source code required, no hand-written
bindings, no drift between what you call and what is deployed.

## Repo layout

```
contracts/genkit_registry.py   # Intelligent Contract (registry)
cli/                           # Node CLI: fetch schema, generate SDK, publish, list
src/                           # React + TypeScript web app
index.html, vite.config.ts     # Vite build (root, Vercel-ready)
tests/direct/                  # direct VM tests
```

## Registry contract

`GenKitRegistry`, live on **StudioNet**:

```
0x027f56dBbe73639CB2be267a9D9e1d6C21cd5518
```

| Method | Kind | Purpose |
| --- | --- | --- |
| `register_contract` | write | Register name, version, contract address, and network. Validators independently retrieve the authentic on-chain schema for that address from the network's RPC before the entry is stored. The `schema_json` argument is optional; if supplied it must match the retrieval exactly. |
| `deprecate_entry` | write | Owner marks an entry deprecated. |
| `get_config` | view | Registry entry count and name. |
| `get_entry` | view | Entry metadata, without schema bytes. |
| `get_entry_schema` | view | Parsed schema JSON for an entry. |
| `get_entry_by_contract` | view | Look up an entry by contract address. |
| `list_entries` | view | Paginated entry listing. |

Every entry stores the immutable keccak-256 hash of the exact schema that was
committed, so an SDK can always be verified against the registered bytes.

## CLI

```bash
npm install
node cli/genkit.js --help
```

```bash
# Generate a TypeScript + Python SDK from a live contract
node cli/genkit.js generate --contract 0x... --network studionet --out ./sdk

# Publish a contract to the registry (write, needs an account)
node cli/genkit.js publish \
  --contract 0x... --name MyContract --version 1.0.0 \
  --registry 0x027f56dBbe73639CB2be267a9D9e1d6C21cd5518 --network studionet \
  --keystore ~/.genlayer/keystores/deployer.json --password <pw>

# List registry entries
node cli/genkit.js registry --registry 0x027f56dBbe73639CB2be267a9D9e1d6C21cd5518

# Dump a raw schema
node cli/genkit.js fetch --contract 0x...
```

Networks: `studionet` (default), `testnet-asimov`, `testnet-bradbury`.
Pass `--rpc <url>` to override.

The generated SDK contains `index.ts` (typed genlayer-js wrappers with camelCase
names), `index.py` (genlayer-py wrappers with snake_case names), and a README
with copy-ready usage.

## Web app

The web app is a React + TypeScript SPA built at the repo root with Vite. It
reads the registry live, lets anyone fetch and preview a contract's schema,
publish it to the registry with a connected wallet, and copy a ready-to-use
TypeScript or Python SDK generated on the entry detail page.

```bash
npm install
npm run dev
```

Defaults are committed in `.env.production`, so a Vercel deploy works with no
environment variables set. To point at another registry or network, override
them in the Vercel dashboard (Production + Preview):

```
VITE_CONTRACT_ADDRESS=0x027f56dBbe73639CB2be267a9D9e1d6C21cd5518
VITE_GENLAYER_NETWORK=studionet
VITE_GENLAYER_RPC_URL=https://studio.genlayer.com/api
```

Deploy the repo root on Vercel; the Vite framework is auto-detected.

## Tests

```bash
genvm-lint check contracts/genkit_registry.py --json
gltest tests/direct/ -v
```

## Consensus model

Registration never trusts caller-supplied bytes. Inside a comparative
equivalence check, each validator independently retrieves the authentic schema
from the declared network's own RPC endpoint (`gen_getContractSchema` for the
declared address), canonicalizes it deterministically, and commits its keccak-256
hash, method count, and exact canonical bytes. Validators agree only when their
retrievals are byte-identical. If any validator cannot retrieve or parse the
schema, registration fails instead of storing something unverified.

A caller may optionally supply `schema_json`; when present it must hash-match
the retrieved schema exactly, so the registry can never be pointed at bytes the
chain does not expose. Every entry stores the immutable keccak hash of the exact
committed bytes, so an SDK can always be verified against the registered schema.
Verifiable networks: `studionet`, `testnet-asimov`, `testnet-bradbury`
(`localnet` is excluded because validators cannot reach a developer's localhost).

## License

MIT
