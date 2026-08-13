import { getD1, json, makeId, now } from "../_lib/db";

const payloadFrom = (body: Record<string, unknown>) => ({
  日期: String(body.日期 || body.date || ""),
  趋势标题: String(body.趋势标题 || body.title || ""),
  案例依据: String(body.案例依据 || body.evidence || ""),
  趋势判断: String(body.趋势判断 || body.judgment || ""),
  可参考方向: String(body.可参考方向 || body.recommendation || ""),
});

export async function POST(request: Request) {
  const payload = payloadFrom(await request.json() as Record<string, unknown>);
  if (!payload.趋势标题) return json({ error: "请填写趋势标题" }, { status: 400 });
  const db = getD1();
  const id = makeId("trend");
  const timestamp = now();
  await db.prepare("INSERT INTO library_items (id, collection, item_name, payload_json, created_at, updated_at) VALUES (?1,'trends',?2,?3,?4,?5)").bind(id, payload.趋势标题, JSON.stringify(payload), timestamp, timestamp).run();
  return json({ id, ...payload }, { status: 201 });
}

export async function PATCH(request: Request) {
  const body = await request.json() as Record<string, unknown>;
  if (!body.id) return json({ error: "缺少趋势 ID" }, { status: 400 });
  const payload = payloadFrom(body);
  if (!payload.趋势标题) return json({ error: "请填写趋势标题" }, { status: 400 });
  await getD1().prepare("UPDATE library_items SET item_name=?1, payload_json=?2, updated_at=?3 WHERE id=?4 AND collection='trends'").bind(payload.趋势标题, JSON.stringify(payload), now(), body.id).run();
  return json({ ok: true, id: body.id });
}

export async function DELETE(request: Request) {
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return json({ error: "缺少趋势 ID" }, { status: 400 });
  await getD1().prepare("DELETE FROM library_items WHERE id=?1 AND collection='trends'").bind(id).run();
  return json({ ok: true, id });
}
