"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { toCanonicalCasePayload } from "./api/_lib/case-mapping";

type CaseRow = Record<string, string>;
type Tab = "overview" | "cases" | "ip" | "brand" | "weekly" | "articles" | "add" | "admin";

let ipAssets: CaseRow[] = [];
let brandAssets: CaseRow[] = [];
let youkuAssets: CaseRow[] = [];
let trendAssets: CaseRow[] = [];
let articleAssets: CaseRow[] = [];

const field = (row: CaseRow, ...keys: string[]) => keys.map((key) => row[key]).find(Boolean) || "—";
const sourceUrl = (row: CaseRow) => { const value = field(row, "官方来源链接", "official_url"); return value === "—" ? "" : value; };
const dateValue = (value: string) => {
  const matched = value?.match(/(\d{4}).*?(\d{1,2}).*?(\d{1,2})/);
  return matched ? `${matched[1]}-${matched[2].padStart(2, "0")}-${matched[3].padStart(2, "0")}` : "";
};
const displayDate = (value: string) => dateValue(value).replaceAll("-", ".") || value || "待补充";

const blankForm: CaseRow = {
  联名双方: "", IP名称: "", IP简介: "", 品牌名称: "", 品牌行业: "", 品牌简介: "", brand_description: "", 活动开始时间: "", 合作形式: "", 产品内容: "", 周边形式: "", 活动玩法: "", 线下活动: "", 活动图片: "", 图片URL: "", 图片上传: "", 官方来源链接: "", 合作亮点: "",
};

const getImages = (item: CaseRow) => [item.cover_image, item.images, item.图片URL, item.图片上传, item.活动图片]
  .flatMap((value) => (Array.isArray(value) ? value : String(value || "")).toString().split(/[\n;,]+/).map((image) => image.trim()))
  .filter((image, index, all) => /^(https?:\/\/|data:image\/)/i.test(image) && all.indexOf(image) === index);
const tokens = (value: string) => (value || "").split(/[、，,；;｜|/\s]+/).map((x) => x.trim()).filter((x) => x.length > 1);
const ipAssetFor = (item: CaseRow) => ipAssets.find((asset) => asset.IP名称 === item.IP名称) || youkuAssets.find((asset) => asset.IP名称 === item.IP名称);
const similarCases = (current: CaseRow, allCases: CaseRow[]) => {
  const currentAsset = ipAssetFor(current);
  const currentTopics = tokens(field(currentAsset || ({} as CaseRow), "核心题材", "IP关键词"));
  const currentUser = tokens(field(currentAsset || ({} as CaseRow), "用户画像", "目标用户"));
  return allCases.filter((candidate) => candidate !== current).map((candidate) => {
    const asset = ipAssetFor(candidate);
    const reasons: string[] = [];
    if (field(current, "IP类型") && field(current, "IP类型") === field(candidate, "IP类型")) reasons.push(`同为${field(candidate, "IP类型")}IP`);
    const topicHit = currentTopics.filter((topic) => `${field(asset || ({} as CaseRow), "核心题材", "IP关键词")}`.includes(topic));
    if (topicHit.length) reasons.push(`题材相近（${topicHit.slice(0, 2).join("、")}）`);
    if (field(current, "品牌行业") && field(current, "品牌行业") === field(candidate, "品牌行业")) reasons.push(`${field(candidate, "品牌行业")}联名方式相同`);
    if (field(current, "合作形式") && field(current, "合作形式") === field(candidate, "合作形式")) reasons.push("合作形式相同");
    const userHit = currentUser.filter((word) => `${field(asset || ({} as CaseRow), "用户画像", "目标用户")}`.includes(word));
    if (userHit.length) reasons.push("目标用户存在交集");
    const playHit = tokens(`${field(current, "周边形式")} ${field(current, "活动玩法")}`).filter((word) => `${field(candidate, "周边形式")} ${field(candidate, "活动玩法")}`.includes(word));
    if (playHit.length) reasons.push("商业化玩法相近");
    return { candidate, reasons, score: reasons.length };
  }).filter((item) => item.score > 0).sort((a, b) => b.score - a.score).slice(0, 3);
};

