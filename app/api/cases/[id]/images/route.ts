import { env } from "cloudflare:workers";
import { getD1, json, makeId, now } from "../../../_lib/db";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params; const form = await request.formData(); const file = form.get("file");
  if (!(file instanceof File)) return json({ error: "请上传图片文件" }, { status: 400 });
  if (!file.type.startsWith("image/")) return json({ error: "仅支持图片文件" }, { status: 400 });
  const objectKey = `cases/${id}/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  await env.IMAGES.put(objectKey, file.stream(), { httpMetadata: { contentType: file.type } });
  const imageId = makeId("image");
  await getD1().prepare("INSERT INTO case_images (id, case_id, object_key, file_name, content_type, created_at) VALUES (?1,?2,?3,?4,?5,?6)").bind(imageId, id, objectKey, file.name, file.type, now()).run();
  return json({ id: imageId, url: `/api/images/${encodeURIComponent(objectKey)}` }, { status: 201 });
}
