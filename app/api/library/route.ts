import { getD1, json, makeId, now } from "../_lib/db";

export async function POST(request: Request) {
  const body = await request.json() as { collection?: string; itemName?: string; payload?: Record<string, unknown> };
  if (!body.collection || !body.itemName) return json({ error: "缺少资产库分类或名称" }, { status: 400 });
  const db = getD1(); const existing = await db.prepare("SELECT id FROM library_items WHERE collection=?1 AND item_name=?2 LIMIT 1").bind(body.collection, body.itemName).first() as { id: string } | null;
  if (existing) {
    await db.prepare("UPDATE library_items SET payload_json=?1, updated_at=?2 WHERE id=?3").bind(JSON.stringify(body.payload || {}), now(), existing.id).run();
    return json({ id: existing.id, updated: true });
  }
  const id = makeId(body.collection); const timestamp = now();
  await db.prepare("INSERT INTO library_items (id, collection, item_name, payload_json, created_at, updated_at) VALUES (?1,?2,?3,?4,?5,?6)").bind(id, body.collection, body.itemName, JSON.stringify(body.payload || {}), timestamp, timestamp).run();
  return json({ id, created: true }, { status: 201 });
}
