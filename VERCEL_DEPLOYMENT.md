# Vercel 部署说明

本分支用于 Vercel 部署。`main` 分支和现有 chatgpt.site 版本继续保留 Cloudflare Worker、D1 和 R2 配置。

## 架构

- Vercel：Next.js 页面和同源 API 入口
- Cloudflare：现有 D1 数据库和 R2 图片存储
- Vercel `proxy.ts`：把 `/api/*` 转发到现有 Cloudflare 后端

当前方案不迁移数据库，也不迁移图片。没有图片的案例会显示空状态，后续可从后台上传并自动关联案例。

## Vercel 配置

1. 从 GitHub 导入项目，并选择 `vercel-deploy` 分支。
2. Framework Preset 选择 `Next.js`。
3. Build Command 使用 `pnpm run build:vercel`（`vercel.json` 已配置）。
4. Node.js 选择 22.x。
5. 添加生产环境变量：

   - `CLOUDFLARE_BACKEND_ORIGIN=https://ip-radar-mvp.tangys020929.chatgpt.site`

6. 首次部署后依次检查首页、案例搜索、详情、周报、文章库和后台。
7. 使用测试案例验证新增、编辑、删除、Excel 导入和图片上传；确认成功后再绑定正式域名。

## 阿里云域名

1. 在 Vercel 项目中添加根域名和 `www` 子域名。
2. 以 Vercel 域名页面给出的记录为准，在阿里云 DNS 添加记录：

   - 根域名 `@`：通常为 A 记录；填写 Vercel 显示的目标值。
   - `www`：通常为 CNAME；填写 Vercel 显示的目标值。
   - 如 Vercel 要求验证所有权，再添加它给出的 TXT 记录。

域名绑定不需要修改代码。DNS 生效后，Vercel 会自动签发 HTTPS 证书。

## 重要限制

Vercel 没有中国大陆境内基础设施。阿里云购买的域名可以绑定 Vercel，但不能保证中国大陆访问速度或可用性。如果大陆稳定访问是硬性要求，应改用中国大陆云服务并完成 ICP 备案。

当前公开站点的新增、编辑、删除和上传接口不再要求后台密码。若未来需要恢复数据保护，应增加正式的登录鉴权，而不是重新使用简单共享密码。
