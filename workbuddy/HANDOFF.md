# 弦库 · 吉他谱管理台 —— 交接文档（HANDOFF）

## 0. 一句话定位
个人私有吉他谱工作台（单文件 PWA）。曲库 **157 首**、**91 位歌手**（真实头像照片）；支持曲库浏览/搜索/筛选、谱面查看与缩放、练习记录、收藏、"新学 / 已学会"分类。无登录、仅个人访问、保密不外传。

---

## 1. 仓库 / 分支 / 提交 / 网址 / 部署（如实说明）

- **GitHub 仓库**：`bronson-chan/xian-library-guitar`（公开）
- **默认分支**：`main`
- **最近提交（来自远程，非本工作区）**：`5827d4092f4adb1cbfa2025ea3e1ba6031239754`（2026-10-05，"Publish: 3693303 Allow publisher to run with managed workspace ownership"）；更早：`e90ba4f`、`f8b447d`、`dde6d36`、`9375626`。
- **正式网址**：`https://bronson-chan.github.io/xian-library-guitar/`
- **部署方式（仓库自带）**：推送到 `main`（或手动 `workflow_dispatch`）→ 仓库根 `.github/workflows/deploy-pages.yml` → GitHub Pages。仓库 Settings → Pages → Source 须设为 **GitHub Actions**。仓库自带构建：`npm run build`（`node scripts/build-pages.mjs`，需 Node 22）。
- **本工作区是否动过线上**：**没有**。本工作区从未连接该 git 仓库（本地无 `.git`），也未向 GitHub Pages 推送。期间仅在 WorkBuddy 私有预览托管（`guitar-tabs-72292.app.workbuddy.host`）做过预览发布，与正式网址是两套独立地址。

### ⚠️ 重要：本工作区与线上正式版【不是同一套代码】
本交接包打包的是 **WorkBuddy 单文件版**（此工作区一直在维护的版本），而 GitHub Pages 正式站是 **另一套独立架构**。对比：

| 维度 | 本交接包（单文件版） | 线上正式版（仓库 `main`） |
|---|---|---|
| 代码结构 | 单文件 `site/index.html`（CSS/JS 全内联） | 多文件 `index.html` + `app.js` + `app.css` |
| 数据来源 | `source/meta.json` + `source/img_report.json`，Python `build.py` 注入 | `catalog/scores.json` + `catalog/pages/`、`catalog/media/` |
| 浏览器存储 | `localStorage`（key `wb_xiangu_v1`） | **IndexedDB** |
| 构建工具 | Python 3 标准库（`build.py`） | Node 22（`npm run build`） |
| 资源打包 | 直接 `site/assets/`（普通文件） | `packed/site-assets.tar.part-*`（分片还原） |
| PWA | 本包新增 `manifest.webmanifest` + `sw.js` | 仓库已有 `manifest.webmanifest` + `sw.js` |
| 资源路径 | 相对路径，已处理 | 曾修过 "Fix GitHub Pages resource paths" |

**结论**：本包是"你目前维护的最新版（单文件）"，但**并未直接同步到线上正式版**。要让正式网址与本包一致，Codex 二选一：
- **(a)** 用本包整体替换仓库内容（单文件架构），Pages 源指向 `site/`；或
- **(b)** 把本包的新增内容（《你要的爱》、新学分类、谱图清晰度修复）移植回仓库的多文件架构。

本包已附带一份**适配单文件版的** `.github/workflows/deploy-pages.yml`（见第 11 节），可直接把 `site/` 部署到任意 GitHub Pages。

---

## 2. 项目目录（本包）

