# 弦库 · 吉他乐谱工作台

公开 PWA 网站，使用 GitHub Pages 和自定义 GitHub Actions 部署。网页无需账号即可在电脑或手机上打开，支持安装到桌面。

正式地址：`https://bronson-chan.github.io/xian-library-guitar/`

## 本地检查

需要 Node.js 22 或更新版本，无需安装依赖：

```sh
npm run build
npm run preview
```

测试地址为 `http://127.0.0.1:43129/xian-library-guitar/`；正式网站始终使用上面的 HTTPS 地址。

## 曲库与数据

- `catalog/scores.json` 是公开曲库清单；`catalog/pages/` 保存高清谱图，`catalog/media/` 保存歌曲封面和歌手图片。
- `assets/score-previews/` 保存用于快速显示的轻量谱图预览。每首公开歌曲都必须有对应的预览文件。构建脚本会检查曲目、谱图、封面和预览文件是否齐全。
- 公开曲库更新随代码提交触发 GitHub Actions，发布到同一个网址。网页启动时会读取最新清单。
- 用户在网页里新加的谱图、编辑内容、收藏、练习记录和熟练度保存在各自浏览器的 IndexedDB；它们不会自动上传到 GitHub。要把新增谱图共享给所有访问者，需把图片和曲目资料提交到仓库。
- 清除网站数据会清除当前设备的本地记录。Netlify 旧域名与 GitHub Pages 是不同网站，浏览器不会自动迁移旧域名的本地记录。

## 自动发布

推送到 `main` 后，`.github/workflows/deploy-pages.yml` 运行构建、完整性检查，并通过 GitHub Pages Actions 发布。仓库 Settings → Pages 的 Source 需设置为 `GitHub Actions`。

