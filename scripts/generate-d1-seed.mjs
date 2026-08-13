import XLSX from "xlsx";
import { mkdir, writeFile } from "node:fs/promises";

const path = "/Users/tang/Downloads/IP联名商业情报数据库模板 2.xlsx";
const workbook = XLSX.readFile(path, { cellDates: true });
const read = (name) => XLSX.utils.sheet_to_json(workbook.Sheets[name], { defval: "", raw: false });
const sql = [];
const esc = (value) => `'${String(value ?? "").replaceAll("'", "''")}'`;
sql.push("CREATE TABLE IF NOT EXISTS cases (id TEXT PRIMARY KEY, ip_name TEXT NOT NULL, brand_name TEXT NOT NULL, brand_industry TEXT NOT NULL DEFAULT '', cooperation_date TEXT NOT NULL DEFAULT '', cooperation_form TEXT NOT NULL DEFAULT '', product_content TEXT NOT NULL DEFAULT '', merchandising TEXT NOT NULL DEFAULT '', activity_play TEXT NOT NULL DEFAULT '', highlights TEXT NOT NULL DEFAULT '', reference_value TEXT NOT NULL DEFAULT '', official_url TEXT NOT NULL DEFAULT '', tags TEXT NOT NULL DEFAULT '', ip_type TEXT NOT NULL DEFAULT '', ip_intro TEXT NOT NULL DEFAULT '', brand_intro TEXT NOT NULL DEFAULT '', extra_json TEXT NOT NULL DEFAULT '{}', created_at TEXT NOT NULL, updated_at TEXT NOT NULL);");
sql.push("CREATE TABLE IF NOT EXISTS case_images (id TEXT PRIMARY KEY, case_id TEXT NOT NULL, object_key TEXT NOT NULL, file_name TEXT NOT NULL DEFAULT '', content_type TEXT NOT NULL DEFAULT 'image/jpeg', created_at TEXT NOT NULL);");
sql.push("CREATE TABLE IF NOT EXISTS library_items (id TEXT PRIMARY KEY, collection TEXT NOT NULL, item_name TEXT NOT NULL DEFAULT '', payload_json TEXT NOT NULL DEFAULT '{}', created_at TEXT NOT NULL, updated_at TEXT NOT NULL);");
sql.push("CREATE INDEX IF NOT EXISTS idx_cases_ip_name ON cases(ip_name);");
sql.push("CREATE INDEX IF NOT EXISTS idx_cases_brand_name ON cases(brand_name);");
sql.push("CREATE INDEX IF NOT EXISTS idx_cases_cooperation_date ON cases(cooperation_date);");
sql.push("CREATE INDEX IF NOT EXISTS idx_library_collection ON library_items(collection);");
const timestamp = "2026-08-09T00:00:00.000Z";
const cases = read("01_联名案例");
for (const [index, row] of cases.entries()) {
  const extra = JSON.stringify(row);
  sql.push(`INSERT OR IGNORE INTO cases (id,ip_name,brand_name,brand_industry,cooperation_date,cooperation_form,product_content,merchandising,activity_play,highlights,reference_value,official_url,tags,ip_type,ip_intro,brand_intro,extra_json,created_at,updated_at) VALUES (${esc(`case_seed_${index + 1}`)},${esc(row.IP名称)},${esc(row.品牌名称)},${esc(row.品牌行业)},${esc(row.活动开始时间)},${esc(row.合作形式)},${esc(row.产品内容)},${esc(row.周边形式)},${esc(row.活动玩法)},${esc(row.合作亮点)},'',${esc(row.官方来源链接)},${esc(`${row.IP类型 || ""},${row.品牌行业 || ""}`)},${esc(row.IP类型)},${esc(row.IP简介)},'',${esc(extra)},${esc(timestamp)},${esc(timestamp)});`);
}
const libraryMap = [["02_国漫IP资产库", "ip_assets", "IP名称"], ["03_品牌资产库", "brand_assets", "品牌名称"], ["04_优酷IP资产库", "youku_assets", "IP名称"], ["05_商业化玩法标签", "play_tags", "二级标签"], ["06_行业趋势观察", "trends", "趋势标题"]];
for (const [sheet, collection, nameKey] of libraryMap) for (const [index, row] of read(sheet).entries()) sql.push(`INSERT OR IGNORE INTO library_items (id,collection,item_name,payload_json,created_at,updated_at) VALUES (${esc(`${collection}_${index + 1}`)},${esc(collection)},${esc(row[nameKey])},${esc(JSON.stringify(row))},${esc(timestamp)},${esc(timestamp)});`);
await mkdir("drizzle", { recursive: true });
await writeFile("drizzle/0001_ip_radar.sql", `${sql.join("\n")}\n`);
console.log(`Generated ${cases.length} cases and ${sql.length - cases.length - 7} library rows`);
