import { RPC_URL, STUDIONET_CHAIN_ID, STUDIONET_CHAIN_ID_HEX } from "../config";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

let _createClient: (() => Promise<(...args: unknown[]) => any>) | null = null;
let _studionet: Promise<unknown> | null = null;

function getGlClient() {
  if (!_createClient) {
    _createClient = () => import("genlayer-js").then((m) => m.createClient as (...args: unknown[]) => any);
  }
  if (!_studionet) _studionet = import("genlayer-js/chains").then((m) => (m as { studionet?: unknown }).studionet);
  return Promise.all([_createClient(), _studionet]);
}

/* ── Raw JSON-RPC (browser-safe, no wallet needed) ── */

export async function rpcCall(method: string, params: unknown[]): Promise<unknown> {
  const res = await fetch(RPC_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  if (!res.ok) throw new Error(`RPC ${RPC_URL} returned HTTP ${res.status}`);
  const data = await res.json();
  if (data.error) throw new Error(data.error.message || "RPC error");
  return data.result;
}

export async function fetchSchema(contractAddress: string): Promise<unknown> {
  return rpcCall("gen_getContractSchema", [contractAddress]);
}

/* ── Wallet helpers ─────────────────────── */

interface Provider {
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;
  on?(event: string, handler: (...args: unknown[]) => void): void;
  removeListener?(event: string, handler: (...args: unknown[]) => void): void;
}
declare global {
  interface Window {
    ethereum?: Provider;
  }
}

function provider(): Provider | null {
  return typeof window === "undefined" ? null : window.ethereum || null;
}

export async function getAccounts(): Promise<string[]> {
  const w = provider();
  if (!w) return [];
  try {
    return (await w.request({ method: "eth_accounts" })) as string[];
  } catch {
    return [];
  }
}

export async function connectWallet(): Promise<string> {
  const w = provider();
  if (!w) throw new Error("Install MetaMask or another EVM wallet to continue.");
  const accounts = (await w.request({ method: "eth_requestAccounts" })) as string[];
  if (!accounts.length) throw new Error("No wallet account was returned.");
  const addr = accounts[0];

  try {
    const cid = String(await w.request({ method: "eth_chainId" }));
    if (parseInt(cid, 16) !== STUDIONET_CHAIN_ID) {
      try {
        await w.request({ method: "wallet_switchEthereumChain", params: [{ chainId: STUDIONET_CHAIN_ID_HEX }] });
      } catch (switchErr: unknown) {
        const err = switchErr as { code?: number };
        if (err?.code === 4902) {
          await w.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: STUDIONET_CHAIN_ID_HEX,
                chainName: "GenLayer Studio",
                nativeCurrency: { name: "GEN", symbol: "GEN", decimals: 18 },
                rpcUrls: [RPC_URL],
              },
            ],
          });
          await w.request({ method: "wallet_switchEthereumChain", params: [{ chainId: STUDIONET_CHAIN_ID_HEX }] });
        } else {
          throw switchErr;
        }
      }
    }
  } catch (e: unknown) {
    const err = e as { code?: number; message?: string };
    if (err?.code === 4001) throw new Error("Network switch was cancelled.");
    console.warn("Chain switch issue, continuing:", err?.message || e);
  }

  return addr;
}

export function subscribeAccounts(cb: (accounts: string[]) => void): () => void {
  const w = provider();
  if (!w?.on) return () => {};
  const h = (...a: unknown[]) => cb((a[0] || []) as string[]);
  w.on("accountsChanged", h);
  return () => w.removeListener?.("accountsChanged", h);
}

/* ── Contract calls ─────────────────────── */

export async function createContractClient(walletAccount: string | null) {
  const [createClient, studionet] = await getGlClient();
  return createClient({
    chain: studionet,
    endpoint: RPC_URL,
    account: (walletAccount || ZERO_ADDRESS) as `0x${string}`,
  });
}

export async function readContract(address: string, fnName: string, args: unknown[] = []) {
  const client = await createContractClient(ZERO_ADDRESS);
  return client.readContract({ address: address as `0x${string}`, functionName: fnName, args });
}

export async function writeContract(address: string, fnName: string, args: unknown[] = [], walletAccount: string) {
  const client = await createContractClient(walletAccount);
  return client.writeContract({ address: address as `0x${string}`, functionName: fnName, args }) as Promise<string>;
}

/* ── Utility ─────────────────────────────── */

export function shortAddress(a: string) {
  return a ? `${a.slice(0, 6)}…${a.slice(-4)}` : "";
}
export function shortHash(h: string) {
  return h ? `${h.slice(0, 10)}…${h.slice(-8)}` : "";
}
export function formatDate(ts: number) {
  if (!ts) return "—";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(ts * 1000));
}
