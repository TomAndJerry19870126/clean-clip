# 干净摘录 · CleanMD

<p align="center">
  <img src="icons/logo.png" width="96" height="96" alt="CleanMD" />
</p>

<p align="center">
  <strong>AI 对话 / 网页 → 干净 Markdown · Word · Excel</strong><br />
  国内主流站 + 海外社交 · 划词 / 区域通吃其它站
</p>

<p align="center">
  <img alt="Manifest" src="https://img.shields.io/badge/Manifest-V3-blue" />
  <img alt="Version" src="https://img.shields.io/badge/version-0.9.4-007AFF" />
  <img alt="DeepSeek" src="https://img.shields.io/badge/DeepSeek-chat-blue" />
  <img alt="Doubao" src="https://img.shields.io/badge/豆包-chat-00A6A6" />
  <img alt="Qwen" src="https://img.shields.io/badge/通义千问-chat-6B57FF" />
  <img alt="Weibo" src="https://img.shields.io/badge/微博-post-E6162D" />
  <img alt="XHS" src="https://img.shields.io/badge/小红书-note-FF2442" />
  <img alt="Twitter" src="https://img.shields.io/badge/Twitter%2FX-1DA1F2" />
</p>

Chrome 扩展：把 **AI 对话** 与 **网页正文** 整理成干净 Markdown，并可下载 **Word / Excel**。未单独适配的站点可用划词浮标或区域摘录。

可选登录 [闲算](https://www.xiansuan.top) 同步云端历史与传阅。

<p align="center">
  <img src="image.png" alt="划词摘录效果示意" width="100%" />
</p>

---

## 功能

| 能力 | 说明 |
| --- | --- |
| **AI 整页摘录** | DeepSeek / 豆包 / 千问：多轮对话 → Markdown（跳过思考噪声，长会话可滚动收集） |
| **划词浮标** | 选中文字后，鼠标右下角出图标，一点复制 |
| **区域摘录** | 锁定页面区块，可扩大 / 缩小后确认 |
| **导出** | `.md` / Word（`.doc`）/ Excel（`.xls`，优先导出表格） |
| **内容站** | 国内主流 + 海外社交专属规则；其它站通用正文识别 / 划词 / 区域 |
| **传阅 / 历史** | 登录闲算后：口令分享、云端历史、反馈 |

---

## 支持站点

### AI 对话

| 平台 | 说明 |
| --- | --- |
| DeepSeek | 整页多轮；长会话可滚动收集 |
| 豆包 | 整页多轮 |
| 通义千问 | 整页多轮 |
| 其它（如 ChatGPT） | 划词浮标 / 区域摘录 |

### 国内内容 / 社区 / 新闻

| 类型 | 站点 |
| --- | --- |
| 问答 / 专栏 | **知乎**（回答、专栏） |
| 技术博客 | **CSDN** · **掘金** · **简书** · **博客园** · **SegmentFault** · **开源中国** · **InfoQ** · **51CTO** · **脚本之家** · **人人都是产品经理** · **腾讯云开发者** · **阿里云开发者** · **牛客** |
| 社区 | **V2EX** · **贴吧** · **虎扑** · **豆瓣** · **雪球** |
| 微信生态 | **微信公众号**（mp.weixin.qq.com） |
| 知识库 | **语雀** · **百度百科** · **百度知道** · **百度经验** · **果壳** |
| 资讯 | **少数派** · **36氪** · **IT之家** · **虎嗅** · **澎湃** · **腾讯新闻** · **网易** · **新浪** · **搜狐** · **界面新闻** · **今日头条** · **什么值得买** |
| 短视频 / 社交 | **微博** · **小红书** · **抖音** · **快手** · **B 站**（专栏 / 动态 / 视频简介） |
| 电商 | **京东** · **淘宝 / 天猫**（标题、价格、参数等） |

### 海外

| 类型 | 站点 |
| --- | --- |
| 代码托管 | **GitHub**（Issue / PR / Discussion / README / Blob） |
| 社交 | **Twitter/X** · **Reddit** · **Instagram** · **Facebook** · **Threads** · **LinkedIn** · **TikTok** · **YouTube** |

未列出的站点：优先走**通用正文识别**；不行再用**划词**或**区域摘录**。

---

## 安装

1. Chrome → `chrome://extensions` → 开启开发者模式  
2. **加载已解压的扩展程序** → 选择本目录 `clean-clip`  
3. 固定工具栏图标；改代码后点 **重新加载**（改过 content script 需刷新网页）

## 使用

1. **整页摘录**：打开支持的页面 → **摘录本页**（社交 / 短视频请尽量进**详情页**）  
2. **划词**：选中文字 → 点浮标剪刀  
3. **区域**：弹窗 → **区域摘录** → 锁定 → 确认  
4. **导出**：预览区下方 → 下载 `.md` / Word / Excel  

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

`activeTab` / `scripting`（注入摘录）· `clipboardWrite` · `storage` · 访问 http(s) 与闲算 API

官网：<https://www.xiansuan.top>
