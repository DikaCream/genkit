"""Direct tests for the GenKit registry contract."""

from tests.direct.conftest import (
    RPC_URL_PATTERN,
    SCHEMA,
    SCHEMA_JSON,
    SOURCEWATCH_ADDR,
    mock_schema_rpc,
    register_entry,
    to_hex,
)


def test_register_stores_entry_with_verified_hash(direct_vm, direct_deploy, direct_alice):
    contract = direct_deploy("contracts/genkit_registry.py")
    eid = register_entry(contract, direct_vm, direct_alice)
    entry = contract.get_entry(eid)
    assert entry["id"] == eid
    assert entry["name"] == "SourceWatch"
    assert entry["version"] == "1.0.0"
    assert entry["contract_address"].lower() == SOURCEWATCH_ADDR.lower()
    assert entry["network"] == "studionet"
    assert entry["status"] == "ACTIVE"
    assert entry["owner"].lower() == to_hex(direct_alice).lower()
    assert len(entry["schema_hash"]) == 64
    assert entry["total_methods"] == 3
    assert entry["registered_at"] > 0


def test_register_commits_hash_of_retrieved_schema(direct_vm, direct_deploy, direct_alice):
    """The committed hash must be of the validator-retrieved bytes."""
    contract = direct_deploy("contracts/genkit_registry.py")
    eid = register_entry(contract, direct_vm, direct_alice)
    entry = contract.get_entry(eid)
    from genlayer import Keccak256

    hasher = Keccak256()
    hasher.update(SCHEMA_JSON.encode("utf-8"))
    assert entry["schema_hash"] == hasher.hexdigest()


def test_register_validates_inputs(direct_vm, direct_deploy, direct_alice):
    contract = direct_deploy("contracts/genkit_registry.py")
    direct_vm.sender = direct_alice
    with direct_vm.expect_revert("name must be"):
        contract.register_contract("X", "1.0.0", SOURCEWATCH_ADDR, "studionet", SCHEMA_JSON)
    with direct_vm.expect_revert("version must be"):
        contract.register_contract("SourceWatch", "bad version!", SOURCEWATCH_ADDR, "studionet", SCHEMA_JSON)
    with direct_vm.expect_revert("contract_address must be"):
        contract.register_contract("SourceWatch", "1.0.0", "not-an-address", "studionet", SCHEMA_JSON)
    with direct_vm.expect_revert("network must be"):
        contract.register_contract("SourceWatch", "1.0.0", SOURCEWATCH_ADDR, "moon", SCHEMA_JSON)
    with direct_vm.expect_revert("not a valid contract schema"):
        contract.register_contract("SourceWatch", "1.0.0", SOURCEWATCH_ADDR, "studionet", '{"nope": 1}')
    with direct_vm.expect_revert("network must be"):
        contract.register_contract("SourceWatch", "1.0.0", SOURCEWATCH_ADDR, "localnet", SCHEMA_JSON)


def test_register_authenticates_supplied_schema_against_chain(direct_vm, direct_deploy, direct_alice):
    """A supplied claim is authenticated against the chain, not trusted.

    Tampered bytes that do not match what validators retrieve must be rejected,
    even though they form a structurally valid schema.
    """
    contract = direct_deploy("contracts/genkit_registry.py")
    direct_vm.sender = direct_alice
    tampered = {"ctor": {"params": [], "kwparams": {}}, "methods": {"fake_method": {"params": [], "kwparams": {}, "readonly": True, "ret": "any", "payable": False}}}
    mock_schema_rpc(direct_vm)  # chain exposes the genuine SourceWatch schema
    with direct_vm.expect_revert("does not match the on-chain schema"):
        contract.register_contract(
            "SourceWatch", "1.0.0", SOURCEWATCH_ADDR, "studionet",
            __import__("json").dumps(tampered, sort_keys=True),
        )
    direct_vm.clear_mocks()


