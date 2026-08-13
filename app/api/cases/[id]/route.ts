import { getD1, json, now } from "../../_lib/db";
import { normalizeCasePayload, type CasePayload } from "../../_lib/case-mapping";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const item = normalizeCasePayload(await request.json() as CasePayload);
  const db = getD1();
  const existing = await db.prepare("SELECT extra_json FROM cases WHERE id=?1").bind(id).first<{ extra_json: string }>();
  if (!existing) return json({ error: "案例不存在" }, { status: 404 });
  const extra = JSON.parse(existing.extra_json || "{}") as Record<string, unknown>;
  await db.prepare("UPDATE cases SET source_case_id=?1, case_name=?2, partners=?3, ip_name=?4, ip_licensor=?5, ip_description=?6, brand_name=?7, brand_industry=?8, brand_description=?9, cooperation_date=?10, cooperation_type=?11, cooperation_form=?11, cooperation_content=?12, product_content=?12, merchandising=?13, activity_play=?14, offline_activity=?15, highlights=?16, official_url=?17, tags=?18, ip_type=?19, ip_intro=?6, brand_intro=?9, extra_json=?20, updated_at=?21 WHERE id=?22").bind(item.sourceCaseId, item.caseName, item.partners, item.ipName, item.ipLicensor, item.ipDescription, item.brandName, item.brandIndustry, item.brandDescription, item.cooperationDate, item.cooperationType, item.cooperationContent, item.merchandising, item.activityPlay, item.offlineActivity, item.highlights, item.officialUrl, item.tags, item.ipType, JSON.stringify({ ...extra, cover_image: item.coverImage || extra.cover_image || "", images: item.images || extra.images || "" }), now(), id).run();
  return json({ ok: true, id });
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const db = getD1();
  await db.batch([db.prepare("DELETE FROM case_images WHERE case_id=?1").bind(id), db.prepare("DELETE FROM cases WHERE id=?1").bind(id)]);
  return json({ ok: true, id });
}
