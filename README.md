<!--
	README for CCF DDL
	- include project overview
	- installation & run steps
	- screenshot gallery
	- release & docs links
	- dev conventions / troubleshooting pointers
-->

# CCF DDL

<img src="src/static/logo.png" alt="logo" width="30" />

多端会议日程浏览器（基于 Vue 3 + uni-app + TypeScript + Pinia）
最新发布与说明见：`md/RELEASE.md`，常见错误与修复请查阅：`md/错误记录.md`。

---

## ✨ 项目简介

该仓库是一个轻量的会议日程浏览小程序/移动/网页应用示例：

- 支持 H5、APP（APP-PLUS）、小程序等多端运行
- 多维筛选会议（按日期、城市、类型、受邀情况等）
- 详情页支持导出/加入系统日历（.ics / 原生接口）
- 离线优先缓存策略、静态 acceptance-rate 索引作为后备

---

## 🎯 主要功能

- 浏览会议列表与详情
- 添加会议到系统日历（Android/iOS）
- 按筛选条件检索会议
- 离线缓存与数据健壮性（避免缓存被空数组覆盖）
- TypeScript 严格模式 + Pinia 状态管理
- 日志统一封装，构建时去除 console 输出

---

## 📸 截图示例

项目仓库包含一组屏幕截图（路径：`/screenshots`），示例：

<!-- 屏幕截图网格 -->
<div>
	<img src="screenshots/1.jpg" alt="会议列表" width="220px" style="margin:6px;" />
	<img src="screenshots/2.jpg" alt="筛选界面" width="220px" style="margin:6px;" />
	<img src="screenshots/3.jpg" alt="详情页-上部" width="220px" style="margin:6px;" />
	<img src="screenshots/4.jpg" alt="详情页-下部" width="220px" style="margin:6px;" />
	<img src="screenshots/5.jpg" alt="加入日历成功" width="220px" style="margin:6px;" />
	<img src="screenshots/6.jpg" alt="我的收藏/日程" width="220px" style="margin:6px;" />
	<img src="screenshots/7.jpg" alt="搜索及筛选项" width="220px" style="margin:6px;" />
	<img src="screenshots/8.jpg" alt="关于页面" width="220px" style="margin:6px;" />
	<img src="screenshots/9.jpg" alt="更多设置" width="220px" style="margin:6px;" />
</div>

> 想在 README 以原生 Markdown 显示（GitHub），图片引用路径保持 `screenshots/1.jpg` 等即可。

---

## 🛠 安装与本地运行

建议使用 Node v18+（或 22），npm 9+。

1. 安装依赖：

```powershell
npm install
```

2. 开发模式（H5 / App 模式由 uni-app 提供选项）：

```powershell
npm run dev
```

3. 构建生产包：

```powershell
npm run build
```

4. 代码风格 & 类型检查：

```powershell
npm run lint
npx tsc --noEmit
```

---

## 🧰 技术栈

- Vue 3（SFC）
- TypeScript
- Pinia（状态管理）
- uni-app（跨端框架）
- Vite（构建工具）
- ESLint + @typescript-eslint

---

## 🧭 开发与贡献规范

- 使用 `logger`（`src/utils/logger.ts`）代替 `console.*`，构建时去除控制台输出
- 遵循 TypeScript 严格模式：尽量避免 `any`，优先 `unknown` + 类型守卫
- `saveToCache` 现在返回 `boolean` 表示写入是否成功，调用方应检查

---

## 📚 文档与资源

- 错误/修复记录：`md/错误记录.md`
- 发布说明：`md/RELEASE.md`
- 技术总结：`md/技术总结.md`
- 开发文档：`md/开发文档.md`

---

## 🔒 许可与贡献

开源许可（请在仓库添加 LICENSE，默认：MIT）。

贡献：欢迎 PR、Issue、以及更多改进建议。请确保在 PR 中包含变更说明与必要的类型检查/测试。

---

## ✉️ 联系方式

如需更多信息，请通过电子邮件联系我们： [1847539781@qq.com](mailto:1847539781@qq.com)

---

如果你希望我把 README 中的图片展示方式改为 GitHub native Markdown（`![Alt](screenshots/1.jpg)`），或添加带证书的运行演示（GIF），告诉我你偏好的展示方式，我会继续调整并把 README 更新到你指定风格。

# CCF DDL

这是一个基于 Vue 3 + Uni-app 的多端会议日程应用示例仓库。

## 目录结构

- src/: 源代码目录
- md/: 项目文档与错误记录
- static/: 静态资源
- package.json: 项目脚本与依赖

## 本地运行

安装依赖

```powershell
npm install
```

开发模式运行（H5 或 App 模式请参考 uni-app 文档）

## 本地运行

npm run dev

```

构建生产包
建议环境

- Node.js: 18.x 或 20.x（建议使用 Node 22 进行本地开发）
- npm 或 pnpm：推荐使用 npm 9 或 pnpm 8+
- TypeScript: 遵循仓库内配置；如果遇到 ESLint parser 警告，请参考 `md/错误记录.md` 中的说明

常用脚本

- npm run dev: 启动开发服务器
- npm run build: 构建生产包
- npm run lint: 运行 ESLint（包括 TypeScript 检查）
- npx tsc --noEmit: 仅执行 TypeScript 类型检查

代码约定

- 避免在 `src/` 内直接调用 `console.*`，请使用 `src/utils/logger.ts`。
- 尽量避免 `any`，优先使用 `unknown` 并添加类型保护。
- 生产构建中自动移除 `console.*`（请查看 `vite.config.ts` 中的配置）。

```

# CCF-DDL
