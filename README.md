<!--
	CCF DDL 的 README
	- 包括项目概述
	- 安装与运行步骤
	- 截图画廊
	- 发布版本与文档链接
	- 开发约定 / 排错提示
-->

# CCF DDL <img src="src/static/logo.png" alt="logo" width="30" />

多端 CCF 会议截稿日程平台（基于 Vue 3 + uni-app + TypeScript + Pinia）
最新发布与 APK 见：release

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

以下为示例截图（GitHub 推荐使用 Markdown 图像语法）:

| ![会议列表](./screenshots/1.jpg)     | ![筛选界面](./screenshots/2.jpg)     | ![详情页-上部](./screenshots/3.jpg)   |
| ------------------------------------ | ------------------------------------ | ------------------------------------- |
| ![详情页-下部](./screenshots/4.jpg)  | ![加入日历成功](./screenshots/5.jpg) | ![我的收藏/日程](./screenshots/6.jpg) |
| ![搜索及筛选项](./screenshots/7.jpg) | ![关于页面](./screenshots/8.jpg)     | ![更多设置](./screenshots/9.jpg)      |

> 若想在 README 中引用本地图片，请使用相对路径（从 README 所在目录起）例如：`![屏幕截图](./screenshots/1.jpg)`。

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

## ✉️ 联系方式

如需更多信息，请通过电子邮件联系我们： [1847539781@qq.com](mailto:1847539781@qq.com)

# CCF DDL <img src="src/static/logo.png" alt="logo" width="30" />
