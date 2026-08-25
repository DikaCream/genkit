import { useGenKit } from "../context/GenKitContext";
import { shortAddress } from "../lib/client";

export default function WalletButton() {
  const { account, connecting, connect, disconnect } = useGenKit();

  if (account) {
    return (
      <div className="wallet-wrap">
        <span className="wallet-dot" />
        <span className="wallet-addr">{shortAddress(account)}</span>
        <button className="btn btn-ghost btn-sm" onClick={disconnect}>
          Exit
        </button>
      </div>
    );
  }

  return (
    <button className="btn btn-primary btn-sm" onClick={connect} disabled={connecting}>
      {connecting ? "Connecting…" : "Connect wallet"}
    </button>
  );
}