```
弦库吉他谱工作台-handoff/
├─ site/                # 可部署成品（直接丢到任意静态托管 / GitHub Pages 根）
│  ├─ index.html        # 构建产物（已注入 157 首数据 + PWA 注册）
│  ├─ manifest.webmanifest / sw.js / icon-192.png / icon-512.png
│  ├─ assets/
│  │  ├─ tabs/          # 157 张高清谱图（原图直落或 2x 超分）
│  │  ├─ covers/        # 157 张程序化生成方形封面
│  │  ├─ avatars/       # 91 张歌手真实头像照片（240×240）
│  │  ├─ hero.jpg       # 首页背景（纯照片，文字由 CSS 重绘）
│  │  └─ ui/            # 首页演示用卡片 / 场景小图（8 张）
│  ├─ 使用说明.md / 曲谱数据总表.csv / 未识别与需确认清单.md
├─ source/              # 可编辑源码 / 构建链（开发与曲库更新用）
│  ├─ app_template.html # 单文件模板（含 __SONGS_JSON__ / __AVATAR_MAP__ 占位符）
│  ├─ build.py          # 注入数据 → site/index.html（路径已改为相对，便携）
│  ├─ meta.json         # 曲库元数据（157 首）+ 字段说明
│  ├─ img_report.json   # 歌手→头像路径映射（avatar_map）
│  ├─ gencovers.py      # 程序化封面生成（需 Pillow）
│  ├─ _add_song_assets.py / _add_song_meta.py / _gencover_new.py  # 加歌标准动作脚本
│  ├─ _runtest.py / _diag.py / _test_snippet.html   # 回归测试
│  └─ requirements.txt
├─ preview/             # 预览图（127 张界面截图，仅供视觉参考，非运行必需）
├─ .github/workflows/deploy-pages.yml   # GitHub Pages 部署（单文件版）
├─ env.example / .gitignore
├─ README.md / HANDOFF.md（本文件）/ INVENTORY.md
```

---

## 3. 启动与构建

### 仅看效果（无需构建）
浏览器打开 `site/index.html` 即可（谱面为同目录相对路径资源）。`file://` 下 Service Worker 不生效（需 https/localhost），功能本身不受影响。

### 本地起静态服务（推荐，PWA/SW 才会生效）
```
cd site
python -m http.server 8080
# 打开 http://localhost:8080
```

### 改了曲库数据后重新构建
```
python source/build.py     # 读 source/meta.json → 写 site/index.html
```
`build.py` 路径全部基于自身文件位置，解压到任意目录都能跑；输出优先写 `site/`，否则写回 `弦库-吉他谱管理台/`。

### 依赖
- 核心构建（`build.py`）只需 **Python 3.8+ 标准库**。
- 重新生成封面（`gencovers.py`）需要 `Pillow`。
- 谱图图像处理（`_gencover_new.py` / 清晰度修复）需要 `opencv-python` + `numpy`。
- **全程无 Node 依赖**（与仓库自带多文件版不同）。

---

## 4. 主要功能与关键文件

- **单文件应用**：`site/index.html`（全部 CSS/JS 内联）。模板 `source/app_template.html`。
- **数据注入**：`build.py` 把 `meta.json`（歌曲）与 `img_report.json`（头像映射）注入模板占位符 `__SONGS_JSON__` / `__AVATAR_MAP__`，并注入 `UNKNOWN` 清单。
- **曲库**：157 首，按歌手曲目数降序；侧栏按艺术家分组；搜索 + 筛选（歌手/曲风/语言/难度/状态）。
- **详情页（练琴页）**：谱面查看、缩放、收藏、封面/头像可换、新学/已学会标记。
- **"新学"分类**：`seedNewLearn()` 在载入时把 `meta.json` 中带 `nl:1` 的新歌自动归入"新学"（状态 `learning`）；已学会（`known`）永不被回填。详情页"我学会了"按钮一点移出、再点撤回，与状态下拉双向同步。
- **练习 / 收藏 / 熟练度**：全部存浏览器 `localStorage`。

### 你点名要说明的 4 个实现点
1. **曲谱加载**：`openDetail(i)` 直接 `el('dt-img').src = 'assets/tabs/'+i+'.jpg'`（静态相对路径 `<img>`），`onload` 后 `applyZoom()`。**无 JS 预加载器**。
2. **预加载与缓存**：仅依赖浏览器对静态资源的 HTTP 缓存；**没有** JS 级预加载、没有 `<link rel=preload>`。本包新增的 `sw.js` 提供运行时缓存（导航 network-first、静态资源 cache-first），但仍不主动预取下一张谱。
3. **Ctrl / ⌘ + 鼠标滚轮缩放**：**已实现**。`dt-canvas` 的 `wheel` 监听器：`if (!e.ctrlKey && !e.metaKey) return;` 否则 `e.preventDefault()` + `stepZoom(±1)`。普通滚轮只滚动页面。另支持滑块、点百分比输入任意比例、键盘 `+/-`、方向键切上一首/下一首。
4. **练琴页工具栏显隐**：**当前未实现**显隐开关——详情页工具栏（`dt-bar`：返回 / 缩放 / 收藏 / 我学会了）常驻可见，没有"隐藏工具栏进入专注练琴"的按钮。仅在移动端把缩放条折到单独一行（响应式重排）。这是一个**可改进项**（见第 8 节）。

