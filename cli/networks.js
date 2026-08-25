export const NETWORKS = {
  localnet: { rpc: "http://127.0.0.1:4000/api", studio: false },
  studionet: { rpc: "https://studio.genlayer.com/api", studio: true },
  "testnet-asimov": { rpc: "https://rpc-asimov.genlayer.com/api", studio: false },
  "testnet-bradbury": { rpc: "https://rpc-bradbury.genlayer.com/api", studio: false },
};

export function resolveNetwork(network, rpcOverride) {
  const key = String(network || "studionet").toLowerCase().replace(/_/g, "-");
  const cfg = NETWORKS[key];
  if (!cfg && !rpcOverride) {
    throw new Error(
      `Unknown network "${network}". Use one of: ${Object.keys(NETWORKS).join(", ")} or pass --rpc.`
    );
  }
  return {
    name: key,
    rpc: rpcOverride || (cfg ? cfg.rpc : rpcOverride),
    studio: cfg ? cfg.studio : false,
  };
}

export async function rpcRequest(rpcUrl, method, params) {
  const res = await fetch(rpcUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  if (!res.ok) {
    throw new Error(`RPC ${rpcUrl} returned HTTP ${res.status}`);
  }
  const data = await res.json();
  if (data.error) {
    throw new Error(`RPC error: ${JSON.stringify(data.error)}`);
  }
  return data.result;
}
