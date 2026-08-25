# GenKit

Turn any deployed GenLayer Intelligent Contract into a typed, documented SDK.

GenKit fetches a contract's schema straight from the GenLayer chain, commits it
to an on-chain registry whose hash validators verify through consensus, and
generates idiomatic TypeScript (genlayer-js) and Python (genlayer-py) wrappers.
No source code needed, no hand-written bindings, no drift between what you call
and what is deployed.

## The registry contract

`contracts/genkit_registry.py` — `GenKitRegistry` on **StudioNet**:

```
0x29cEfC26B316CD65c15AC7eDCbE7C762126b951e
```

| Method | Kind | Purpose |
| --- | --- | --- |
| `register_contract` | write | Register name, version, contract address, network, and schema JSON. Validators verify the keccak hash and method count via `prompt_comparative` (strict hash equivalence) before the entry is stored. |
| `deprecate_entry` | write | Owner marks an entry deprecated. |
| `get_config` | view | Registry entry count and name. |
| `get_entry` | view | Entry metadata (no schema bytes). |
| `get_entry_schema` | view | Parsed schema JSON for an entry. |
| `get_entry_by_contract` | view | Look up an entry by contract address. |
| `list_entries` | view | Paginated entry listing. |

Every entry stores the immutable keccak-256 hash of the exact schema that was
committed, so consumers can always verify that an SDK was generated from the
registered bytes.

## The CLI

```bash
npm install
node cli/genkit.js --help
```

```bash
# Generate a TS + Python SDK from a live contract
node cli/genkit.js generate --contract 0x... --network studionet --out ./sdk

# Publish a contract to the registry (write, needs an account)
node cli/genkit.js publish \
  --contract 0x... --name MyContract --version 1.0.0 \
  --registry 0x29cEfC26B316CD65c15AC7eDCbE7C762126b951e --network studionet \
  --keystore ~/.genlayer/keystores/deployer.json --password <pw>

# List registry entries
node cli/genkit.js registry --registry 0x29cEfC26B316CD65c15AC7eDCbE7C762126b951e

# Dump a raw schema
node cli/genkit.js fetch --contract 0x...
```

The generated SDK includes `index.ts` (typed genlayer-js wrappers with camelCase
method names), `index.py` (genlayer-py wrappers with snake_case names), and a
README with copy-ready usage.

## The web app

`frontend/` is a React + TypeScript app deployed to Vercel. It reads the registry
live, lets anyone fetch a contract's schema and preview it, and publish it to the
registry with a connected wallet.

Environment variables:

```
VITE_CONTRACT_ADDRESS=0x29cEfC26B316CD65c15AC7eDCbE7C762126b951e
VITE_GENLAYER_NETWORK=studionet
VITE_GENLAYER_RPC_URL=https://studio.genlayer.com/api
```

## Tests

```bash
genvm-lint check contracts/genkit_registry.py --json
gltest tests/direct/ -v
```

## Consensus model

- **Registration** uses a comparative equivalence check on a deterministic
  leader: the leader computes the keccak hash and method count, and validators
  agree only when both values match exactly. Wording and formatting of the
  schema JSON do not matter; its hash does.

## License

MIT