---

## 5. 数据存储方式（浏览器本地）

- 主键：`localStorage['wb_xiangu_v1']`，结构：
  `{ fav:{}, status:{}, plays:{}, last:{}, logs:[], seen:{}, covers:{}, avatars:{} }`
  - `status[i]`：`'new'`(未开始) / `'learning'`(新学) / `'known'`(已学会)
  - `fav[i]`：收藏；`plays[i]`：练习次数；`last[i]`：上次练习时间戳；`logs[]`：练习记录
  - `covers[i]` / `avatars[i]`：用户自定义封面 / 头像（base64 dataURL，覆盖默认）
- 另存 `localStorage['wb_xiangu_v1_greeted']='1'`（首次提示）。
- **注意**：这些数据只在本机浏览器，不与任何服务器同步，也不会随"源码打包"而备份。详见第 7 节。

---

## 6. 曲库更新方式（加歌标准动作）

1. 谱面大图 → `site/assets/tabs/{i}.jpg`（**原图直落、不重编码**；若是像《你要的爱》那样的三页横排低清图，建议先做 2x 超分并按页纵向切开，见第 8 节）。
2. 封面 → `site/assets/covers/{i}.jpg`（跑 `source/_gencover_new.py` 复用 `gencovers` 同画风算法）。新歌手还需 `site/assets/avatars/{i}.jpg` **240×240 真照片** + 写进 `source/img_report.json` 的 `avatar_map`。
3. `source/meta.json` 追加一首 `{i,f,t,a,g,c,k,ok,capo,ts,d,nl:1}`——**`nl:1` 是"新学"自动归类的唯一开关，加歌必须带**。
4. 同步：`曲谱数据总表.csv` 加一行、`使用说明.md` 的数量文案、`build.py` 的 `assert len(songs) >= 156`。
5. 运行 `python source/build.py` 重建 → 发布。
- 参考脚本：`_add_song_assets.py` 落盘谱面+抓头像；`_add_song_meta.py` 写 meta + 头像映射；`_gencover_new.py` 生成封面。这些脚本里有**硬编码本地路径**，换机需改。

---

## 7. 浏览器本地数据：导出 / 恢复（重要，源码打包 ≠ 已备份）

应用内自带导入导出：
- **导出**：功能页 → "导出 JSON 备份" → 下载 `弦库备份-{日期}.json`（含收藏、新学/已学会、练习次数、练习记录、自定义封面/头像）。
- **恢复**：功能页 → "导入 JSON 备份" → 选文件 → 合并（同 key 取较新/较大值，不覆盖新设备上已有记录）。
- **兜底**：浏览器 DevTools → Application → Local Storage → 键 `wb_xiangu_v1` 直接复制/粘贴；整站 Clear 会清掉本机记录。
- 若未来切到仓库的 IndexedDB 架构，导出/恢复机制不同（仓库 README 有说明），需另行适配。

---

## 8. 已知问题 / 未完成事项

1. **《你要的爱》谱图仍是短板**（详见下节 + INVENTORY）：原图 1920×972 三页横排（每页≈576px），低于曲库主流的 2800 宽（每页≈848px）；2x 超分只是"插值放大"，非真高清。若有原版 PDF/更大源图，替换 `assets/tabs/156.jpg` 才是质变。
2. **练琴页工具栏无显隐开关**（见第 4 节第 4 点）。
3. **无 JS 预加载 / preload**（见第 4 节第 2 点）；首屏一次性注入全部 157 首 JSON（约 35KB）可接受，但未来上千首需考虑分页/懒加载。
4. **单文件版与仓库多文件版架构分裂**（见第 1 节），需 Codex 决定合并方向。
5. 部分元数据（曲风/语言/难度/少数调式）非谱面原文、属推断值，集中在 `未识别与需确认清单.md` 与 `build.py` 的 `unknown` 列表。