def test_register_stores_retrieved_schema_without_claim(direct_vm, direct_deploy, direct_alice):
    """Registration works without any caller-supplied bytes: validators fetch
    the authoritative schema themselves and store exactly what they retrieved."""
    contract = direct_deploy("contracts/genkit_registry.py")
    mock_schema_rpc(direct_vm)
    direct_vm.sender = direct_alice
    eid = int(contract.register_contract("SourceWatch", "1.0.0", SOURCEWATCH_ADDR, "studionet", ""))
    direct_vm.clear_mocks()

    entry = contract.get_entry(eid)
    assert len(entry["schema_hash"]) == 64
    from genlayer import Keccak256

    hasher = Keccak256()
    hasher.update(SCHEMA_JSON.encode("utf-8"))
    assert entry["schema_hash"] == hasher.hexdigest()
    schema = contract.get_entry_schema(eid)
    assert schema["methods"].keys() == SCHEMA["methods"].keys()


def test_register_fails_when_schema_unreachable(direct_vm, direct_deploy, direct_alice):
    """If validators cannot retrieve the on-chain schema, registration fails."""
    contract = direct_deploy("contracts/genkit_registry.py")
    direct_vm.sender = direct_alice
    direct_vm.mock_web(RPC_URL_PATTERN, {"method": "POST", "status": 502, "body": "bad gateway"})
    with direct_vm.expect_revert("could not retrieve the on-chain schema"):
        contract.register_contract("SourceWatch", "1.0.0", SOURCEWATCH_ADDR, "studionet", SCHEMA_JSON)
    direct_vm.clear_mocks()


def test_register_accepts_compact_whitespace(direct_vm, direct_deploy, direct_alice):
    contract = direct_deploy("contracts/genkit_registry.py")
    direct_vm.sender = direct_alice
    padded = " \n " + SCHEMA_JSON + " \n "
    mock_schema_rpc(direct_vm)
    eid = int(contract.register_contract("SourceWatch", "1.0.0", SOURCEWATCH_ADDR, "Studionet", padded))
    direct_vm.clear_mocks()
    entry = contract.get_entry(eid)
    assert entry["network"] == "studionet"


def test_list_entries_and_pagination(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = direct_deploy("contracts/genkit_registry.py")
    register_entry(contract, direct_vm, direct_alice, name="SourceWatch", version="1.0.0")
    direct_vm.sender = direct_bob
    mock_schema_rpc(direct_vm)
    contract.register_contract("EscrowJury", "2.0.0", "0x1111111111111111111111111111111111111111", "testnet-bradbury", SCHEMA_JSON)
    direct_vm.clear_mocks()

    all_entries = contract.list_entries(0, 10)
    assert len(all_entries) == 2
    assert [e["name"] for e in all_entries] == ["SourceWatch", "EscrowJury"]

    page = contract.list_entries(1, 1)
    assert len(page) == 1
    assert page[0]["name"] == "EscrowJury"

    config = contract.get_config()
    assert config["entry_count"] == 2


def test_get_entry_by_contract(direct_vm, direct_deploy, direct_alice):
    contract = direct_deploy("contracts/genkit_registry.py")
    register_entry(contract, direct_vm, direct_alice)
    found = contract.get_entry_by_contract(SOURCEWATCH_ADDR.lower())
    assert found is not None and found["name"] == "SourceWatch"
    assert contract.get_entry_by_contract("0x2222222222222222222222222222222222222222") is None


def test_get_entry_schema_returns_parsed_schema(direct_vm, direct_deploy, direct_alice):
    contract = direct_deploy("contracts/genkit_registry.py")
    eid = register_entry(contract, direct_vm, direct_alice)
    schema = contract.get_entry_schema(eid)
    assert schema is not None
    assert "methods" in schema
    assert "register_source" in schema["methods"]
    assert contract.get_entry_schema(999) is None


def test_deprecate_entry_owner_only(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = direct_deploy("contracts/genkit_registry.py")
    eid = register_entry(contract, direct_vm, direct_alice)
    direct_vm.sender = direct_bob
    with direct_vm.expect_revert("only the owner"):
        contract.deprecate_entry(eid)
    direct_vm.sender = direct_alice
    contract.deprecate_entry(eid)
    entry = contract.get_entry(eid)
    assert entry["status"] == "DEPRECATED"