export default function Home() {
  const [tab, setTab] = useState<Tab>("overview");
  const [cases, setCases] = useState<CaseRow[]>([]);
  const [libraryReady, setLibraryReady] = useState(false);
  const [query, setQuery] = useState("");
  const [caseDate, setCaseDate] = useState("");
  const [selectedCase, setSelectedCase] = useState<CaseRow | null>(null);
  const [ipQuery, setIpQuery] = useState("一人之下");
  const [range, setRange] = useState({ start: "2026-07-27", end: "2026-08-09" });
  const [weeklyFilters, setWeeklyFilters] = useState({ industry: "", ip: "", brand: "" });
  const [form, setForm] = useState(blankForm);
  const [notice, setNotice] = useState("");

  const refreshData = async () => {
    const response = await fetch("/api/bootstrap");
    if (!response.ok) throw new Error("数据库暂时不可用");
    const data = await response.json() as { cases: CaseRow[]; library: Record<string, CaseRow[]> };
    setCases(data.cases || []);
    ipAssets = data.library.ip_assets || [];
    brandAssets = data.library.brand_assets || [];
    youkuAssets = data.library.youku_assets || [];
    trendAssets = (data.library.trends || []).sort((a, b) => dateValue(b.日期).localeCompare(dateValue(a.日期)));
    articleAssets = data.library.articles || [];
    setLibraryReady(true);
  };
  useEffect(() => { refreshData().catch(() => setNotice("数据库连接中，请稍后刷新页面")); }, []);
  const filteredCases = useMemo(() => cases.filter((item) => {
    const text = [item.IP名称, item.品牌名称, item.联名双方].join(" ").toLowerCase();
    return text.includes(query.toLowerCase()) && (!caseDate || dateValue(item.活动开始时间) === caseDate);
  }), [cases, query, caseDate]);
  const ipInfo = useMemo(() => ipAssets.find((item) => item.IP名称 === ipQuery) || youkuAssets.find((item) => item.IP名称 === ipQuery) || ipAssets.find((item) => item.IP名称?.includes(ipQuery)) || youkuAssets.find((item) => item.IP名称?.includes(ipQuery)), [ipQuery, libraryReady]);
  const ipCases = useMemo(() => cases.filter((item) => item.IP名称 === ipQuery || item.IP名称?.includes(ipQuery)), [cases, ipQuery]);
  const weeklyCases = useMemo(() => cases.filter((item) => { const d = dateValue(item.活动开始时间); return (!range.start || d >= range.start) && (!range.end || d <= range.end) && (!weeklyFilters.industry || item.品牌行业 === weeklyFilters.industry) && (!weeklyFilters.ip || item.IP名称 === weeklyFilters.ip) && (!weeklyFilters.brand || item.品牌名称 === weeklyFilters.brand); }), [cases, range, weeklyFilters]);
  const topWeekly = weeklyCases.slice(0, 3);

  const go = (next: Tab) => { setTab(next); setNotice(""); };
  const handleForm = async (event: FormEvent) => {
    event.preventDefault();
    if (!form.IP名称 || !form.品牌名称 || !form.活动开始时间) { setNotice("请至少填写 IP名称、品牌名称和时间"); return; }
    const response = await fetch("/api/cases", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(form) });
    if (!response.ok) { setNotice("保存失败，请稍后重试"); return; }
    const created = await response.json() as { id: string };
    const uploadedImages = (form.图片上传 || "").split(/[\n;,]+/).filter((value) => value.startsWith("data:image/"));
    for (const [index, dataUrl] of uploadedImages.entries()) { const blob = await fetch(dataUrl).then((result) => result.blob()); const payload = new FormData(); payload.append("file", blob, `case-image-${index + 1}.jpg`); await fetch(`/api/cases/${encodeURIComponent(created.id)}/images`, { method: "POST", body: payload }); }
    await refreshData(); setForm(blankForm); setNotice("案例已保存到线上数据库"); go("cases");
  };
  const handleImageUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    Promise.all(files.map((file) => new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = reject; reader.readAsDataURL(file); }))).then((images) => setForm({ ...form, 图片上传: [form.图片上传, ...images].filter(Boolean).join("\n") }));
  };
  const handleImport = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const workbook = XLSX.read(e.target?.result, { type: "array", cellDates: false });
        const sheetName = workbook.SheetNames.find((name) => name.includes("联名案例")) || workbook.SheetNames[0];
        const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: "", raw: true }) as CaseRow[];
        const caseRows = rows.map((row) => ({ ...toCanonicalCasePayload(row), __upsert: true }));
        await Promise.all(caseRows.map((row) => fetch("/api/cases", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(row) })));
        const sheetMap: Record<string, string> = { "02_国漫IP资产库": "ip_assets", "03_品牌资产库": "brand_assets", "04_优酷IP资产库": "youku_assets", "05_商业化玩法标签": "play_tags", "06_行业趋势观察": "trends", "07_行业洞察库": "articles" };
        for (const [name, collection] of Object.entries(sheetMap)) {
          const source = workbook.Sheets[name]; if (!source) continue;
          const assets = XLSX.utils.sheet_to_json(source, { defval: "", raw: false }) as CaseRow[];
          await Promise.all(assets.filter((asset) => Object.values(asset).some(Boolean)).map((asset, index) => fetch("/api/library", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ collection, itemName: asset.IP名称 || asset.品牌名称 || asset.二级标签 || asset.趋势标题 || asset.标题 || asset.原文链接 || `${collection}-${index + 1}`, payload: asset }) })));
        }
        await refreshData(); setNotice(`已校准 ${rows.length} 条案例并同步资产库；重复案例已更新，不重复新增`);
      } catch { setNotice("导入失败，请确认文件为 .xlsx 或 .xls 格式"); }
    };
    reader.readAsArrayBuffer(file);
  };

  return <main className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark">IP</div><div><strong>IP Radar</strong><small>商业情报数据库</small></div></div>
      <div className="side-label">工作台</div>
      <nav>{([["overview", "总览", "⌂"], ["cases", "案例库", "◈"], ["ip", "IP查询分析", "◎"], ["weekly", "行业周报", "▤"], ["articles", "行业洞察库", "✦"]] as [Tab,string,string][]).map(([key, label, icon]) => <button className={tab === key ? "nav-item active" : "nav-item"} key={key} onClick={() => go(key)}><span>{icon}</span>{label}</button>)}</nav>
      <div className="side-label lower">数据管理</div>
      <button className={tab === "admin" ? "nav-item active" : "nav-item"} onClick={() => go("admin")}><span>⚙</span>后台管理</button>
      <button className={tab === "add" ? "nav-item active" : "nav-item"} onClick={() => go("add")}><span>＋</span>新增案例</button>
      <label className="import-link"><span>↥</span>导入 Excel<input type="file" accept=".xlsx,.xls" onChange={handleImport} /></label>
      <div className="sidebar-foot">MVP · 本地工作区<br /><span>最后更新 2026.08.09</span></div>
    </aside>

    <section className="main-content">
      <header className="topbar"><div><span className="eyebrow">CONTENT INTELLIGENCE / 2026</span><h1>{tab === "overview" ? "商业情报总览" : tab === "cases" ? "联名案例库" : tab === "ip" ? "IP查询分析" : tab === "brand" ? "品牌库" : tab === "weekly" ? "行业周报" : tab === "articles" ? "行业洞察库" : tab === "admin" ? "后台管理" : "新增联名案例"}</h1></div><div className="top-actions"><span className="status-dot">● 数据已同步</span><button className="primary-btn" onClick={() => go("add")}>＋ 新增案例</button></div></header>
      {notice && <div className="notice">{notice}</div>}
      {tab === "overview" && <Overview cases={cases} go={go} setSelectedCase={setSelectedCase} libraryReady={libraryReady} />}
      {tab === "cases" && <Cases cases={cases} filteredCases={filteredCases} query={query} setQuery={setQuery} caseDate={caseDate} setCaseDate={setCaseDate} setSelectedCase={setSelectedCase} handleImport={handleImport} />}
      {tab === "ip" && <IPAnalysis ipQuery={ipQuery} setIpQuery={setIpQuery} ipInfo={ipInfo} ipCases={ipCases} />}
      {tab === "brand" && <BrandLibrary brands={brandAssets} cases={cases} setSelectedCase={setSelectedCase} />}
      {tab === "weekly" && <Weekly range={range} setRange={setRange} filters={weeklyFilters} setFilters={setWeeklyFilters} cases={cases} weeklyCases={weeklyCases} topWeekly={topWeekly} articles={articleAssets} />}
      {tab === "articles" && <Articles articles={articleAssets} onRefresh={refreshData} />}
      {tab === "add" && <AddCase form={form} setForm={setForm} handleForm={handleForm} handleImageUpload={handleImageUpload} />}
      {tab === "admin" && <AdminPanel cases={cases} trends={trendAssets} onRefresh={refreshData} />}
      {selectedCase && <CaseModal item={selectedCase} cases={cases} close={() => setSelectedCase(null)} onDelete={async () => { if (!window.confirm("确认删除该案例？删除后不可恢复。")) return; const response = await fetch(`/api/cases/${encodeURIComponent(selectedCase.案例ID)}`, { method: "DELETE" }); if (!response.ok) { setNotice("删除失败，请稍后重试"); return; } setSelectedCase(null); await refreshData(); setNotice("案例已删除"); }} />}
    </section>
  </main>;
}

