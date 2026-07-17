# 干净摘录 · CleanMD

<p align="center">
  <img src="icons/logo.png" width="96" height="96" alt="CleanMD" />
</p>

<p align="center">
  <strong>网页 → 干净 Markdown</strong><br />
  划词即摘 · 区域框选 · 云端历史 · 传阅分享
</p>

<p align="center">
  <img alt="Manifest" src="https://img.shields.io/badge/Manifest-V3-blue" />
  <img alt="Version" src="https://img.shields.io/badge/version-0.9.0-007AFF" />
</p>

> 简短介绍与 Chrome 商店文案见 [ABOUT.md](./ABOUT.md)。

---

## 这是什么

**干净摘录（CleanMD）** 是一款 Chrome 扩展：把网页正文、选区或 AI 对话整理成可读的 Markdown，尽量去掉广告、侧栏与噪声。

无需登录即可无限摘录；登录 [闲算](https://www.xiansuan.top) 账号后，摘录会自动同步云端历史，并支持「传阅」分享。

## 功能

| 能力 | 说明 |
| --- | --- |
| **划词浮标** | 鼠标划选文字后，光标右下角出现图标，一点即摘 |
| **摘录本页** | 按站点规则抽取正文 → Markdown |
| **区域摘录** | 悬停锁定 DOM 区块，可扩大/缩小后确认 |
| **云端历史** | 登录后自动保存，可在弹窗「历史」打开/复制/删除 |
| **传阅** | 生成口令/链接，或发给已注册闲算用户 |
| **反馈** | 翻车/建议一键提交到闲算服务端 |

## 站点适配（部分）

- 知乎（回答 / 专栏 / 问题）
- CSDN 文章
- GitHub（README / 文件 / Issue 等）
- AI 对话：DeepSeek、通义千问、豆包等
- 其它页面：通用正文启发式

## 安装（开发者模式）

1. 打开 Chrome → `chrome://extensions`
2. 开启 **开发者模式**
3. **加载已解压的扩展程序** → 选择本目录 `clean-clip`
4. 工具栏固定「干净摘录」图标

修改代码后需在扩展页点击 **重新加载**；若改了 `content_scripts`，请刷新目标网页。

## 使用

1. **划词**：页面上选中文字 → 点浮出的剪刀图标 → 已复制 Markdown
2. **整页**：打开弹窗 → **摘录本页**
3. **区域**：弹窗 → **区域摘录** → 在页面点击锁定 → 扩大/缩小 → 确认
4. **账号**（可选）：弹窗「账号」登录闲算，默认同步到 `https://www.xiansuan.top`

## 目录结构

```
clean-clip/
├── manifest.json            # MV3 清单
├── README.md                # 本说明
├── ABOUT.md                 # 简介 / 商店文案
├── icons/                   # logo 与扩展图标
├── lib/
│   ├── html2md.js           # HTML → Markdown
│   ├── api.js               # 闲算 API
│   └── storage.js           # chrome.storage 封装
├── content/
│   ├── selection-bubble.js  # 划词浮标
│   ├── region-select.js     # 区域摘录
│   ├── clip.js              # 多站点摘录
│   ├── sites-cn.js          # 国内站点 + 通用
│   └── ai-chat.js           # AI 对话摘录
└── popup/                   # 弹窗 UI
```

## 权限说明

| 权限 | 用途 |
| --- | --- |
| `activeTab` / `scripting` | 在当前页注入摘录脚本 |
| `clipboardWrite` | 复制 Markdown |
| `storage` | 会话、上次结果、API 地址 |
| `host_permissions` | 任意 http(s) 页摘录；请求闲算 API |

## 与闲算的关系

扩展可独立使用（本地摘录 + 剪贴板）。登录后走闲算服务端能力：

- 云端历史 `/api/clip/history/*`
- 传阅 `/api/public/clip/share/*`、`/api/clip/share/*`
- 反馈 `/api/public/clip/feedback`

自建服务端时，在弹窗「账号」中修改 **API 地址**。

## 开发提示

- 划词浮标脚本在 `document_idle` 注入，改完后需 **刷新页面**
- 区域摘录由弹窗 `chrome.scripting.executeScript` 注入，结果写入 `chrome.storage.local`
- HTML → MD 核心：`lib/html2md.js`（`ZhihuClipHtml2Md`）

## 反馈

摘录翻车或不适配某站：弹窗「反馈」提交，或联系闲算团队。

官网：<https://www.xiansuan.top>
