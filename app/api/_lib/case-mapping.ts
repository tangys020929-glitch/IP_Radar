export type CasePayload = Record<string, unknown>;

export const CASE_EXCEL_FIELD_MAP = {
  "案例ID": "source_case_id",
  "案例": "case_name / partners",
  "联名双方": "case_name / partners",
  "IP名称": "ip_name",
  "IP类型": "ip_type",
  "IP授权方": "ip_licensor",
  "品牌名称": "brand_name",
  "品牌行业": "brand_industry",
  "活动开始时间": "cooperation_date",
  "活动图片": "cover_image / images",
  "合作形式": "cooperation_type",
  "产品内容": "cooperation_content",
  "周边产品": "merchandising",
  "周边形式": "merchandising",
  "活动玩法": "activity_play",
  "线下活动（若无，则填无）": "offline_activity",
  "官方来源链接": "official_url",
  "IP简介": "ip_description",
  "品牌简介": "brand_description",
  "合作亮点": "highlights",
} as const;

const value = (input: CasePayload, ...keys: string[]) => {
  for (const key of keys) {
    const candidate = input[key];
    if (candidate !== undefined && candidate !== null && String(candidate).trim()) return String(candidate).trim();
  }
  return "";
};

const normalizeDate = (input: unknown) => {
  if (typeof input === "number") return new Date(Date.UTC(1899, 11, 30) + Math.floor(input) * 86400000).toISOString().slice(0, 10);
  if (input instanceof Date && !Number.isNaN(input.valueOf())) return `${input.getFullYear()}-${String(input.getMonth() + 1).padStart(2, "0")}-${String(input.getDate()).padStart(2, "0")}`;
  const text = String(input || "").trim();
  const match = text.match(/(\d{4}).*?(\d{1,2}).*?(\d{1,2})/);
  return match ? `${match[1]}-${match[2].padStart(2, "0")}-${match[3].padStart(2, "0")}` : text;
};

const imageUrls = (input: unknown) => String(input || "").split(/[\n;,]+/).map((item) => item.trim()).filter((item) => /^https?:\/\//i.test(item));

export function normalizeCasePayload(input: CasePayload) {
  const ipName = value(input, "IP名称", "ip_name");
  const brandName = value(input, "品牌名称", "brand_name");
  const caseName = value(input, "案例", "联名双方", "case_name", "partners") || [brandName, ipName].filter(Boolean).join("×");
  const suppliedImages = [
    ...imageUrls(input.cover_image),
    ...imageUrls(input.images),
    ...imageUrls(input.图片URL),
    ...imageUrls(input.活动图片),
  ].filter((item, index, all) => all.indexOf(item) === index);

  return {
    sourceCaseId: value(input, "案例ID", "source_case_id"),
    caseName,
    partners: caseName,
    ipName,
    ipType: value(input, "IP类型", "ip_type"),
    ipLicensor: value(input, "IP授权方", "ip_licensor"),
    ipDescription: value(input, "IP简介", "ip_description", "ip_intro"),
    brandName,
    brandIndustry: value(input, "品牌行业", "brand_industry"),
    brandDescription: value(input, "品牌简介", "brand_description", "brand_intro"),
    cooperationDate: normalizeDate(input.活动开始时间 ?? input.cooperation_date),
    cooperationType: value(input, "合作形式", "cooperation_type", "cooperation_form"),
    cooperationContent: value(input, "合作内容", "产品内容", "cooperation_content", "product_content"),
    merchandising: value(input, "周边产品", "周边形式", "merchandising"),
    activityPlay: value(input, "活动玩法", "activity_play"),
    offlineActivity: value(input, "线下活动（若无，则填无）", "线下活动", "offline_activity"),
    highlights: value(input, "合作亮点", "highlights"),
    officialUrl: value(input, "官方来源链接", "official_url"),
    tags: value(input, "标签", "tags"),
    coverImage: suppliedImages[0] || "",
    images: suppliedImages.slice(1).join("\n"),
  };
}

export function toCanonicalCasePayload(input: CasePayload) {
  const item = normalizeCasePayload(input);
  return {
    source_case_id: item.sourceCaseId,
    case_name: item.caseName,
    partners: item.partners,
    ip_name: item.ipName,
    ip_type: item.ipType,
    ip_licensor: item.ipLicensor,
    ip_description: item.ipDescription,
    brand_name: item.brandName,
    brand_industry: item.brandIndustry,
    brand_description: item.brandDescription,
    cooperation_date: item.cooperationDate,
    cooperation_type: item.cooperationType,
    cooperation_content: item.cooperationContent,
    merchandising: item.merchandising,
    activity_play: item.activityPlay,
    offline_activity: item.offlineActivity,
    highlights: item.highlights,
    official_url: item.officialUrl,
    tags: item.tags,
    cover_image: item.coverImage,
    images: item.images,
  };
}

const parseExtra = (raw: unknown): Record<string, unknown> => {
  try { return JSON.parse(String(raw || "{}")) as Record<string, unknown>; } catch { return {}; }
};

export function mapDatabaseCase(row: Record<string, string>) {
  const extra = parseExtra(row.extra_json);
  const ipDescription = row.ip_description || row.ip_intro || "";
  const brandDescription = row.brand_description || row.brand_intro || "";
  const cooperationType = row.cooperation_type || row.cooperation_form || "";
  const cooperationContent = row.cooperation_content || row.product_content || "";
  const caseName = row.case_name || row.partners || [row.brand_name, row.ip_name].filter(Boolean).join("×");
  return {
    ...extra,
    案例ID: row.id,
    source_case_id: row.source_case_id || "",
    联名双方: caseName,
    case_name: caseName,
    partners: row.partners || caseName,
    IP名称: row.ip_name,
    ip_name: row.ip_name,
    IP类型: row.ip_type,
    ip_type: row.ip_type,
    IP授权方: row.ip_licensor || "",
    ip_licensor: row.ip_licensor || "",
    IP简介: ipDescription,
    ip_description: ipDescription,
    品牌名称: row.brand_name,
    brand_name: row.brand_name,
    品牌行业: row.brand_industry,
    brand_industry: row.brand_industry,
    品牌简介: brandDescription,
    brand_description: brandDescription,
    活动开始时间: row.cooperation_date,
    cooperation_date: row.cooperation_date,
    合作形式: cooperationType,
    cooperation_type: cooperationType,
    产品内容: cooperationContent,
    合作内容: cooperationContent,
    cooperation_content: cooperationContent,
    周边形式: row.merchandising,
    周边产品: row.merchandising,
    活动玩法: row.activity_play,
    线下活动: row.offline_activity || "",
    offline_activity: row.offline_activity || "",
    合作亮点: row.highlights,
    官方来源链接: row.official_url,
    标签: row.tags,
    cover_image: String(extra.cover_image || ""),
    images: String(extra.images || ""),
  };
}
