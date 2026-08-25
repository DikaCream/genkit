#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { fetchSchema } from "./fetch-schema.js";
import { resolveNetwork } from "./networks.js";
import { generateIndexTs, generateTypesTs } from "./generate-ts.js";
import { generateIndexPy } from "./generate-py.js";
import { generateSdkReadme } from "./generate-readme.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith("--")) {
        args[key] = true;
      } else {
        args[key] = next;
        i += 1;
      }
    } else {
      args._positional = args._positional || [];
      args._positional.push(a);
    }
  }
  return args;
}

const HELP = `GenKit — turn a deployed GenLayer contract's schema into a typed SDK.

Usage:
  genkit generate --contract <address> [--network <net>] [--rpc <url>] [--out <dir>] [--lang ts|py|all]
  genkit publish --contract <address> --name <name> --version <ver> --registry <address> [--network <net>] [--rpc <url>] [--keystore <path>] [--password <pw>] [--private-key <hex>]
  genkit registry --registry <address> [--network <net>] [--rpc <url>]
  genkit fetch --contract <address> [--network <net>] [--rpc <url>]

Networks: localnet, studionet (default), testnet-asimov, testnet-bradbury
`;

// A fetch-based JSON-RPC provider so genlayer-js reads work in Node (no window).
function rpcProvider(rpcUrl) {
  return {
    async request({ method, params = [] }) {
      const res = await fetch(rpcUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: Date.now(), method, params }),
      });
      const data = await res.json();
      if (data.error) throw data.error;
      return data.result;
    },
  };
}

async function generate(args) {
  if (!args.contract) throw new Error("--contract <address> is required");
  const networkCfg = resolveNetwork(args.network, args.rpc);
  console.log(`[genkit] fetching schema for ${args.contract} on ${networkCfg.name}...`);
  const schema = await fetchSchema(args.contract, networkCfg);
  const outDir = path.resolve(args.out || "genkit-sdk");
  const lang = args.lang || "all";
  await mkdir(outDir, { recursive: true });
  if (lang === "ts" || lang === "all") {
    await writeFile(path.join(outDir, "index.ts"), generateIndexTs(schema, args.contract, networkCfg.name));
    await writeFile(path.join(outDir, "types.ts"), generateTypesTs(schema));
  }
  if (lang === "py" || lang === "all") {
    await writeFile(path.join(outDir, "index.py"), generateIndexPy(schema, args.contract, networkCfg.name));
  }
  await writeFile(path.join(outDir, "README.md"), generateSdkReadme(schema, args.contract, networkCfg.name));
  const methods = Object.keys(schema.methods || {}).length;
  console.log(`[genkit] wrote SDK for ${methods} methods to ${outDir}`);
  console.log(`[genkit] files: ${lang === "ts" || lang === "all" ? "index.ts, types.ts, " : ""}${lang === "py" || lang === "all" ? "index.py, " : ""}README.md`);
}

async function loadAccount(args) {
  const { privateKeyToAccount } = await import("viem/accounts");
  if (args["private-key"]) {
    return privateKeyToAccount(args["private-key"]);
  }
  if (args.keystore) {
    const password = args.password || process.env.GENKIT_PASSWORD;
    if (!password) throw new Error("--password <pw> or GENKIT_PASSWORD is required with --keystore");
    const { readFile } = await import("node:fs/promises");
    const { Wallet } = await import("ethers");
    const json = await readFile(args.keystore, "utf8");
    const wallet = await Wallet.fromEncryptedJson(json, password);
    return privateKeyToAccount(wallet.privateKey);
  }
  throw new Error("--keystore <path> (with --password) or --private-key <hex> is required for writes");
}

async function registryCall(registryAddress, fnName, argsList, args) {
  const networkCfg = resolveNetwork(args.network, args.rpc);
  const account = await loadAccount(args);
  const { createClient } = await import("genlayer-js");
  const chains = await import("genlayer-js/chains");
  const chain = chains[networkCfg.name === "testnet-bradbury" ? "testnetBradbury" : networkCfg.name === "testnet-asimov" ? "testnetAsimov" : networkCfg.name] || chains.studionet;
  const client = createClient({ chain, endpoint: networkCfg.rpc, provider: rpcProvider(networkCfg.rpc), account });
  const hash = await client.writeContract({
    address: registryAddress,
    functionName: fnName,
    args: argsList,
  });
  console.log(`[genkit] tx submitted: ${hash}`);
  console.log(`[genkit] waiting for consensus (ACCEPTED)...`);
  const { TransactionStatus } = await import("genlayer-js/types");
  const receipt = await client.waitForTransactionReceipt({ hash, status: TransactionStatus.ACCEPTED, fullTransaction: false });
  if (receipt.txExecutionResultName === "FINISHED_WITH_ERROR") {
    console.error(`[genkit] execution failed: ${receipt.stderr || "contract reverted"}`);
    process.exitCode = 1;
    return null;
  }
  console.log(`[genkit] done`);
  return receipt;
}

async function publish(args) {
  if (!args.contract || !args.name || !args.version || !args.registry) {
    throw new Error("publish requires --contract, --name, --version, --registry");
  }
  const networkCfg = resolveNetwork(args.network, args.rpc);
  const schema = await fetchSchema(args.contract, networkCfg);
  const schemaJson = JSON.stringify(schema, null, 2);
  const receipt = await registryCall(args.registry, "register_contract", [args.name, args.version, args.contract, networkCfg.name, schemaJson], args);
  if (receipt) {
    console.log(`[genkit] registered ${args.name}@${args.version} (${Object.keys(schema.methods || {}).length} methods)`);
  }
}

async function registry(args) {
  if (!args.registry) throw new Error("registry requires --registry <address>");
  const networkCfg = resolveNetwork(args.network, args.rpc);
  const { createClient } = await import("genlayer-js");
  const chains = await import("genlayer-js/chains");
  const chain = chains.studionet;
  const client = createClient({ chain, endpoint: networkCfg.rpc, provider: rpcProvider(networkCfg.rpc) });
  const config = await client.readContract({ address: args.registry, functionName: "get_config", args: [] });
  const entries = await client.readContract({ address: args.registry, functionName: "list_entries", args: [0, 100] });
  console.log(`[genkit] registry config: ${JSON.stringify(config)}`);
  if (Array.isArray(entries)) {
    for (const e of entries) {
      console.log(`  #${e.id} ${e.name}@${e.version} — ${e.contract_address} (${e.network}) ${e.status} — ${e.total_methods} methods`);
    }
  }
}

async function fetch(args) {
  if (!args.contract) throw new Error("fetch requires --contract <address>");
  const networkCfg = resolveNetwork(args.network, args.rpc);
  const schema = await fetchSchema(args.contract, networkCfg);
  console.log(JSON.stringify(schema, null, 2));
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const command = args._positional ? args._positional[0] : null;
  try {
    switch (command) {
      case "generate": return await generate(args);
      case "publish": return await publish(args);
      case "registry": return await registry(args);
      case "fetch": return await fetch(args);
      case "help":
      case undefined:
      case null:
        console.log(HELP);
        return;
      default:
        console.error(`Unknown command: ${command}\n`);
        console.error(HELP);
        process.exitCode = 1;
    }
  } catch (err) {
    console.error(`[genkit] error: ${err.message}`);
    process.exitCode = 1;
  }
}

main();