function Stat({ label, value, accent, onClick }: { label: string; value: string | number; accent?: string; onClick?: () => void }) { return <button className="stat-card" onClick={onClick} type="button"><span>{label}</span><strong className={accent || ""}>{value}</strong><small>较上周 <b>↑</b> 持续更新</small></button>; }
function Overview({ cases, go, setSelectedCase, libraryReady }: { cases: CaseRow[]; go: (t: Tab) => void; setSelectedCase: (c: CaseRow) => void; libraryReady: boolean }) { const recent = cases.slice(0, 5); return <>
  <div className="hero"><div><span className="pill">本周研究焦点</span><h2>国漫联名强势来袭</h2><button className="dark-btn report-cta" onClick={() => go("weekly")}>查看本周IP联名周报 <span>→</span></button></div></div>
  <div className="stats-grid"><Stat label="累计联名案例（自2026.7）" value={libraryReady ? cases.length : "—"} onClick={() => go("cases")} /><Stat label="IP合辑" value={libraryReady ? ipAssets.length : "—"} onClick={() => go("ip")} /><Stat label="品牌合辑" value={libraryReady ? brandAssets.length : "—"} onClick={() => go("brand")} /></div>
  <div className="content-grid"><section className="panel recent-panel"><div className="panel-head"><div><span className="section-kicker">LATEST CASES</span><h3>最新联名案例</h3></div><button className="text-btn" onClick={() => go("cases")}>查看全部 →</button></div>{recent.map((item, index) => <button className="case-row" key={`${item.案例ID}-${index}`} onClick={() => setSelectedCase(item)}><div className="case-index">{String(index + 1).padStart(2, "0")}</div><div className="case-main"><strong>{field(item, "IP名称")} <span>×</span> {field(item, "品牌名称")}</strong><small>{field(item, "合作形式")}</small></div><time>{displayDate(field(item, "活动开始时间"))}</time><span className="arrow">↗</span></button>)}</section><section className="panel trend-panel"><div className="panel-head"><div><span className="section-kicker">SIGNALS</span><h3>行业趋势信号</h3></div><button className="text-btn" onClick={() => go("weekly")}>看周报 →</button></div>{trendAssets.slice(0, 4).map((item, index) => <div className="trend-item" key={item.趋势标题}><span className="trend-no">0{index + 1}</span><div><strong>{item.趋势标题}</strong><p>{item.趋势判断?.slice(0, 54)}…</p></div></div>)}</section></div>
 </>; }

