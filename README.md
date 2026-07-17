# 干净摘录 · CleanMD

<p align="center">
  <img src="icons/logo.png" width="96" height="96" alt="CleanMD" />
</p>

<p align="center">
  <strong>把 AI 对话和中文好文，一键收成干净 Markdown</strong>
</p>

<p align="center">
  DeepSeek · 豆包 · 通义千问 · 知乎 · 公众号 · 掘金 …<br />
  导出 Markdown / Word / Excel · 划词与区域摘录兜底
</p>

<p align="center">
  <img alt="Manifest" src="https://img.shields.io/badge/Manifest-V3-blue" />
  <img alt="Version" src="https://img.shields.io/badge/version-0.9.4-007AFF" />
  <img alt="DeepSeek" src="https://img.shields.io/badge/DeepSeek-chat-blue" />
  <img alt="Doubao" src="https://img.shields.io/badge/豆包-chat-00A6A6" />
  <img alt="Qwen" src="https://img.shields.io/badge/通义千问-chat-6B57FF" />
</p>

聊完 DeepSeek / 豆包 / 千问，或读完知乎、公众号、技术博客——一点「摘录本页」，得到**去噪声、可存档**的 Markdown，并可下载 Word / Excel。

其它站点用**划词浮标**或**区域摘录**即可。可选登录 [闲算](https://www.xiansuan.top) 同步云端历史与传阅。

<p align="center">
  <img src="image.png" alt="划词摘录效果示意" width="100%" />
</p>

---

## 核心场景

### 1. AI 对话 → 干净笔记（主场景）

在 **DeepSeek / 豆包 / 通义千问** 打开对话 → 点扩展 **摘录本页**：

- 多轮用户 / 助手结构保留  
- 跳过思考链等噪声  
- 长会话可滚动收集完整记录  
- 预览后复制，或导出 `.md` / Word / Excel  

ChatGPT 等未专项适配的对话页：用划词或区域摘录。

### 2. 中文好文 → 干净 Markdown（次场景）

优先保证阅读质量高的站点：

| 类型 | 站点 |
| --- | --- |
| 问答 / 专栏 | 知乎（回答、专栏） |
| 微信 | 公众号文章（mp.weixin.qq.com） |
| 技术阅读 | 掘金 · CSDN · 少数派 · 博客园 · 简书 · SegmentFault · GitHub |

打开文章详情 → **摘录本页**，得到标题、作者、正文 Markdown。

---

## 功能一览

| 能力 | 说明 |
| --- | --- |
| **摘录本页** | AI 对话 / 适配站点整页 → Markdown |
| **划词浮标** | 选中文字 → 右下角图标一键复制 |
| **区域摘录** | 锁定页面区块，扩大 / 缩小后确认 |
| **导出** | `.md` · Word（`.doc`）· Excel（`.xls`） |
| **传阅 / 历史** | 登录闲算：口令分享、云端历史、反馈 |

---

## 更多已适配站点

以下站点有专属规则；未列出的走通用正文识别，或用划词 / 区域。

<details>
<summary>国内（点击展开）</summary>

- **社区**：V2EX · 贴吧 · 虎扑 · 豆瓣 · 雪球 · 牛客  
- **知识**：语雀 · 百度百科 / 知道 / 经验 · 果壳  
- **资讯**：36 氪 · IT 之家 · 虎嗅 · 澎湃 · 腾讯新闻 · 网易 · 新浪 · 搜狐 · 界面 · 头条 · 什么值得买 · 开源中国 · InfoQ · 51CTO · 脚本之家 · 人人都是产品经理 · 腾讯云 / 阿里云开发者  
- **社交短视频**（请进详情页）：微博 · 小红书 · 抖音 · 快手 · B 站（专栏 / 动态 / 视频简介）  
- **电商**：京东 · 淘宝 / 天猫  

</details>

<details>
<summary>海外（点击展开）</summary>

- **GitHub**（Issue / PR / Discussion / README）  
- **社交**：Twitter/X · Reddit · Instagram · Facebook · Threads · LinkedIn · TikTok · YouTube  

</details>

---

## 安装

1. Chrome → `chrome://extensions` → 开启开发者模式  
2. **加载已解压的扩展程序** → 选择本目录 `clean-clip`  
3. 固定工具栏图标；改代码后点 **重新加载**（改过 content script 需刷新网页）

## 使用

1. 打开 DeepSeek / 豆包 / 千问对话，或知乎 / 公众号等文章 → **摘录本页**  
2. 其它页面：选中文字点浮标，或用 **区域摘录**  
3. 预览区下方 → 下载 `.md` / Word / Excel  

## 目录

```
clean-clip/
├── manifest.json
├── README.md
├── image.png
├── icons/
├── lib/          # html2md · export · api · storage
├── content/      # ai-chat · selection-bubble · region-select · clip · sites-cn
└── popup/
```

## 权限

`activeTab` / `scripting` · `clipboardWrite` · `storage` · 访问 http(s) 与闲算 API

官网：<https://www.xiansuan.top>
