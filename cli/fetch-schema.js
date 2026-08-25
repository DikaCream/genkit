import { rpcRequest } from "./networks.js";

export async function fetchSchema(contractAddress, networkCfg) {
  const address = contractAddress.trim();
  if (!/^0x[0-9a-fA-F]{40}$/.test(address)) {
    throw new Error(`Invalid contract address: ${contractAddress}`);
  }
  if (networkCfg.studio) {
    return rpcRequest(networkCfg.rpc, "gen_getContractSchema", [address]);
  }
  // Non-studio chains: fetch code, then derive the schema from it.
  const code = await rpcRequest(networkCfg.rpc, "gen_getContractCode", [{ address }]);
  return rpcRequest(networkCfg.rpc, "gen_getContractSchema", [{ code }]);
}
