import { getD1, json } from "../_lib/db";
import { mapDatabaseCase } from "../_lib/case-mapping";

export async function GET() {
  const db = getD1();
  const [cases, assets] = await Promise.all([
    db.prepare("SELECT * FROM cases ORDER BY cooperation_date DESC, created_at DESC").all(),
    db.prepare("SELECT * FROM library_items ORDER BY collection, item_name").all(),
  ]);
  const grouped: Record<string, unknown[]> = {};
  for (const row of assets.results as Record<string, string>[]) {
    const payload = JSON.parse(row.payload_json || "{}");
    grouped[row.collection] ||= [];
    grouped[row.collection].push({ id: row.id, ...payload });
  }
  const mappedCases = (cases.results as Record<string, string>[]).map(mapDatabaseCase);
  return json({ cases: mappedCases, library: grouped });
}
