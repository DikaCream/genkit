# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
"""GenKit: an on-chain registry for GenLayer contract schemas.

GenKit turns a deployed contract's on-chain schema into a typed SDK. When an
entry is registered, validators do not trust the submitted schema bytes: each
validator independently retrieves the authentic schema from the declared
network's RPC endpoint for the declared contract address, canonicalizes it,
and commits its keccak hash through comparative consensus. Only schemas that
provably belong to the declared contract are accepted, so every entry is an
immutable, consensus-committed record of what the chain itself exposes.
"""

from dataclasses import dataclass
import datetime
import json
import re
import typing

from genlayer import *


ACTIVE = "ACTIVE"
DEPRECATED = "DEPRECATED"

MAX_NAME_CHARS = 80
MAX_VERSION_CHARS = 32
MAX_SCHEMA_CHARS = 30000

# Networks whose public RPC endpoints validators use to retrieve the authentic
# schema for a contract address. localnet is excluded: a developer's localhost
# is unreachable from validator nodes, so registrations there cannot be verified.
_RPC_BY_NETWORK = {
    "studionet": "https://studio.genlayer.com/api",
    "testnet-asimov": "https://rpc-asimov.genlayer.com/api",
    "testnet-bradbury": "https://rpc-bradbury.genlayer.com/api",
}

_ADDRESS_RE = re.compile(r"^0x[0-9a-fA-F]{40}$")
_VERSION_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._-]{0,31}$")


def _clean(value: str, limit: int) -> str:
    value = "".join(
        ch for ch in value if ch in ("\t", "\n") or (ord(ch) >= 32 and ord(ch) != 127)
    ).strip()
    return value[:limit]


def _hash_text(text: str) -> str:
    hasher = Keccak256()
    hasher.update(text.encode("utf-8"))
    return hasher.hexdigest()


def _now() -> int:
    raw = gl.message_raw.get("datetime")
    if not raw:
        raise gl.vm.UserError("no timestamp available")
    try:
        return int(datetime.datetime.fromisoformat(raw.replace("Z", "+00:00")).timestamp())
    except (ValueError, TypeError):
        raise gl.vm.UserError("malformed timestamp")


def _canonical(schema: typing.Any) -> str:
    """Deterministic serialization used when hashing schemas."""
    return json.dumps(schema, sort_keys=True)


def _fetch_schema_from_chain(network: str, address: str) -> typing.Optional[str]:
    """Retrieve the authentic schema for ``address`` from the network's own RPC.

    Runs during consensus on every validator. Returns the canonical schema text
    on success, or None if the contract's schema could not be acquired.
    """
    rpc_url = _RPC_BY_NETWORK[network]
    payload = json.dumps(
        {
            "jsonrpc": "2.0",
            "id": 1,
            "method": "gen_getContractSchema",
            "params": [address],
        }
    )
    try:
        # web.post returns a lazy handle in some runtimes and a resolved
        # Response in others; normalize defensively.
        raw = gl.nondet.web.post(
            rpc_url, body=payload, headers={"Content-Type": "application/json"}
        )
        response = raw.get() if hasattr(raw, "get") else raw
        if int(response.status) != 200 or response.body is None:
            return None
        envelope = json.loads(bytes(response.body).decode("utf-8"))
    except Exception:
        return None
    if not isinstance(envelope, dict) or "error" in envelope:
        return None
    result = envelope.get("result")
    if not isinstance(result, dict) or not isinstance(result.get("methods"), dict):
        return None
    return _canonical(result)


