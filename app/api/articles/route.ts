import { getD1, json, makeId, now } from "../_lib/db";

const decode = (row: Record<string, string>) => ({ id: row.id, ...JSON.parse(row.payload_json || "{}") });

export async function GET() {
  const rows = await getD1().prepare("SELECT * FROM library_items WHERE collection='articles' ORDER BY updated_at DESC").all();
  return json((rows.results as Record<string, string>[]).map(decode));
}

export async function POST(request: Request) {
  const body = await request.json() as Record<string, unknown>;
  if (!body.title && !body.url && !body.body) return json({ error: "请至少填写文章链接或正文" }, { status: 400 });
  const db = getD1(); const timestamp = now(); const id = makeId("article");
  const payload = { title: body.title || "未命名行业文章", source: body.source || "", publishedAt: body.publishedAt || "", url: body.url || "", category: body.category || "", summary: body.summary || body.body || "", cases: body.cases || "", keywords: body.keywords || "", judgment: body.judgment || "", referenceValue: body.referenceValue || "" };
  await db.prepare("INSERT INTO library_items (id, collection, item_name, payload_json, created_at, updated_at) VALUES (?1,'articles',?2,?3,?4,?5)").bind(id, payload.title, JSON.stringify(payload), timestamp, timestamp).run();
  return json({ id, ...payload }, { status: 201 });
}

export async function PATCH(request: Request) {
  const body = await request.json() as Record<string, unknown>; if (!body.id) return json({ error: "缺少文章 ID" }, { status: 400 });
  const { id, ...payload } = body; const db = getD1();
  await db.prepare("UPDATE library_items SET item_name=?1, payload_json=?2, updated_at=?3 WHERE id=?4 AND collection='articles'").bind(payload.title || "未命名行业文章", JSON.stringify(payload), now(), id).run();
  return json({ ok: true, id });
}

export async function DELETE(request: Request) {
  const id = new URL(request.url).searchParams.get("id"); if (!id) return json({ error: "缺少文章 ID" }, { status: 400 });
  await getD1().prepare("DELETE FROM library_items WHERE id=?1 AND collection='articles'").bind(id).run(); return json({ ok: true, id });
}
