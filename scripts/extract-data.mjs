import XLSX from "xlsx";
import { mkdir, writeFile } from "node:fs/promises";

const workbook = XLSX.readFile("/Users/tang/Downloads/IP联名商业情报数据库模板 2.xlsx", { cellDates: true });
const sheets = {};
for (const name of workbook.SheetNames) {
  sheets[name] = XLSX.utils.sheet_to_json(workbook.Sheets[name], { defval: "", raw: false });
}

await mkdir("app", { recursive: true });
await writeFile(
  "app/data.ts",
  `export const workbookData = ${JSON.stringify(sheets, null, 2)} as const;\n`,
);
console.log(workbook.SheetNames.map((name) => `${name}: ${sheets[name].length}`).join("\\n"));
