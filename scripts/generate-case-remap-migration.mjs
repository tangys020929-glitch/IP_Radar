import XLSX from "xlsx";
import { writeFile } from "node:fs/promises";

const workbookPath = "/Users/tang/Desktop/IP联名商业情报数据库模板新.xlsx";
const workbook = XLSX.readFile(workbookPath, { cellDates: false });
const sheet = workbook.Sheets["01_联名案例"];
if (!sheet) throw new Error("缺少 01_联名案例 Sheet");

const rows = XLSX.utils.sheet_to_json(sheet, { defval: "", raw: true });
const required = ["案例ID", "联名双方", "IP名称", "IP类型", "IP授权方", "品牌名称", "品牌行业", "活动开始时间", "活动图片", "合作形式", "产品内容", "周边形式", "活动玩法", "线下活动（若无，则填无）", "官方来源链接", "IP简介", "品牌简介", "合作亮点"];
const actual = XLSX.utils.sheet_to_json(sheet, { header: 1, range: 0, blankrows: false })[0];
if (required.join("|") !== actual.join("|")) throw new Error(`案例 Sheet 列名或顺序已变化：${actual.join("、")}`);

const esc = (input) => `'${String(input ?? "").replaceAll("'", "''")}'`;
const isoDate = (input) => {
  if (typeof input === "number") return new Date(Date.UTC(1899, 11, 30) + Math.floor(input) * 86400000).toISOString().slice(0, 10);
  if (input instanceof Date && !Number.isNaN(input.valueOf())) return `${input.getFullYear()}-${String(input.getMonth() + 1).padStart(2, "0")}-${String(input.getDate()).padStart(2, "0")}`;
  const text = String(input || "").trim();
  const match = text.match(/(\d{4}).*?(\d{1,2}).*?(\d{1,2})/);
  return match ? `${match[1]}-${match[2].padStart(2, "0")}-${match[3].padStart(2, "0")}` : text;
};

const sql = [
  "ALTER TABLE cases ADD COLUMN source_case_id TEXT NOT NULL DEFAULT '';",
  "ALTER TABLE cases ADD COLUMN case_name TEXT NOT NULL DEFAULT '';",
  "ALTER TABLE cases ADD COLUMN partners TEXT NOT NULL DEFAULT '';",
  "ALTER TABLE cases ADD COLUMN ip_licensor TEXT NOT NULL DEFAULT '';",
  "ALTER TABLE cases ADD COLUMN ip_description TEXT NOT NULL DEFAULT '';",
  "ALTER TABLE cases ADD COLUMN cooperation_type TEXT NOT NULL DEFAULT '';",
  "ALTER TABLE cases ADD COLUMN cooperation_content TEXT NOT NULL DEFAULT '';",
  "ALTER TABLE cases ADD COLUMN offline_activity TEXT NOT NULL DEFAULT '';",
  "DELETE FROM case_images;",
  "DELETE FROM cases;",
];

const timestamp = "2026-08-11T00:00:00.000Z";
for (const row of rows) {
  const sourceId = String(row.案例ID).trim();
  if (!sourceId || !row.IP名称 || !row.品牌名称) throw new Error(`案例ID ${sourceId || "(空)"} 缺少必填字段`);
  const extra = JSON.stringify({ excel_sheet: "01_联名案例", excel_case_id: sourceId, cover_image: "", images: "" });
  const values = [
    `case_excel_${sourceId}`, sourceId, row.联名双方, row.联名双方, row.IP名称, row.IP授权方, row.IP简介,
    row.品牌名称, row.品牌行业, row.品牌简介, isoDate(row.活动开始时间), row.合作形式, row.合作形式,
    row.产品内容, row.产品内容, row.周边形式, row.活动玩法, row["线下活动（若无，则填无）"], row.合作亮点,
    "", row.官方来源链接, [row.IP类型, row.品牌行业].filter(Boolean).join(","), row.IP类型, row.IP简介,
    row.品牌简介, extra, timestamp, timestamp,
  ];
  sql.push(`INSERT INTO cases (id,source_case_id,case_name,partners,ip_name,ip_licensor,ip_description,brand_name,brand_industry,brand_description,cooperation_date,cooperation_type,cooperation_form,cooperation_content,product_content,merchandising,activity_play,offline_activity,highlights,reference_value,official_url,tags,ip_type,ip_intro,brand_intro,extra_json,created_at,updated_at) VALUES (${values.map(esc).join(",")});`);
}
sql.push("CREATE UNIQUE INDEX IF NOT EXISTS idx_cases_source_case_id ON cases(source_case_id) WHERE source_case_id != '';");
sql.push("PRAGMA optimize;");

await writeFile("drizzle/0003_case_field_remap.sql", `${sql.join("\n")}\n`);
console.log(`Generated canonical remap migration for ${rows.length} cases.`);
