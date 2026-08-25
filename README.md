# GenKit

Turn any deployed GenLayer Intelligent Contract into a typed SDK.

GenKit fetches a contract's schema from the chain, commits it to an on-chain
registry where validators verify its hash through consensus, and generates
idiomatic TypeScript (`genlayer-js`) and Python (`genlayer-py`) wrappers. No
source code required, no hand-written bindings, no drift between what you call
and what is deployed.

## Repo layout

```
contracts/genkit_registry.py   # Intelligent Contract (registry)
cli/                           # Node CLI: fetch schema, generate SDK, publish, list
frontend/                      # React + TypeScript web app
tests/direct/                  # direct VM tests
```

## Registry contract

`GenKitRegistry`, live on **StudioNet**:

```
0x29cEfC26B316CD65c15AC7eDCbE7C762126b951e
```

| Method | Kind | Purpose |
| --- | --- | --- |
| `register_contract` | write | Register name, version, contract address, network, and schema JSON. Validators verify the keccak hash and method count before the entry is stored. |
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
  --registry 0x29cEfC26B316CD65c15AC7eDCbE7C762126b951e --network studionet \
  --keystore ~/.genlayer/keystores/deployer.json --password <pw>

# List registry entries
node cli/genkit.js registry --registry 0x29cEfC26B316CD65c15AC7eDCbE7C762126b951e

# Dump a raw schema
node cli/genkit.js fetch --contract 0x...
```

Networks: `localnet`, `studionet` (default), `testnet-asimov`, `testnet-bradbury`.
Pass `--rpc <url>` to override.

The generated SDK contains `index.ts` (typed genlayer-js wrappers with camelCase
names), `index.py` (genlayer-py wrappers with snake_case names), and a README
with copy-ready usage.

## Web app

`frontend/` is a React + TypeScript app. It reads the registry live, lets
anyone fetch and preview a contract's schema, and publish it to the registry
with a connected wallet.

```bash
cd frontend
npm install
npm run dev
```

Environment variables (`frontend/.env`):

```
VITE_CONTRACT_ADDRESS=0x29cEfC26B316CD65c15AC7eDCbE7C762126b951e
VITE_GENLAYER_NETWORK=studionet
VITE_GENLAYER_RPC_URL=https://studio.genlayer.com/api
```

Deploy on Vercel with root directory `frontend` and the three variables above.

## Tests

```bash
genvm-lint check contracts/genkit_registry.py --json
gltest tests/direct/ -v
```

## Consensus model

Registration runs a comparative equivalence check on a deterministic leader.
The leader computes the keccak hash and method count; validators agree only
when both values match exactly. Formatting of the schema JSON does not matter,
its hash does.

## License

MIT