def _parse_schema(schema_json: str) -> typing.Any:
    try:
        data = json.loads(schema_json)
    except Exception:
        return None
    if not isinstance(data, dict) or not isinstance(data.get("methods"), dict):
        return None
    methods = data["methods"]
    for method_name, method in methods.items():
        if not isinstance(method_name, str) or not method_name:
            return None
        if not isinstance(method, dict):
            return None
        if "params" not in method or "readonly" not in method or "ret" not in method:
            return None
        if not isinstance(method["params"], list):
            return None
        for param in method["params"]:
            if not (
                isinstance(param, list)
                and len(param) == 2
                and isinstance(param[0], str)
                and isinstance(param[1], str)
            ):
                return None
        if not isinstance(method.get("readonly"), bool):
            return None
    return data


@allow_storage
@dataclass
class Entry:
    id: u256
    owner: Address
    name: str
    version: str
    contract_address: str
    network: str
    schema_hash: str
    schema_json: str
    total_methods: u256
    status: str
    registered_at: u256


class EntryRegistered(gl.Event):
    def __init__(self, entry_id: u256, /, **blob): ...


class EntryDeprecated(gl.Event):
    def __init__(self, entry_id: u256, /): ...


class GenKitRegistry(gl.Contract):
    entries: TreeMap[u256, Entry]
    entry_ids: DynArray[u256]
    next_entry_id: u256

    def __init__(self):
        self.next_entry_id = u256(1)

    def _entry(self, entry_id: int) -> Entry:
        entry = self.entries.get(u256(entry_id))
        if entry is None:
            raise gl.vm.UserError("entry not found")
        return entry

    def _entry_dict(self, entry: Entry) -> typing.Any:
        return {
            "id": int(entry.id),
            "owner": entry.owner.as_hex,
            "name": entry.name,
            "version": entry.version,
            "contract_address": entry.contract_address,
            "network": entry.network,
            "schema_hash": entry.schema_hash,
            "total_methods": int(entry.total_methods),
            "status": entry.status,
            "registered_at": int(entry.registered_at),
        }

    @gl.public.write
    def register_contract(
        self, name: str, version: str, contract_address: str, network: str, schema_json: str
    ) -> u256:
        """Register an entry after validators authenticate the on-chain schema.

        ``schema_json`` is an optional caller claim. The authoritative bytes are
        retrieved by validators from the declared network's RPC for the declared
        address. If a claim is supplied it must match the retrieval exactly
        (after canonicalization) or registration is rejected.
        """
        name = _clean(name, MAX_NAME_CHARS)
        version = _clean(version, MAX_VERSION_CHARS)
        contract_address = contract_address.strip()
        network = network.strip().lower()
        schema_json = schema_json.strip()

        if len(name) < 2:
            raise gl.vm.UserError("name must be at least 2 characters")
        if not _VERSION_RE.match(version):
            raise gl.vm.UserError("version must be 1-32 chars of letters, digits, dots, dashes")
        if not _ADDRESS_RE.match(contract_address):
            raise gl.vm.UserError("contract_address must be a 0x-prefixed 40-hex address")
        if network not in _RPC_BY_NETWORK:
            raise gl.vm.UserError(
                "network must be studionet, testnet-asimov, or testnet-bradbury"
            )
        if len(schema_json) > MAX_SCHEMA_CHARS:
            raise gl.vm.UserError("schema_json is too large")
        if schema_json and _parse_schema(schema_json) is None:
            raise gl.vm.UserError("schema_json is not a valid contract schema")

        def leader() -> str:
            # Validators independently acquire the schema for the declared
            # network + address; submitted bytes are never trusted.
            retrieved = _fetch_schema_from_chain(network, contract_address)
            if retrieved is None:
                return json.dumps({"error": "retrieval_failed"})
            data = _parse_schema(retrieved)
            if data is None or not (0 < len(retrieved) <= MAX_SCHEMA_CHARS):
                return json.dumps({"error": "invalid"})
            digest = _hash_text(retrieved)
            total = len(data.get("methods", {}))
            if schema_json:
                claimed = _parse_schema(schema_json)
                if claimed is None or _hash_text(_canonical(claimed)) != digest:
                    return json.dumps({"error": "mismatch"})
            return json.dumps(
                {"schema_hash": digest, "total_methods": total, "schema": retrieved},
                sort_keys=True,
            )

        principle = (
            "Answers are equivalent only when both are errors, or when both have "
            "the exact same 64-character schema hash and the same total_methods count."
        )
        try:
            result = json.loads(gl.eq_principle.prompt_comparative(leader, principle))
        except Exception:
            raise gl.vm.UserError("validators could not authenticate the on-chain schema")

        if "error" in result:
            code = str(result.get("error", ""))
            if code == "mismatch":
                raise gl.vm.UserError(
                    "submitted schema does not match the on-chain schema for this contract"
                )
            if code == "invalid":
                raise gl.vm.UserError("retrieved schema is not a valid contract schema")
            raise gl.vm.UserError(
                "validators could not retrieve the on-chain schema for this contract"
            )
        if not isinstance(result.get("schema_hash"), str):
            raise gl.vm.UserError("validators could not authenticate the on-chain schema")
        schema_hash = result["schema_hash"]
        total_methods = int(result.get("total_methods", 0))
        stored_schema = str(result.get("schema", ""))
        parsed_stored = _parse_schema(stored_schema)
        if (
            len(schema_hash) != 64
            or not (0 < len(stored_schema) <= MAX_SCHEMA_CHARS)
            or parsed_stored is None
            or schema_hash != _hash_text(stored_schema)
            or len(parsed_stored.get("methods", {})) != total_methods
        ):
            raise gl.vm.UserError("validators could not authenticate the on-chain schema")

        entry_id = int(self.next_entry_id)
        self.entries[u256(entry_id)] = Entry(
            id=u256(entry_id),
            owner=gl.message.sender_address,
            name=name,
            version=version,
            contract_address=contract_address,
            network=network,
            schema_hash=schema_hash,
            schema_json=stored_schema,
            total_methods=u256(total_methods),
            status=ACTIVE,
            registered_at=u256(_now()),
        )
        self.entry_ids.append(u256(entry_id))
        self.next_entry_id = u256(entry_id + 1)
        EntryRegistered(
            u256(entry_id), name=name, contract_address=contract_address, network=network
        ).emit()
        return u256(entry_id)

    @gl.public.write
    def deprecate_entry(self, entry_id: int) -> None:
        entry = self._entry(entry_id)
        if entry.owner != gl.message.sender_address:
            raise gl.vm.UserError("only the owner can deprecate an entry")
        entry.status = DEPRECATED
        self.entries[u256(entry_id)] = entry
        EntryDeprecated(u256(entry_id)).emit()

    @gl.public.view
    def get_config(self) -> typing.Any:
        return {
            "entry_count": int(self.next_entry_id) - 1,
            "registry_name": "GenKit",
        }

    @gl.public.view
    def get_entry(self, entry_id: int) -> typing.Any:
        entry = self.entries.get(u256(entry_id))
        if entry is None:
            return None
        return self._entry_dict(entry)

    @gl.public.view
    def get_entry_schema(self, entry_id: int) -> typing.Any:
        entry = self.entries.get(u256(entry_id))
        if entry is None:
            return None
        try:
            return json.loads(entry.schema_json)
        except Exception:
            return None

    @gl.public.view
    def get_entry_by_contract(self, contract_address: str) -> typing.Any:
        needle = contract_address.strip().lower()
        for raw_id in self.entry_ids:
            entry = self.entries.get(raw_id)
            if entry is not None and entry.contract_address.lower() == needle:
                return self._entry_dict(entry)
        return None

    @gl.public.view
    def list_entries(self, offset: int, limit: int) -> typing.Any:
        if offset < 0 or limit < 1:
            return []
        result = []
        for raw_id in self.entry_ids[int(offset) : int(offset) + limit]:
            entry = self.entries.get(raw_id)
            if entry is not None:
                result.append(self._entry_dict(entry))
        return result
