import { env } from "cloudflare:workers";
import { getD1, json } from "../../_lib/db";

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params; const db = getD1(); const image = await db.prepare("SELECT object_key FROM case_images WHERE id=?1").bind(id).first<{ object_key: string }>();
  if (!image) return json({ error: "图片不存在" }, { status: 404 });
  await env.IMAGES.delete(image.object_key); await db.prepare("DELETE FROM case_images WHERE id=?1").bind(id).run();
  return json({ ok: true, id });
}
