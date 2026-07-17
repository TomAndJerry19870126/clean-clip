# 干净摘录 · CleanMD

<p align="center">
  <img src="icons/logo.png" width="96" height="96" alt="CleanMD" />
</p>

<p align="center">
  <strong>AI 对话 / 网页 → 干净 Markdown · Word · Excel</strong><br />
  DeepSeek · 豆包 · 通义千问 · 划词 / 区域通吃其它站
</p>

<p align="center">
  <img alt="Manifest" src="https://img.shields.io/badge/Manifest-V3-blue" />
  <img alt="Version" src="https://img.shields.io/badge/version-0.9.1-007AFF" />
  <img alt="DeepSeek" src="https://img.shields.io/badge/DeepSeek-chat-blue" />
  <img alt="Doubao" src="https://img.shields.io/badge/豆包-chat-00A6A6" />
  <img alt="Qwen" src="https://img.shields.io/badge/通义千问-chat-6B57FF" />
</p>

Chrome 扩展：把 **DeepSeek / 豆包 / 通义千问** 等 AI 对话，以及网页正文，整理成干净 Markdown，并可下载 **Word / Excel**。ChatGPT 等其它站用划词浮标或区域摘录即可。

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
| **内容站** | 知乎、CSDN、GitHub 等正文抽取 |
| **传阅 / 历史** | 登录闲算后：口令分享、云端历史、反馈 |

## 安装

1. Chrome → `chrome://extensions` → 开启开发者模式  
2. **加载已解压的扩展程序** → 选择本目录 `clean-clip`  
3. 固定工具栏图标；改代码后点 **重新加载**（改过 content script 需刷新网页）

## 使用

1. **整页 AI 对话**：打开 DeepSeek / 豆包 / 千问 → **摘录本页**  
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
