# 弦库 · 吉他谱管理台 —— 文件清单与完整性检查（INVENTORY）

> 以下数据由 `_verify_package.py` 对本交接包实跑得出（非估计）。

## 1. 核心统计

| 项目 | 数量 | 说明 |
|---|---|---|
| 歌曲（meta.json） | **157** | id 0–156，`totalFiles=157` |
| 谱图 `site/assets/tabs/` | **157 张** | 与歌曲 id 一一对应（0.jpg–156.jpg） |
| 封面 `site/assets/covers/` | **157 张** | 程序化生成方形封面 |
| 歌手头像 `site/assets/avatars/` | **91 张** | 真实照片，240×240；按代表歌曲 id 命名 |
| 首页演示图 `site/assets/ui/` | **8 张** | card0-3 / hero / mood / side / vinyl |
| 首页背景 `site/assets/hero.jpg` | 1 张 | 纯照片 |
| assets 合计 | **414 文件 / 82.4 MB** | 谱图为主（单张最大约 3–5 MB） |
| 预览图 `preview/` | **127 张**（50.0 MB） | 界面截图，仅供视觉参考，非运行必需 |
| PWA 文件 | 4 个 | manifest.webmanifest / sw.js / icon-192.png / icon-512.png |
| 包总体积 | **132.9 MB** | 主要为媒体资源 |

## 2. 完整性检查结论

| 检查项 | 结果 |
|---|---|
| 缺失谱图（按歌曲 id 比对） | **无** |
| 缺失封面（按歌曲 id 比对） | **无** |
| 头像映射缺失 / 路径失效 | **无**（91 位歌手全部命中） |
| 谱图文件名重复（冲突） | **无** |
| `index.html` 字面局部引用失效 | **无**（manifest/sw/图标/hero/ui 均存在；动态 `assets/tabs|covers|avatars/{i}` 已按 id 全量校验） |
| 数据占位符残留（`__SONGS_JSON__` 等） | **无**（build.py 断言通过） |
| 歌曲数 / 谱图数 / 封面数 一致性 | **一致（157 / 157 / 157）** |

## 3. 文件清单（交付物结构）

```
弦库吉他谱工作台-handoff/
├─ README.md                      入口说明
├─ HANDOFF.md                     完整交接文档
├─ INVENTORY.md                   本文件
├─ env.example                    可选环境变量示例（无密钥）
├─ .gitignore
├─ .github/workflows/deploy-pages.yml   GitHub Pages 部署（单文件版）
├─ site/                          可部署成品
│  ├─ index.html                  构建产物（已注入 157 首 + PWA 注册）
│  ├─ manifest.webmanifest        PWA 清单
│  ├─ sw.js                       Service Worker（导航 network-first，静态 cache-first）
│  ├─ icon-192.png / icon-512.png 安装图标
│  ├─ 使用说明.md / 曲谱数据总表.csv / 未识别与需确认清单.md
│  └─ assets/
│     ├─ tabs/    （157 张谱图，0.jpg–156.jpg）
│     ├─ covers/  （157 张封面）
│     ├─ avatars/ （91 张头像）
│     ├─ hero.jpg
│     └─ ui/      （8 张演示图）
├─ source/                        可编辑源码 / 构建链
│  ├─ app_template.html           单文件模板（占位符 __SONGS_JSON__ / __AVATAR_MAP__）
│  ├─ build.py                    数据注入 → site/index.html（路径相对，便携）
│  ├─ meta.json                   曲库元数据（157 首）
│  ├─ img_report.json             歌手→头像映射（avatar_map）
│  ├─ gencovers.py                程序化封面生成（需 Pillow）
│  ├─ _add_song_assets.py         加歌：落盘谱面 + 抓取头像
│  ├─ _add_song_meta.py           加歌：写 meta + 头像映射
│  ├─ _gencover_new.py            加歌：生成同画风封面（需 opencv/numpy）
│  ├─ _runtest.py / _diag.py / _test_snippet.html   回归测试
│  └─ requirements.txt            依赖说明
└─ preview/                       界面预览图（127 张，仅供参考）
```

## 4. 《你要的爱》专项

- 文件：`site/assets/tabs/156.jpg`
- 尺寸：**1312 × 5984**，模式 **RGB（彩色）**，约 **1.05 MB**
- 构成：原图（1920×972 三页横排）切成三页 → 各 2x 超分 → 纵向排列（页间有分隔线）
- 已修正：先前误生成灰度图（mode L），已恢复为彩色，与曲库其余谱图一致
- 局限：像素为插值放大，**非真高清**；若有 ≥2800px 宽原谱 / PDF 替换即可一步到位，无需改代码

## 5. 包内【已排除】项（满足"不打包临时/密钥"要求）

- 工作区 `.scan/` 下数百个开发探针脚本与中间产物（`_cards_*`、`_ar_*`、`_side_*`、`_q*`、`_nl_*`、`_cl_*`、`clear156/`、`probe/`、`chromeprofile/`、`av_tmp/`、`avatars_old/`、`sheets/`、`shot/`、`v2a/`、`v2b/`、`cp*/` 等）**未**进入交付物，仅保留可复用的构建链与加歌脚本。
- 无 `node_modules`（本项目无 Node 依赖）。
- 无任何密码 / 令牌 / 私钥；`env.example` 仅含可选代理占位，不含密钥。
- 应用运行数据（收藏 / 练习 / 自定义图）不在包内，请用 HANDOFF.md 第 7 节方法导出。

## 6. 解压后如何验收
1. `cd site && python -m http.server 8080` → 打开 `http://localhost:8080`。
2. 曲库应显示 157 首；搜索"你要的爱"应命中戴佩妮。
3. 打开任意详情页：谱面加载正常；Ctrl/⌘+滚轮可缩放；点"我学会了"状态在 新学↔已学会 间切换。
4. 检查浏览器 DevTools → Application → Manifest / Service Worker 是否注册成功（PWA 可安装）。
