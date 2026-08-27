export const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS || "0x027f56dBbe73639CB2be267a9D9e1d6C21cd5518";
export const NETWORK = import.meta.env.VITE_GENLAYER_NETWORK || "studionet";
export const RPC_URL = import.meta.env.VITE_GENLAYER_RPC_URL || "https://studio.genlayer.com/api";
export const EXPLORER_URL = `https://explorer-studio.genlayer.com/address/${CONTRACT_ADDRESS}`;
export const STUDIONET_CHAIN_ID = 61999;
export const STUDIONET_CHAIN_ID_HEX = "0xF21F";
