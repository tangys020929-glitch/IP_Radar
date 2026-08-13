# IP Radar · 动漫 IP 商业情报数据库

这是一个基于 vinext + Cloudflare D1 + R2 的 IP 联名商业情报工具。

## 当前结构

- `app/page.tsx`：搜索、IP 分析、周报、案例新增和后台编辑界面
- `app/api/bootstrap`：读取案例与资产库数据
- `app/api/cases`：案例查询、新增、修改、删除
- `app/api/cases/[id]/images`：图片上传
- `app/api/images/[...key]`：从 R2 读取图片
- `app/api/case-images/[id]`：删除图片元数据与 R2 对象
- `db/schema.ts`：D1 表结构
- `drizzle/0001_ip_radar.sql`：Excel 初始数据迁移和索引
- `.openai/hosting.json`：D1 / R2 逻辑绑定

## 数据设计

- `cases`：联名案例主表，支持新增字段通过 `extra_json` 扩展
- `case_images`：案例图片元数据；图片文件存放在 R2
- `library_items`：IP 资产、品牌资产、优酷 IP、玩法标签和趋势观察库

新增、修改、删除数据都通过 API 操作，不再依赖代码内置数据或浏览器 localStorage。

## 本地检查

```bash
pnpm install
pnpm run build
```

本机 macOS 13.3 可能无法运行 Cloudflare 本地开发服务器，但不影响生产部署。线上数据绑定由 Sites 根据 `.openai/hosting.json` 注入。

## 线上部署

1. 确认 `.openai/hosting.json` 中包含：

```json
{
  "project_id": "…",
  "d1": "DB",
  "r2": "IMAGES"
}
```

2. 构建并保存版本。
3. Sites 应用迁移文件 `drizzle/0001_ip_radar.sql`。
4. 发布后通过“后台管理”维护案例，通过案例详情维护图片。

生产环境不需要额外应用环境变量；D1 和 R2 使用 Sites 绑定管理，不把密钥写入代码或 `.env`。
