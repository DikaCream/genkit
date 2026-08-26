import { Link } from "react-router-dom";
import type { Entry } from "../lib/types";
import { formatDate, shortAddress, shortHash } from "../lib/client";

export default function EntryCard({ entry }: { entry: Entry }) {
  return (
    <Link to={`/registry/${entry.id}`} className="entry-card">
      <div className="entry-card-head">
        <span className="entry-name">{entry.name}</span>
        <span className={`tag ${entry.status === "ACTIVE" ? "tag-green" : "tag-gray"}`}>{entry.status}</span>
      </div>
      <div className="entry-meta">
        <span className="mono">{shortAddress(entry.contract_address)}</span>
        <span className="dim">·</span>
        <span>{entry.network}</span>
        <span className="dim">·</span>
        <span>v{entry.version}</span>
      </div>
      <div className="entry-foot">
        <span className="mono dim">{entry.total_methods} methods</span>
        <span className="dim">{formatDate(entry.registered_at)}</span>
      </div>
      <div className="entry-hash-mini mono dim">{shortHash(entry.schema_hash)}</div>
    </Link>
  );
}