function Cases({ cases, filteredCases, query, setQuery, caseDate, setCaseDate, setSelectedCase, handleImport }: { cases: CaseRow[]; filteredCases: CaseRow[]; query: string; setQuery: (s: string) => void; caseDate: string; setCaseDate: (s: string) => void; setSelectedCase: (c: CaseRow) => void; handleImport: (e: ChangeEvent<HTMLInputElement>) => void }) { return <><div className="toolbar"><div className="search-box"><span>⌕</span><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="搜索 IP 名称、品牌名称…" /></div><input className="date-input" type="date" value={caseDate} onChange={(e) => setCaseDate(e.target.value)} /><label className="outline-btn">↥ 导入 Excel<input type="file" accept=".xlsx,.xls" onChange={handleImport} /></label><span className="result-count">{filteredCases.length} / {cases.length} 条</span></div><div className="table-panel"><div className="table-head"><span>合作双方</span><span>合作时间</span><span>合作形式</span><span>商业亮点</span><span></span></div>{filteredCases.map((item, index) => <button className="table-row" key={`${item.案例ID}-${index}`} onClick={() => setSelectedCase(item)}><div><strong>{field(item, "联名双方", "case_name", "partners")}</strong><small>{field(item, "IP名称")} <i>×</i> {field(item, "品牌名称")}</small></div><span>{displayDate(field(item, "活动开始时间"))}</span><span>{field(item, "合作形式")}</span><span>{field(item, "合作亮点", "合作形式").slice(0, 34)}…</span><span className="row-arrow">↗</span></button>)}</div></>; }

