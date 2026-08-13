import { getD1, json, makeId, now } from "../_lib/db";
import { mapDatabaseCase, normalizeCasePayload, type CasePayload } from "../_lib/case-mapping";

export async function GET(request: Request) {
  const db = getD1();
  const url = new URL(request.url);
  const q = `%${(url.searchParams.get("q") || "").trim()}%`;
  const rows = await db.prepare("SELECT * FROM cases WHERE case_name LIKE ?1 OR partners LIKE ?1 OR ip_name LIKE ?1 OR brand_name LIKE ?1 OR cooperation_type LIKE ?1 ORDER BY cooperation_date DESC, created_at DESC").bind(q).all();
  const images = await db.prepare("SELECT * FROM case_images ORDER BY created_at ASC").all();
  const byCase: Record<string, string[]> = {};
  for (const image of images.results as Record<string, string>[]) (byCase[image.case_id] ||= []).push(`/api/images/${encodeURIComponent(image.object_key)}`);
  return json((rows.results as Record<string, string>[]).map((row) => ({ ...mapDatabaseCase(row), 图片URL: (byCase[row.id] || []).join("\n") })));
}

export async function POST(request: Request) {
  const body = await request.json() as CasePayload;
  const item = normalizeCasePayload(body);
  if (!item.ipName || !item.brandName) return json({ error: "IP名称和品牌名称为必填项" }, { status: 400 });

  const db = getD1();
  const timestamp = now();
  let existing: Record<string, string> | null = null;
  if (body.__upsert) {
    existing = item.sourceCaseId
      ? await db.prepare("SELECT id, extra_json FROM cases WHERE source_case_id=?1 LIMIT 1").bind(item.sourceCaseId).first() as Record<string, string> | null
      : await db.prepare("SELECT id, extra_json FROM cases WHERE ip_name=?1 AND brand_name=?2 LIMIT 1").bind(item.ipName, item.brandName).first() as Record<string, string> | null;
  }
  const previousExtra = existing ? JSON.parse(existing.extra_json || "{}") as Record<string, unknown> : {};
  const suppliedExtra = typeof body.extra === "object" && body.extra ? body.extra as Record<string, unknown> : {};
  const extra = { ...previousExtra, ...suppliedExtra, cover_image: item.coverImage || previousExtra.cover_image || "", images: item.images || previousExtra.images || "" };
  const values = [item.sourceCaseId, item.caseName, item.partners, item.ipName, item.ipLicensor, item.ipDescription, item.brandName, item.brandIndustry, item.brandDescription, item.cooperationDate, item.cooperationType, item.cooperationContent, item.merchandising, item.activityPlay, item.offlineActivity, item.highlights, item.officialUrl, item.tags, item.ipType, JSON.stringify(extra), timestamp];

  if (existing) {
    await db.prepare("UPDATE cases SET source_case_id=?1, case_name=?2, partners=?3, ip_name=?4, ip_licensor=?5, ip_description=?6, brand_name=?7, brand_industry=?8, brand_description=?9, cooperation_date=?10, cooperation_type=?11, cooperation_form=?11, cooperation_content=?12, product_content=?12, merchandising=?13, activity_play=?14, offline_activity=?15, highlights=?16, official_url=?17, tags=?18, ip_type=?19, ip_intro=?6, brand_intro=?9, extra_json=?20, updated_at=?21 WHERE id=?22").bind(...values, existing.id).run();
    return json({ id: existing.id, updated: true });
  }

  const id = makeId("case");
  await db.prepare("INSERT INTO cases (id, source_case_id, case_name, partners, ip_name, ip_licensor, ip_description, brand_name, brand_industry, brand_description, cooperation_date, cooperation_type, cooperation_form, cooperation_content, product_content, merchandising, activity_play, offline_activity, highlights, official_url, tags, ip_type, ip_intro, brand_intro, extra_json, created_at, updated_at) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?12,?13,?13,?14,?15,?16,?17,?18,?19,?20,?7,?10,?21,?22,?22)").bind(id, ...values).run();
  return json({ id, created: true }, { status: 201 });
}