### 《你要的爱》问题点归纳（用户点名）
- **源图分辨率低**：1920×972 三联横排，单页仅 ~576px；曲库其它歌多为 2800×1366（单页 ~848px），密度差约 1.47×。
- **曾被误处理成灰度图**（mode L）：已修复为彩色（mode RGB），属质量缺陷，已在交接前更正。
- **当前成品** `assets/tabs/156.jpg`：1312×5984、彩色、约 1.05MB（三页纵向排列 + 2x 超分）。优点：每页能占满屏宽、不必再拖到 250%+；缺点：**像素仍为插值放大，非真高清**，极端放大下细线/歌词仍偏软。
- **建议**：用 ≥2800px 宽的原谱（或 PDF）替换即可一步到位；替换后无需改代码（按 `{i}.jpg` 路径加载）。

---

## 9. 最近修改记录（本工作区维护期间）

- 加入《你要的爱》（戴佩妮）为第 157 首，带 `nl:1`（新学）。
- 建立"新学"分类：文案"最近在学→新学""我会了→已学会"；`seedNewLearn()` 自动归类；详情页"我学会了"按钮（可撤回）。
- 修复《你要的爱》谱面清晰度（三页纵排 + 2x 超分，并修正灰度缺陷）。
- 新增 PWA 配置（manifest / sw.js / 图标）+ GitHub Actions 工作流（本包内，尚未部署到线上）。
- 回归：无头 Chrome **159P / 0F**。详情页"我学会了"按钮实测：未学会 113×38、已学会 98×38，点击切换 `learning↔known`。

---

## 10. 本地最新版 vs 线上正式版 差异清单

- **本地最新版（本包）**：单文件版，157 首，含《你要的爱》+ 新学 + 清晰度修复 + 新增 PWA 配置（manifest/sw.js/图标 + head 链接 + SW 注册）。
- **线上正式版（GitHub Pages `main`）**：多文件版，最近提交 2026-10-05，自带 PWA + IndexedDB，**不含**本包的《你要的爱》/ 新学 / 清晰度修复（因非同一代码）。
- 差异项：
  1. 架构不同（单文件 vs 多文件）。
  2. 存储不同（localStorage vs IndexedDB）。
  3. 曲库内容：本包 157 首且含《你要的爱》；线上版曲库以仓库 `catalog/scores.json` 为准（本次未拉取，数量待 Codex 核对）。
  4. 本包新增的 PWA/SW/工作流仅在单文件版内，线上版用其自己的。
- **本次没有改动线上正式版**（也未部署到 GitHub Pages）；仅在此工作区做了本地修改并打成本包。Codex 上线前请按第 1 节决策合并方向。

---

## 11. 部署步骤（把本包的单文件版上线到 GitHub Pages）

1. 在 GitHub 新建/复用仓库（推荐 `xian-library-guitar`），`git clone` 到本地。
2. 把本包 `site/`、`source/`、`.github/` 三样拷进仓库根，提交并 push 到 `main`。
3. 仓库 Settings → Pages → Source 选 **GitHub Actions**。
4. push 触发 `.github/workflows/deploy-pages.yml`：Python 重建 `site/index.html` → 上传 → 部署到 `https://<user>.github.io/<repo>/`。
5. 大媒体：`site/assets/` 已含 157 谱图 + 157 封面 + 91 头像，直接随仓库走；若未来资源过大，可改回仓库原有的 `packed/*.tar.part-*` 分片方案。

---

## 12. 包内已排除项（满足"不打包临时/密钥"要求）
- 本工作区 `.scan/` 下数百个开发探针脚本与中间产物（`_cards_*`、`_ar_*`、`_side_*`、`_q*`、`_nl_*`、`_cl_*`、`clear156/`、`probe/`、`chromeprofile/`、`av_tmp/` 等 PNG/py）**未**进入交付物，仅保留可复用的构建链与加歌脚本（见第 2 节 `source/`）。
- 无 `node_modules`（本项目无 Node 依赖）。
- 无任何密码 / 令牌 / 私钥；`env.example` 仅含可选代理占位，不含密钥。
- 应用运行数据（收藏/练习/自定义图）不在包内，请用第 7 节方法导出。
