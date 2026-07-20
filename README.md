# 干净摘录 · CleanMD

<p align="center">
  <img src="icons/logo.png" width="96" height="96" alt="CleanMD" />
</p>

<p align="center">
  <strong>网页 / AI 对话 → 干净 Markdown</strong>
</p>

<p align="center">
  DeepSeek · 豆包 · 千问 · 划词 / 区域摘录<br />
  导出 Markdown / Word / Excel · Obsidian / Notion · 传阅与小文件
</p>

<p align="center">
  <img alt="Manifest" src="https://img.shields.io/badge/Manifest-V3-blue" />
  <img alt="Version" src="https://img.shields.io/badge/version-0.12.2-007AFF" />
  <img alt="DeepSeek" src="https://img.shields.io/badge/DeepSeek-chat-blue" />
  <img alt="Doubao" src="https://img.shields.io/badge/豆包-chat-00A6A6" />
  <img alt="Qwen" src="https://img.shields.io/badge/通义千问-chat-6B57FF" />
</p>

---

## 核心场景

### 1. AI 对话备份（主场景）★ 新定位

在 **DeepSeek / 豆包 / 通义千问** 打开对话 → 点扩展 **备份本页对话**：

- 多轮用户 / 助手结构保留
- 自动去除思考链等噪声
- 长会话可滚动收集完整记录
- 预览支持按轮删除后再复制 / 导出
- 缺轮、重复轮会去重并给出提示

**支持平台**：DeepSeek · 豆包 · 通义千问

### 2. 中文好文摘录（次场景）

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
| **备份本页对话** | DeepSeek/豆包/千问 整页对话 → Markdown（去除思考链） |
| **AI 智能摘要** | 一键生成对话/文章的核心要点摘要 |
| **导出到 Obsidian** | 下载带 frontmatter 的 .md，直接放入 Obsidian 库 |
| **导出到 Notion** | 复制 Notion 块格式，一键粘贴 |
| **导出 .md / Word** | 传统格式下载 |
| **划词浮标** | 选中文字 → 右下角图标一键复制 |
| **区域摘录** | 锁定页面区块，扩大 / 缩小后确认 |
| **云端历史** | 登录闲算：云端同步历史记录 |
| **传阅分享** | 生成口令/链接，分享给团队成员 |

---

## Obsidian 用户指南

### 快速开始

1. 打开 DeepSeek 对话页面
2. 点击扩展图标 → 「备份本页对话」
3. 预览、编辑（可删除不需要的轮次）
4. 切到「导出」页 → 点击「下载 .md」
5. 文件自动带有 Obsidian frontmatter，直接放入 Vault 即可

### Frontmatter 示例

```yaml
---
title: "我的 DeepSeek 对话"
date: 2026-07-18
source: https://chat.deepseek.com/...
type: deepseek-chat
platform: DeepSeek
tags: []
---
```

---

## 更多已适配站点

<details>
<summary>国内（点击展开）</summary>

- **社区**：V2EX · 贴吧 · 虎扑 · 豆瓣 · 雪球 · 牛客
- **知识**：语雀 · 百度百科 / 知道 / 经验 · 果壳
- **资讯等**：36 氪 · IT 之家 · 虎嗅 · 澎湃 · 头条等（尽力适配）
- **短视频 / 电商**：划词或区域优先；整页规则不作为核心承诺

</details>

<details>
<summary>海外（点击展开）</summary>

- **GitHub**（Issue / PR / Discussion / README）
- 其它海外社交：划词 / 区域优先；部分站点有尽力规则

</details>

---

## 安装

1. Chrome → `chrome://extensions` → 开启开发者模式
2. **加载已解压的扩展程序** → 选择本目录 `clean-clip`
3. 固定工具栏图标；改代码后点 **重新加载**（改过 content script 需刷新网页）

### Chrome Web Store 安装（即将上线）

直接在 [Chrome 网上应用店](https://chrome.google.com/webstore) 搜索「干净摘录」安装。

## 使用

1. 打开 DeepSeek / 豆包 / 千问对话 → **备份本页对话**
2. 预览、编辑（可删除不需要的轮次）
3. 导出到 Obsidian / Notion / .md / Word
4. 其它页面：选中文字点浮标，或用 **区域摘录**

---

## 目录结构

```
clean-clip/
├── manifest.json
├── README.md
├── image.png
├── icons/
├── lib/          # html2md · export · api · storage
├── content/      # ai-chat · selection-bubble · region-select · clip · sites-cn
├── popup/        # 弹窗界面
└── store/        # Chrome Web Store 上架资源
```

## 权限

`activeTab` / `scripting` · `clipboardWrite` · `storage` · 访问 http(s) 与闲算 API

## 官网

https://www.xiansuan.top
