import { readContract as _read, writeContract as _write } from "./client";
import { CONTRACT_ADDRESS } from "../config";
import { Config, Entry, mapConfig, mapEntry } from "./types";

const ADDR = CONTRACT_ADDRESS;

async function read(name: string, args: unknown[] = []) {
  return _read(ADDR, name, args);
}

async function write(name: string, account: string, args: unknown[] = []) {
  return _write(ADDR, name, args, account);
}

export async function getConfig(): Promise<Config> {
  return mapConfig(await read("get_config"));
}

export async function listEntries(offset = 0, limit = 100): Promise<Entry[]> {
  const v = await read("list_entries", [offset, limit]);
  return Array.isArray(v) ? v.map(mapEntry) : [];
}

export async function getEntry(id: number): Promise<Entry | null> {
  const v = await read("get_entry", [id]);
  return v == null ? null : mapEntry(v);
}

export async function getEntryByContract(address: string): Promise<Entry | null> {
  const v = await read("get_entry_by_contract", [address]);
  return v == null ? null : mapEntry(v);
}

export async function getEntrySchema(entryId: number): Promise<unknown> {
  return read("get_entry_schema", [entryId]);
}

// Write methods require a connected wallet account.
export async function registerContract(
  name: string,
  version: string,
  contractAddress: string,
  network: string,
  schemaJson: string,
  account: string
): Promise<string> {
  return write("register_contract", account, [name, version, contractAddress, network, schemaJson]);
}

export async function deprecateEntry(entryId: number, account: string): Promise<string> {
  return write("deprecate_entry", account, [entryId]);
}

export { ADDR as contractAddress };