function IPAnalysis({ ipQuery, setIpQuery, ipInfo, ipCases }: { ipQuery: string; setIpQuery: (s: string) => void; ipInfo?: CaseRow; ipCases: CaseRow[] }) { return <><div className="analysis-search"><div className="search-box large"><span>⌕</span><input value={ipQuery} onChange={(e) => setIpQuery(e.target.value)} placeholder="输入 IP 名称，例如：一人之下" /></div><div className="quick-tags">快速查看：{["一人之下", "凡人修仙传", "沧元图", "灵笼"].map((name) => <button key={name} onClick={() => setIpQuery(name)}>{name}</button>)}</div></div>{ipInfo ? <><div className="profile-card"><div className="profile-avatar">{ipInfo.IP名称?.slice(0, 1)}</div><div className="profile-copy"><span className="pill light">{field(ipInfo, "IP类型")}</span><h2>{ipInfo.IP名称}</h2><p>{field(ipInfo, "IP简介")}</p><div className="profile-meta"><span>所属公司 <b>{field(ipInfo, "所属公司")}</b></span><span>目标用户 <b>{field(ipInfo, "目标用户")}</b></span></div></div><div className="keyword-cloud">{field(ipInfo, "IP关键词").split(/[、，, ]/).filter(Boolean).slice(0, 6).map((x) => <span key={x}>#{x}</span>)}</div></div><div className="analysis-grid"><AnalysisBlock title="用户画像" text={field(ipInfo, "用户画像", "目标用户")} /><AnalysisBlock title="商业化优势" text={field(ipInfo, "商业化优势")} /><AnalysisBlock title="适合授权方向" text={field(ipInfo, "适合授权方向")} /><AnalysisBlock title="商业化建议" text={`建议围绕「${field(ipInfo, "核心题材")}」设计主题产品与体验场景，优先选择能够放大角色和世界观资产的合作方。`}/></div><section className="panel ip-cases"><div className="panel-head"><div><span className="section-kicker">CASE HISTORY</span><h3>历史合作案例 <small>{ipCases.length}</small></h3></div></div>{ipCases.length ? ipCases.map((item, index) => <div className="mini-case" key={`${item.案例ID}-${index}`}><span>{displayDate(field(item, "活动开始时间"))}</span><strong>{field(item, "品牌名称")}</strong><p>{field(item, "合作形式")} · {field(item, "活动玩法")}</p></div>) : <div className="empty">暂未沉淀历史案例，适合成为下一次合作机会。</div>}</section></> : <div className="empty large-empty">没有找到这个 IP。试试快速查看中的名称。</div>}</>; }
function BrandLibrary({ brands, cases, setSelectedCase }: { brands: CaseRow[]; cases: CaseRow[]; setSelectedCase: (c: CaseRow) => void }) { const [query, setQuery] = useState(""); const [selectedBrand, setSelectedBrand] = useState(""); const visibleBrands = brands.filter((brand) => `${field(brand, "品牌名称")} ${field(brand, "品牌行业")} ${field(brand, "品牌简介")}`.toLowerCase().includes(query.trim().toLowerCase())); const relatedCases = selectedBrand ? cases.filter((item) => item.品牌名称 === selectedBrand) : []; return <section className="panel library-panel"><div className="panel-head"><div><span className="section-kicker">BRAND LIBRARY</span><h3>品牌合辑 <small>{visibleBrands.length} / {brands.length}</small></h3></div></div><div className="brand-search search-box"><span>⌕</span><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="搜索品牌名称、行业…" /></div><div className="library-grid">{visibleBrands.map((brand, index) => { const name = field(brand, "品牌名称"); const related = cases.filter((item) => item.品牌名称 === name).length; return <button className={selectedBrand === name ? "library-card active" : "library-card"} type="button" key={`${name}-${index}`} onClick={() => setSelectedBrand(name)}><strong>{name}</strong><span>{field(brand, "品牌行业")}</span><p>{field(brand, "品牌简介")}</p><small>{related} 个联名案例</small></button>; })}</div>{selectedBrand && <div className="brand-case-results"><div className="panel-head"><div><span className="section-kicker">CASE RESULTS</span><h3>{selectedBrand} 联名案例 <small>{relatedCases.length}</small></h3></div></div>{relatedCases.length ? <div className="brand-case-grid">{relatedCases.map((item, index) => { const url = sourceUrl(item); return <article className="brand-case-card" key={`${item.案例ID}-${index}`}><button type="button" onClick={() => setSelectedCase(item)}><strong>{field(item, "案例", "联名双方", "case_name", "partners")}</strong><span>{displayDate(field(item, "活动开始时间"))} · {field(item, "合作形式")}</span><p>{field(item, "合作内容", "产品内容")}</p></button>{url && <a href={url} target="_blank" rel="noreferrer">查看官方来源 ↗</a>}</article>; })}</div> : <div className="empty">该品牌暂无联名案例。</div>}</div>}{!visibleBrands.length && <div className="empty">没有找到匹配品牌。</div>}</section>; }
function AnalysisBlock({ title, text }: { title: string; text: string }) { return <div className="analysis-block"><span>{title}</span><p>{text}</p></div>; }

function Weekly({ range, setRange, filters, setFilters, cases, weeklyCases, topWeekly, articles }: { range: { start: string; end: string }; setRange: (r: { start: string; end: string }) => void; filters: { industry: string; ip: string; brand: string }; setFilters: (f: { industry: string; ip: string; brand: string }) => void; cases: CaseRow[]; weeklyCases: CaseRow[]; topWeekly: CaseRow[]; articles: CaseRow[] }) { const industries = [...new Set(cases.map((item) => item.品牌行业).filter(Boolean))]; const ips = [...new Set(cases.map((item) => item.IP名称).filter(Boolean))]; const brands = [...new Set(cases.map((item) => item.品牌名称).filter(Boolean))]; const relatedArticles = articles.filter((article) => { const haystack = `${article.title} ${article.summary} ${article.keywords} ${article.cases}`.toLowerCase(); return weeklyCases.some((item) => haystack.includes(`${item.IP名称}`.toLowerCase()) || haystack.includes(`${item.品牌名称}`.toLowerCase())) || !weeklyCases.length; }).slice(0, 4); return <><div className="weekly-toolbar"><div><span className="section-kicker">REPORT BUILDER</span><p>选择时间、行业和合作对象，生成定向周报。</p></div><div className="range-fields"><input type="date" value={range.start} onChange={(e) => setRange({ ...range, start: e.target.value })}/><span>—</span><input type="date" value={range.end} onChange={(e) => setRange({ ...range, end: e.target.value })}/><button className="primary-btn" onClick={() => window.print()}>导出周报 ↗</button></div></div><div className="report-filters"><strong>筛选条件</strong><select value={filters.industry} onChange={(e) => setFilters({ ...filters, industry: e.target.value })}><option value="">全部行业</option>{industries.map((item) => <option key={item}>{item}</option>)}</select><select value={filters.ip} onChange={(e) => setFilters({ ...filters, ip: e.target.value })}><option value="">全部 IP</option>{ips.map((item) => <option key={item}>{item}</option>)}</select><select value={filters.brand} onChange={(e) => setFilters({ ...filters, brand: e.target.value })}><option value="">全部品牌</option>{brands.map((item) => <option key={item}>{item}</option>)}</select><span className="filter-count">已匹配 {weeklyCases.length} 条</span></div><div className="report-sheet"><div className="report-title"><span>IP RADAR / WEEKLY</span><h2>动漫 IP 商业化周报</h2><p>{range.start.replaceAll("-", ".")} — {range.end.replaceAll("-", ".")} · 共 {weeklyCases.length} 个新增案例</p></div><div className="report-section"><div className="report-section-title"><span>01</span><h3>本周案例汇总</h3></div><div className="report-cases">{weeklyCases.slice(0, 6).map((item, index) => { const url = sourceUrl(item); const card = <><b>{field(item, "IP名称")} × {field(item, "品牌名称")}</b><span>{field(item, "品牌行业")} · {field(item, "合作形式", "cooperation_type")}</span><time>{displayDate(field(item, "活动开始时间", "cooperation_date"))}</time></>; return url ? <a className="report-case report-case-link" href={url} target="_blank" rel="noreferrer" key={`${item.案例ID}-${index}`}>{card}</a> : <div className="report-case" key={`${item.案例ID}-${index}`}>{card}</div>; })}</div>{!weeklyCases.length && <div className="empty">这个筛选范围暂无案例，调整条件后重新生成。</div>}</div><div className="report-section"><div className="report-section-title"><span>02</span><h3>重点案例分析</h3></div><div className="focus-grid">{topWeekly.map((item, index) => { const url = sourceUrl(item); const title = <>{field(item, "IP名称")} × {field(item, "品牌名称")}</>; return <div className="focus-card" key={`${item.案例ID}-${index}`}><span className="focus-label">FOCUS 0{index + 1}</span><h4>{url ? <a href={url} target="_blank" rel="noreferrer">{title}</a> : title}</h4><p><b>合作开始时间：</b>{displayDate(field(item, "活动开始时间", "cooperation_date"))}</p><p><b>合作形式：</b>{field(item, "合作形式", "cooperation_type")}</p><p><b>合作内容：</b>{field(item, "产品内容", "合作内容", "cooperation_content")}</p></div>; })}</div></div><div className="report-columns"><div className="report-section"><div className="report-section-title"><span>03</span><h3>趋势分析</h3></div><ol className="trend-list">{trendAssets.slice(0, 4).map((item) => <li key={item.趋势标题}><strong>趋势标题：{item.趋势标题}</strong><p><b>案例依据：</b>{item.案例依据}</p><p><b>趋势判断：</b>{item.趋势判断}</p><p><b>对优酷动漫参考：</b>{item.可参考方向}</p></li>)}</ol></div><div className="report-section youku"><div className="report-section-title"><span>04</span><h3>行业观点与优酷动漫参考</h3></div>{relatedArticles.length ? relatedArticles.map((item) => <div className="youku-item" key={item.id || item.title}><strong>{item.title}</strong><p><b>行业观点：</b>{item.summary}</p><p><b>趋势判断：</b>{item.judgment || "结合相关案例观察，建议纳入后续招商与内容开发判断。"}</p>{item.url && <a href={item.url} target="_blank" rel="noreferrer">来源：{item.source || item.url} ↗</a>}</div>) : <div className="empty">暂无高相关行业文章，当前周报仅使用案例数据。</div>}{youkuAssets.slice(0, 3).map((item) => <div className="youku-item" key={item.IP名称}><strong>{item.IP名称}</strong><p>对优酷动漫参考：{item.适合授权方向}</p></div>)}</div></div></div></>; }

function Articles({ articles, onRefresh }: { articles: CaseRow[]; onRefresh: () => Promise<void> }) { const [draft, setDraft] = useState<CaseRow>({ title: "", source: "", publishedAt: "", url: "", category: "", summary: "", cases: "", keywords: "", judgment: "", referenceValue: "", body: "" }); const [editing, setEditing] = useState<string | null>(null); const save = async (event: FormEvent) => { event.preventDefault(); const payload = { ...draft, summary: draft.summary || draft.body.slice(0, 600), keywords: draft.keywords || tokens(draft.body).slice(0, 8).join("、"), judgment: draft.judgment || "结合文章观点与案例数据，观察其是否形成可复用的授权趋势。" }; await fetch("/api/articles", { method: editing ? "PATCH" : "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(editing ? { id: editing, ...payload } : payload) }); setDraft({ title: "", source: "", publishedAt: "", url: "", category: "", summary: "", cases: "", keywords: "", judgment: "", referenceValue: "", body: "" }); setEditing(null); await onRefresh(); }; const remove = async (id: string) => { if (!window.confirm("确认删除这篇行业文章？")) return; await fetch(`/api/articles?id=${encodeURIComponent(id)}`, { method: "DELETE" }); await onRefresh(); }; return <div className="content-grid"><form className="form-panel" onSubmit={save}><div className="form-intro"><span className="section-kicker">INDUSTRY INSIGHTS</span><h2>{editing ? "编辑行业文章" : "新增行业文章"}</h2><p>支持粘贴链接或正文；优先保存结构化摘要，不保存无必要的全文。</p></div><div className="form-grid">{[["title", "标题"], ["source", "来源"], ["publishedAt", "发布时间"], ["url", "原文链接"], ["category", "行业分类"], ["cases", "涉及案例"]].map(([key, label]) => <label key={key}>{label}<input value={draft[key] || ""} onChange={(e) => setDraft({ ...draft, [key]: e.target.value })} /></label>)}</div><div className="textarea-grid">{[["body", "粘贴文章正文/摘要"], ["summary", "核心观点"], ["keywords", "趋势关键词"], ["judgment", "趋势判断"], ["referenceValue", "对 IP 商业化/国漫授权的参考价值"]].map(([key, label]) => <label key={key}>{label}<textarea value={draft[key] || ""} onChange={(e) => setDraft({ ...draft, [key]: e.target.value })} /></label>)}</div><div className="form-footer"><button className="primary-btn" type="submit">保存文章</button></div></form><section className="panel"><div className="panel-head"><div><span className="section-kicker">ARTICLE LIBRARY</span><h3>已收录文章 <small>{articles.length}</small></h3></div></div>{articles.map((item) => <div className="trend-item" key={item.id}><div><strong>{item.title}</strong><p>{item.source || "未填写来源"} · {item.category || "未分类"}</p><p>{item.summary}</p><button className="text-btn" onClick={() => { setEditing(item.id); setDraft(item); }}>编辑</button> <button className="text-btn" onClick={() => remove(item.id)}>删除</button></div></div>)}{!articles.length && <div className="empty">还没有行业文章，可从右侧表单开始沉淀。</div>}</section></div>; }

function AddCase({ form, setForm, handleForm, handleImageUpload }: { form: CaseRow; setForm: (f: CaseRow) => void; handleForm: (e: FormEvent) => void; handleImageUpload: (e: ChangeEvent<HTMLInputElement>) => void }) { const fields = [["联名双方", "例如：某某咖啡×沧元图"], ["IP名称", "例如：沧元图"], ["品牌名称", "例如：某某咖啡"], ["品牌行业", "茶饮 / 餐饮 / 3C"], ["活动开始时间", "2026-08-09"], ["合作形式", "IP主题联名"], ["官方来源链接", "https://…"]]; return <form className="form-panel" onSubmit={handleForm}><div className="form-intro"><span className="section-kicker">CASE INTAKE</span><h2>记录一个新案例</h2><p>把公开信息沉淀为可检索、可复用的商业情报。</p></div><div className="form-grid">{fields.map(([key, placeholder]) => <label key={key}>{key}<input type={key === "活动开始时间" ? "date" : "text"} value={form[key] || ""} placeholder={placeholder} onChange={(e) => setForm({ ...form, [key]: e.target.value })} /></label>)}<label>图片URL（支持多张）<input type="text" value={form.图片URL || ""} placeholder="用换行或分号分隔多个 URL" onChange={(e) => setForm({ ...form, 图片URL: e.target.value })} /></label><label>图片上传（支持多选）<input type="file" accept="image/*" multiple onChange={handleImageUpload} /><small className="field-hint">图片会保存到云端</small></label></div><div className="textarea-grid">{[["IP简介", "介绍 IP 内容、题材与用户基础"], ["品牌简介", "介绍品牌定位、核心业务与消费人群"], ["产品内容", "记录联名产品、包装或核心售卖内容"], ["周边形式", "徽章、杯套、盲袋、手办等"], ["活动玩法", "购买赠礼、打卡、集章、主题店等"], ["合作亮点", "为什么这个合作值得关注？"]].map(([key, placeholder]) => <label key={key}>{key}<textarea value={form[key] || ""} placeholder={placeholder} onChange={(e) => setForm({ ...form, [key]: e.target.value, ...(key === "品牌简介" ? { brand_description: e.target.value } : {}) })} /></label>)}</div><div className="form-footer"><span>保存后会立即进入案例库和周报统计。</span><button className="primary-btn" type="submit">保存案例 <span>→</span></button></div></form>; }
function AdminPanel({ cases, trends, onRefresh }: { cases: CaseRow[]; trends: CaseRow[]; onRefresh: () => Promise<void> }) {
  const [selectedId, setSelectedId] = useState(cases[0]?.案例ID || "");
  const selected = cases.find((item) => item.案例ID === selectedId) || cases[0];
  const [draft, setDraft] = useState<CaseRow>(selected || blankForm);
  const emptyTrend = { 日期: new Date().toLocaleDateString("sv-SE"), 趋势标题: "", 案例依据: "", 趋势判断: "", 可参考方向: "" };
  const [trendDraft, setTrendDraft] = useState<CaseRow>(emptyTrend);
  const [editingTrend, setEditingTrend] = useState<string | null>(null);
  useEffect(() => { if (selected) setDraft(selected); }, [selectedId, cases.length]);

  const update = async (event: FormEvent) => {
    event.preventDefault();
    await fetch(`/api/cases/${encodeURIComponent(selected.案例ID)}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(draft) });
    await onRefresh();
  };
  const upload = async (event: ChangeEvent<HTMLInputElement>) => {
    for (const file of Array.from(event.target.files || [])) {
      const payload = new FormData(); payload.append("file", file);
      await fetch(`/api/cases/${encodeURIComponent(selected.案例ID)}/images`, { method: "POST", body: payload });
    }
    await onRefresh();
  };
  const remove = async () => {
    if (!selected || !window.confirm("确认删除该案例？")) return;
    await fetch(`/api/cases/${encodeURIComponent(selected.案例ID)}`, { method: "DELETE" });
    await onRefresh(); setSelectedId("");
  };
  const saveTrend = async (event: FormEvent) => {
    event.preventDefault();
    await fetch("/api/trends", { method: editingTrend ? "PATCH" : "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(editingTrend ? { id: editingTrend, ...trendDraft } : trendDraft) });
    setTrendDraft(emptyTrend); setEditingTrend(null); await onRefresh();
  };
  const removeTrend = async (id: string) => {
    if (!window.confirm("确认删除这条趋势分析？")) return;
    await fetch(`/api/trends?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    await onRefresh();
  };

  return <div className="admin-stack">
    {selected ? <div className="admin-layout"><aside className="admin-list panel"><div className="panel-head"><div><span className="section-kicker">CONTENT ADMIN</span><h3>案例管理</h3></div><span className="result-count">{cases.length} 条</span></div><input className="admin-search" placeholder="筛选案例名称" onChange={(e) => { const keyword = e.target.value.toLowerCase(); const candidate = cases.find((item) => `${item.联名双方} ${item.IP名称} ${item.品牌名称}`.toLowerCase().includes(keyword)); if (candidate) setSelectedId(candidate.案例ID); }} />{cases.slice(0, 30).map((item) => <button className={item.案例ID === selected.案例ID ? "admin-case active" : "admin-case"} key={item.案例ID} onClick={() => setSelectedId(item.案例ID)}><strong>{field(item, "联名双方")}</strong><small>{displayDate(item.活动开始时间)} · {item.品牌行业}</small></button>)}</aside><form className="form-panel admin-editor" onSubmit={update}><div className="form-intro"><span className="section-kicker">EDIT RECORD</span><h2>编辑案例</h2><p>修改会直接保存到线上数据库；删除操作不可恢复。</p></div><div className="form-grid">{[["联名双方", "联名双方"], ["IP名称", "IP名称"], ["品牌名称", "品牌名称"], ["品牌行业", "品牌行业"], ["活动开始时间", "活动开始时间"], ["合作形式", "合作形式"], ["标签", "标签"], ["官方来源链接", "官方来源链接"]].map(([label, key]) => <label key={key}>{label}<input value={draft[key] || ""} onChange={(e) => setDraft({ ...draft, [key]: e.target.value })} /></label>)}<label>上传图片（R2 云端）<input type="file" accept="image/*" multiple onChange={upload} /></label></div><div className="textarea-grid">{[["IP简介", "IP简介"], ["品牌简介", "品牌简介"], ["产品内容", "产品内容"], ["周边形式", "周边形式"], ["活动玩法", "活动玩法"], ["线下活动", "线下活动"], ["合作亮点", "合作亮点"]].map(([label, key]) => <label key={key}>{label}<textarea value={draft[key] || ""} onChange={(e) => setDraft({ ...draft, [key]: e.target.value, ...(key === "品牌简介" ? { brand_description: e.target.value } : {}) })} /></label>)}</div><div className="form-footer"><button className="danger-btn" type="button" onClick={remove}>删除案例</button><button className="primary-btn" type="submit">保存修改</button></div></form></div> : <div className="empty large-empty">暂无案例，请先新增或导入 Excel。</div>}
    <div className="content-grid trend-admin"><form className="form-panel" onSubmit={saveTrend}><div className="form-intro"><span className="section-kicker">WEEKLY TREND</span><h2>{editingTrend ? "编辑本周趋势" : "上传本周趋势分析"}</h2><p>每周新增或更新趋势，保存后会进入总览和行业周报。</p></div><div className="form-grid"><label>日期<input type="date" value={trendDraft.日期 || ""} onChange={(e) => setTrendDraft({ ...trendDraft, 日期: e.target.value })} /></label><label>趋势标题<input value={trendDraft.趋势标题 || ""} onChange={(e) => setTrendDraft({ ...trendDraft, 趋势标题: e.target.value })} /></label></div><div className="textarea-grid">{[["案例依据", "引用本周相关案例"], ["趋势判断", "总结趋势及其依据"], ["可参考方向", "对优酷动漫的可执行建议"]].map(([key, placeholder]) => <label key={key}>{key}<textarea value={trendDraft[key] || ""} placeholder={placeholder} onChange={(e) => setTrendDraft({ ...trendDraft, [key]: e.target.value })} /></label>)}</div><div className="form-footer">{editingTrend && <button className="outline-btn" type="button" onClick={() => { setEditingTrend(null); setTrendDraft(emptyTrend); }}>取消编辑</button>}<button className="primary-btn" type="submit">保存趋势</button></div></form><section className="panel"><div className="panel-head"><div><span className="section-kicker">TREND LIBRARY</span><h3>趋势记录 <small>{trends.length}</small></h3></div></div>{trends.map((item) => <div className="trend-item" key={item.id || item.趋势标题}><div><strong>{item.趋势标题}</strong><p>{displayDate(item.日期)} · {item.趋势判断}</p><button className="text-btn" onClick={() => { setEditingTrend(item.id); setTrendDraft(item); }}>编辑</button> <button className="text-btn" onClick={() => removeTrend(item.id)}>删除</button></div></div>)}{!trends.length && <div className="empty">暂无趋势分析，可从左侧表单上传本周内容。</div>}</section></div>
  </div>;
}
function CaseModal({ item, cases, close, onDelete }: { item: CaseRow; cases: CaseRow[]; close: () => void; onDelete: () => Promise<void> }) { const [activeImage, setActiveImage] = useState(0); const images = getImages(item); const recommendations = similarCases(item, cases); const details = [["案例", "案例", "联名双方", "case_name", "partners"], ["IP简介", "IP简介", "ip_description"], ["品牌简介", "品牌简介", "brand_description"], ["IP授权方", "IP授权方", "ip_licensor"], ["活动开始时间", "活动开始时间", "cooperation_date"], ["合作形式", "合作形式", "cooperation_type"], ["合作内容", "合作内容", "产品内容", "cooperation_content"], ["周边产品", "周边产品", "周边形式", "merchandising"], ["线下活动", "线下活动", "offline_activity"]]; const officialUrl = sourceUrl(item); return <div className="modal-backdrop" onClick={close}><article className="modal" onClick={(e) => e.stopPropagation()}><button className="modal-close" onClick={close}>×</button><div className="case-title-row"><h2>{field(item, "案例", "联名双方", "case_name", "partners")}</h2>{officialUrl && <a className="source-link" href={officialUrl} target="_blank" rel="noreferrer">查看官方来源 ↗</a>}</div><div className="detail-grid intro-grid">{details.map(([label, ...keys]) => <div key={label}><span>{label}</span><p>{label === "活动开始时间" ? displayDate(field(item, ...keys)) : field(item, ...keys)}</p></div>)}</div><div className="modal-section"><span className="modal-section-title">联名活动图片</span>{images.length ? <div className="gallery"><div className="gallery-main"><img src={images[activeImage]} alt={`${field(item, "案例", "联名双方")} 联名素材`} onError={(e) => { e.currentTarget.style.display = "none"; }} /></div><div className="gallery-thumbs">{images.map((image, index) => <button className={activeImage === index ? "gallery-thumb active" : "gallery-thumb"} key={image} onClick={() => setActiveImage(index)}><img src={image} alt={`素材 ${index + 1}`} onError={(e) => { e.currentTarget.style.display = "none"; }} /></button>)}</div></div> : <div className="gallery-empty">暂无可展示图片，可在新增案例中添加图片 URL 或上传素材。</div>}</div>{recommendations.length > 0 && <div className="modal-section recommendations"><span className="modal-section-title">相似案例推荐</span>{recommendations.map(({ candidate, reasons }, index) => <div className="recommend-card" key={`${candidate.案例ID}-${index}`}><div><strong>{field(candidate, "案例", "联名双方", "case_name")}</strong><p>匹配原因：{reasons.slice(0, 2).join("；")}</p><small>合作亮点：{field(candidate, "合作亮点", "产品内容").slice(0, 80)}</small></div><span>↗</span></div>)}</div>}<div className="case-modal-actions"><button className="danger-btn" type="button" onClick={onDelete}>删除案例</button></div></article></div>; }
