"""Shared GenKit direct-test helpers."""

import json
import sys

import pytest

BASE_ISO = "2030-01-01T00:00:00Z"

SOURCEWATCH_ADDR = "0xA46a017B42C63E14eAA710a3aF37F5e8c0b08e37"

# All verifiable networks share the genlayer.com domain; a single URL pattern
# covers the studio + testnet RPC endpoints in tests.
RPC_URL_PATTERN = r"genlayer\.com/api"

SCHEMA = {
    "ctor": {"params": [], "kwparams": {}},
    "methods": {
        "check_source": {
            "params": [["source_id", "int"]],
            "kwparams": {},
            "readonly": False,
            "ret": "int",
            "payable": False,
        },
        "get_source": {
            "params": [["source_id", "int"]],
            "kwparams": {},
            "readonly": True,
            "ret": "any",
            "payable": False,
        },
        "register_source": {
            "params": [
                ["label", "string"],
                ["description", "string"],
                ["url", "string"],
            ],
            "kwparams": {},
            "readonly": False,
            "ret": "int",
            "payable": False,
        },
    },
}

SCHEMA_JSON = json.dumps(SCHEMA, sort_keys=True)


def set_time(value: str) -> None:
    gl = sys.modules.get("genlayer.gl")
    if gl is not None:
        gl.message_raw["datetime"] = value


def to_hex(value):
    if hasattr(value, "as_hex"):
        return value.as_hex
    from genlayer.py.types import Address
    return Address(value).as_hex


@pytest.fixture(autouse=True)
def reset_time():
    set_time(BASE_ISO)
    yield
    set_time(BASE_ISO)

def rpc_envelope(result) -> str:
    return json.dumps({"jsonrpc": "2.0", "id": 1, "result": result})


def mock_schema_rpc(vm, result=None) -> None:
    """Mock the JSON-RPC endpoint validators use to retrieve the authentic schema."""
    vm.mock_web(
        RPC_URL_PATTERN,
        {"method": "POST", "status": 200, "body": rpc_envelope(SCHEMA if result is None else result)},
    )


def register_entry(contract, vm, owner, name="SourceWatch", version="1.0.0"):
    mock_schema_rpc(vm)
    vm.sender = owner
    entry_id = int(contract.register_contract(name, version, SOURCEWATCH_ADDR, "studionet", SCHEMA_JSON))
    vm.clear_mocks()
    return entry_id
