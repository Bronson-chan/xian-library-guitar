# 项目维护要求

这是用户的正式公网吉他乐谱工作台。每次按用户要求修改页面、功能、代码或公开曲库后：

1. 在此目录执行 `npm run build`，确认 156 首现有曲目及每首谱图、预览图、封面资源通过完整性检查。后续增加曲目时同步调整构建脚本的预期数量。
2. 在 GitHub Pages 子路径 `/xian-library-guitar/` 下检查首页、曲库、歌曲详情和练琴页；修改触及手机布局时检查手机宽度。
3. 只提交本次相关的源文件，不提交 `pages-dist/`。
4. 完成后提交本地 Git 变更，再运行 `powershell -ExecutionPolicy Bypass -File scripts/publish-github.ps1` 将变动文件同步到公开仓库 `main`。等待自定义 GitHub Actions 发布成功，核对正式地址 `https://bronson-chan.github.io/xian-library-guitar/`。
5. 不使用 Netlify 或仅登录后可访问的预览地址作为正式交付。

公开曲库资源在仓库和网站上均可被任何人下载。网页中用户自己添加的谱图、练习记录和熟练度只保存在该设备，不会由浏览器自动推送到 GitHub。
