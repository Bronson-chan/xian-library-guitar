# 项目维护要求

这是用户的正式公网吉他乐谱工作台。每次按用户要求修改页面、功能、代码或公开曲库后：

1. 正式站以 `workbuddy/source/app_template.html` 为可编辑模板，元数据在同目录 `meta.json`。先运行 `python workbuddy/source/build.py`，再运行 `npm run build`，确认新版 157 首及全部谱图、封面、91 位歌手头像完整。旧版 156 首保留在 `legacy/`，可访问原 IndexedDB 记录。
   新版媒体位于本地 `workbuddy/site/assets/`，更新后重新生成 `packed/workbuddy-assets.tar.part-*`；Actions 自动解包。不要只改生成后的 `site/index.html`。
2. 在 GitHub Pages 子路径 `/xian-library-guitar/` 下检查首页、曲库、歌曲详情和练琴页；修改触及手机布局时检查手机宽度。
3. 只提交本次相关的源文件，不提交 `pages-dist/`。
4. 完成后提交本地 Git 变更，再运行 `powershell -ExecutionPolicy Bypass -File scripts/publish-github.ps1` 将变动文件同步到公开仓库 `main`。等待自定义 GitHub Actions 发布成功，核对正式地址 `https://bronson-chan.github.io/xian-library-guitar/`。
5. 不使用 Netlify 或仅登录后可访问的预览地址作为正式交付。
6. 用户每次提供新谱时，必须主动识别歌名、演唱者及对应录音版本的发行专辑，查证真实专辑封面并下载到 `workbuddy/site/album-art/`，同时核对歌手头像；不得等用户提醒，不得用程序生成的占位图代替真实专辑。元数据记录 `album`、`albumArtist`、`coverPath`、`artworkSource`、`trackSource`、`artworkVerified`，匹配依据为歌名＋歌手＋具体录音版本，不能只取搜索第一项。无法核实的才向用户说明。已有 `_gencover_new.py` 等生成封面脚本不适用于新增歌曲。
7. 首页、曲库、详情等所有歌曲封面均通过 `coverSrc()` 读取。新增条目从 id 156 起，构建会强制检查已核实的专辑资料、真实封面文件及歌手头像映射，缺失即停止发布。
8. 打开响应优先于动效。页面/谱面打开路径不播放 JS 装饰动画，不等待过渡；关闭谱面保留已加载节点。只允许当前谱和一个意向谱的有界缓存，严禁无节制预加载全部高清谱。性能验收必须测首次请求、重复打开与切谱，不能用 RAF 帧率代替打开耗时。

公开曲库资源在仓库和网站上均可被任何人下载。网页中用户自己添加的谱图、练习记录和熟练度只保存在该设备，不会由浏览器自动推送到 GitHub。
