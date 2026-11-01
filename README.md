# Wan 视频生成实验对照

打开 index.html，或使用本仓库 GitHub Pages 地址。页面无需密钥、GPU或在线模型。

- 默认并排 baseline 与每十步 Agent；可增加搭档五步，并切换全部33条实验视频记录。
- 全部九项指标、相对各自批次baseline的增减、逐次公开选择理由、参数轨迹和耗时。
- 18次真实诊断访谈的实际问题、完整发送上下文、公开回答和Token。新成片反馈若已完成，单独标注为预检。
- 原始MP4保留原SHA；额外WebM仅作浏览器播放兼容。33条实验记录按内容去重为14个原始视频文件，各批次评分单独保留。

五步与十步除接入间隔还存在提示、输入和代码版本差异，不是严格频率消融。三例单seed探索不支持普遍收益；保留负结果，不把公开回答称作隐藏思维链。

公开数据在 data.json，构建记录在 BUILD.json。此仓库只用于展示，不包含模型权重、API凭据或研究服务器访问凭据。

GitHub Pages部署依据：[官方工作流文档](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)。
