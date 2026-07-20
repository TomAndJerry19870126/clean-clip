const statusEl = document.getElementById("status");
const exportStatusEl = document.getElementById("export-status");
const previewEl = document.getElementById("preview");
const btnClip = document.getElementById("btn-clip");
const btnRegion = document.getElementById("btn-region");
const btnCopy = document.getElementById("btn-copy");
const btnDownloadMd = document.getElementById("btn-download-md");
const btnDownloadWord = document.getElementById("btn-download-word");
const btnExportObsidian = document.getElementById("btn-export-obsidian");
const btnExportNotion = document.getElementById("btn-export-notion");
const btnShareCreate = document.getElementById("btn-share-create");
const btnShareQuick = document.getElementById("btn-share-quick");
const crashHint = document.getElementById("crash-hint");

const shareStatus = document.getElementById("share-status");
const shareCodeOut = document.getElementById("share-code-out");
const shareUrlOut = document.getElementById("share-url-out");
const shareCodeIn = document.getElementById("share-code-in");
const btnCopyShareCode = document.getElementById("btn-copy-share-code");
const btnCopyShareUrl = document.getElementById("btn-copy-share-url");
const btnShareFetch = document.getElementById("btn-share-fetch");

const accountStatus = document.getElementById("account-status");
const accountLoggedIn = document.getElementById("account-logged-in");
const accountForms = document.getElementById("account-forms");
const accountEmail = document.getElementById("account-email");
const accountName = document.getElementById("account-name");

const apiBaseInput = document.getElementById("api-base");
const authEmail = document.getElementById("auth-email");
const authPassword = document.getElementById("auth-password");
const authCode = document.getElementById("auth-code");
const regCodeWrap = document.getElementById("reg-code-wrap");
const btnLogin = document.getElementById("btn-login");
const btnRegister = document.getElementById("btn-register");
const btnToggleReg = document.getElementById("btn-toggle-reg");
const btnSendCode = document.getElementById("btn-send-code");
const btnSaveApi = document.getElementById("btn-save-api");
const btnLogout = document.getElementById("btn-logout");
const registerHint = document.getElementById("register-hint");

const feedbackStatus = document.getElementById("feedback-status");
const fbKind = document.getElementById("fb-kind");
const fbContent = document.getElementById("fb-content");
const fbEmail = document.getElementById("fb-email");

let lastMarkdown = "";
let lastTitle = "cleanmd";
let lastMeta = null;
let lastTurns = null;
let lastTurnsFull = null;
let lastChatKind = "";
let registerMode = false;

const turnEditor = document.getElementById("turn-editor");
const turnList = document.getElementById("turn-list");
const btnTurnsReset = document.getElementById("btn-turns-reset");

function setStatus(el, text, kind) {
  el.textContent = text;
  el.classList.remove("ok", "err");
  if (kind) el.classList.add(kind);
}

function showPanel(name) {
  document.querySelectorAll(".tab").forEach((t) => {
    t.classList.toggle("active", t.dataset.tab === name);
  });
  document.querySelectorAll(".panel").forEach((p) => {
    p.classList.toggle("active", p.id === `panel-${name}`);
  });
  if (name === "share") {
    refreshInbox().catch(() => {});
  }
  if (name === "history") {
    refreshHistory().catch(() => {});
  }
}

document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => showPanel(tab.dataset.tab));
});

async function saveCloudHistory(markdown, title, meta) {
  const { token } = await ClipStorage.getSession();
  if (!token || !markdown) return null;
  try {
    return await ClipApi.saveHistory({
      markdown,
      title,
      sourceUrl: meta?.pageUrl || undefined,
      siteHost: meta?.siteHost || undefined,
      clipKind: meta?.clipKind || undefined,
    });
  } catch (e) {
    console.warn("save history failed", e);
    return null;
  }
}

function isAiChatKind(kind) {
  return /deepseek|qwen|doubao|chat/i.test(kind || "");
}

function parseTurnsFromMarkdown(md) {
  if (!md) return null;
  const parts = md.split(/^## /m);
  if (parts.length < 2) return null;
  const turns = [];
  for (let i = 1; i < parts.length; i++) {
    const block = parts[i];
    const nl = block.indexOf("\n");
    const head = (nl >= 0 ? block.slice(0, nl) : block).trim();
    const body = (nl >= 0 ? block.slice(nl + 1) : "").trim();
    if (!head || !body) continue;
    const role = head.replace(/\s*·\s*#\d+\s*$/, "").trim();
    if (!role) continue;
    turns.push({ role, body });
  }
  return turns.length ? turns : null;
}

function rebuildChatMarkdown(turns, title, kind, pageUrl) {
  const lines = [];
  lines.push(`# ${title || "AI 对话"}`, "");
  lines.push(`- 平台：${kind || "ai-chat"}`);
  if (pageUrl) lines.push(`- 来源：${pageUrl}`);
  lines.push(`- 轮次：${turns.length}`);
  lines.push(`- 说明：已按预览编辑（可删轮）`, "");
  turns.forEach((turn, i) => {
    lines.push(`## ${turn.role} · #${i + 1}`, "");
    lines.push(turn.body, "");
  });
  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim() + "\n";
}

function renderTurnEditor() {
  if (!turnEditor || !turnList) return;
  const show = Array.isArray(lastTurnsFull) && lastTurnsFull.length > 0;
  turnEditor.classList.toggle("hidden", !show);
  if (!show) {
    turnList.innerHTML = "";
    if (btnTurnsReset) btnTurnsReset.hidden = true;
    return;
  }
  const cur = lastTurns || [];
  if (btnTurnsReset) btnTurnsReset.hidden = cur.length >= lastTurnsFull.length;
  if (!cur.length) {
    turnList.innerHTML = '<p class="hint" style="margin:0">已全部删除 · 可点「恢复全部」</p>';
    return;
  }
  turnList.innerHTML = cur
    .map((t, i) => {
      const snip = (t.body || "").replace(/\s+/g, " ").slice(0, 48);
      return `<div class="turn-row" data-idx="${i}">
        <span class="turn-role">${escapeHtml(t.role)}</span>
        <span class="turn-snip" title="${escapeAttr(t.body || "")}">${escapeHtml(snip)}</span>
        <button type="button" class="turn-del" data-del="${i}">删除</button>
      </div>`;
    })
    .join("");
}

function escapeHtml(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttr(s) {
  return escapeHtml(s).replace(/\n/g, " ");
}

function applyTurnsEdit() {
  const kind = lastChatKind || lastMeta?.clipKind || "ai-chat";
  if (!lastTurns?.length) {
    lastMarkdown = "";
    previewEl.value = "";
    btnCopy.disabled = true;
    btnDownloadMd.disabled = true;
    btnDownloadWord.disabled = true;
    if (btnShareCreate) btnShareCreate.disabled = true;
    if (lastMeta) {
      lastMeta.previewSnippet = "";
      lastMeta.turnCount = 0;
      ClipStorage.setLastClipMeta(lastMeta);
    }
    renderTurnEditor();
    setStatus(statusEl, "已删光全部轮次 · 可恢复全部", "err");
    return;
  }
  const md = rebuildChatMarkdown(lastTurns, lastTitle, kind, lastMeta?.pageUrl);
  lastMarkdown = md;
  previewEl.value = md;
  btnCopy.disabled = false;
  btnDownloadMd.disabled = false;
  btnDownloadWord.disabled = false;
  if (btnShareCreate) btnShareCreate.disabled = false;
  if (lastMeta) {
    lastMeta.previewSnippet = md.slice(0, 1500);
    lastMeta.turnCount = lastTurns.length;
    ClipStorage.setLastClipMeta(lastMeta);
  }
  renderTurnEditor();
  setStatus(statusEl, `已更新预览 · 剩余 ${lastTurns.length} 轮`, "ok");
}

function setResult(markdown, title, meta, turns) {
  lastMarkdown = markdown || "";
  lastTitle = (title || "cleanmd").replace(/[\\/:*?"<>|]/g, "_").slice(0, 80);
  lastMeta = meta || null;
  previewEl.value = lastMarkdown;
  const has = Boolean(lastMarkdown);
  btnCopy.disabled = !has;
  btnDownloadMd.disabled = !has;
  btnDownloadWord.disabled = !has;
  btnExportObsidian.disabled = !has;
  btnExportNotion.disabled = !has;
  if (btnShareCreate) btnShareCreate.disabled = !has;
  if (btnShareQuick) btnShareQuick.disabled = !has;
  const btnShareToUser = document.getElementById("btn-share-to-user");
  if (btnShareToUser) btnShareToUser.disabled = !has;
  crashHint.classList.toggle("hidden", !has);

  const kind = meta?.clipKind || "";
  let resolved = Array.isArray(turns) && turns.length ? turns : null;
  if (!resolved && isAiChatKind(kind)) resolved = parseTurnsFromMarkdown(lastMarkdown);
  if (resolved?.length) {
    lastTurns = resolved.map((t) => ({ role: t.role, body: t.body }));
    lastTurnsFull = lastTurns.map((t) => ({ ...t }));
    lastChatKind = kind;
  } else {
    lastTurns = null;
    lastTurnsFull = null;
    lastChatKind = "";
  }
  renderTurnEditor();

  if (meta) {
    meta.turnCount = lastTurns?.length || undefined;
    ClipStorage.setLastClipMeta(meta);
  }
}

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

function isClipableUrl(url) {
  if (!url) return false;
  try {
    const u = new URL(url);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

async function runClip() {
  setResult("", "", null);
  crashHint.classList.add("hidden");

  const tab = await getActiveTab();
  if (!tab?.id) {
    setStatus(statusEl, "找不到当前标签页。", "err");
    return;
  }
  if (!isClipableUrl(tab.url)) {
    setStatus(statusEl, "请在普通网页上使用。", "err");
    return;
  }

  const isDeepSeek = /deepseek\.com/i.test(tab.url || "");
  setStatus(statusEl, isDeepSeek ? "正在摘录…（先滚动加载完整对话）" : "正在摘录…");

  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: [
        "lib/html2md.js",
        "content/ai-chat.js",
        "content/sites-cn.js",
        "content/clip.js",
      ],
    });

    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: async () => {
        const ready = window.__CLEAN_CLIP_READY__ || window.__ZHIHU_CLEAN_CLIP_READY__;
        if (ready) return await ready;
        return window.__CLEAN_CLIP__ || window.__ZHIHU_CLEAN_CLIP__;
      },
    });

    if (!result?.ok) {
      setStatus(statusEl, result?.error || "摘录失败。", "err");
      lastMeta = {
        ok: false,
        pageUrl: tab.url,
        siteHost: new URL(tab.url).hostname,
        clipKind: "",
        error: result?.error || "摘录失败",
        previewSnippet: "",
      };
      await ClipStorage.setLastClipMeta(lastMeta);
      crashHint.classList.remove("hidden");
      return;
    }

    const meta = {
      ok: true,
      pageUrl: tab.url,
      siteHost: new URL(tab.url).hostname,
      clipKind: result.kind,
      previewSnippet: (result.markdown || "").slice(0, 1500),
      turnCount: Array.isArray(result.turns) ? result.turns.length : undefined,
      extensionVersion: chrome.runtime.getManifest().version,
    };
    setResult(result.markdown, result.title, meta, result.turns);

    const saved = await saveCloudHistory(result.markdown, result.title, meta);
    const cloudNote = saved ? " · 已同步云端" : "";
    const warnNote = result.warning ? ` · ${result.warning}` : "";
    const turnNote = result.turns?.length ? ` · ${result.turns.length} 轮` : "";
    setStatus(
      statusEl,
      `完成（${result.kind}）· ${result.markdown.length} 字符${turnNote}${cloudNote}${warnNote}`,
      result.warning ? "err" : "ok",
    );
  } catch (e) {
    setStatus(statusEl, `注入失败：${e?.message || e}\n请重新加载扩展并刷新页面。`, "err");
    crashHint.classList.remove("hidden");
  }
}

async function copyMarkdown() {
  if (!lastMarkdown) return;
  try {
    await navigator.clipboard.writeText(lastMarkdown);
    setStatus(statusEl, "已复制到剪贴板。", "ok");
  } catch {
    previewEl.focus();
    previewEl.select();
    setStatus(statusEl, "自动复制失败，请 Ctrl+C。", "err");
  }
}

function downloadMarkdown() {
  if (!lastMarkdown) return;
  ClipExport.downloadMarkdown(lastMarkdown, lastTitle || "cleanmd");
  setStatus(statusEl, "已开始下载 .md 文件。", "ok");
}

function downloadWord() {
  if (!lastMarkdown) return;
  ClipExport.downloadWord(lastMarkdown, lastTitle || "cleanmd");
  setStatus(statusEl, "已开始下载 Word（.doc，可用 Word/WPS 打开）。", "ok");
}

function exportToObsidian() {
  if (!lastMarkdown) return;
  const meta = {
    sourceUrl: lastMeta?.pageUrl,
    clipKind: lastMeta?.clipKind,
    platform: getPlatformFromKind(lastMeta?.clipKind),
  };
  const obsidianMd = ClipExport.buildObsidianMd(lastMarkdown, lastTitle, meta);
  ClipExport.downloadMarkdown(obsidianMd, lastTitle || "cleanmd");
  setStatus(exportStatusEl, "已下载 Obsidian 格式 .md（带 frontmatter）", "ok");
}

function exportToNotion() {
  if (!lastMarkdown) return;
  try {
    const blocks = ClipExport.toNotionBlocks(lastMarkdown);
    const notionJson = JSON.stringify(blocks, null, 2);
    navigator.clipboard.writeText(notionJson).then(() => {
      setStatus(exportStatusEl, "Notion 块格式已复制！到 Notion 页面按 Ctrl/Cmd+V 粘贴。", "ok");
    }).catch(() => {
      setStatus(exportStatusEl, "复制失败，请手动复制预览内容。", "err");
    });
  } catch (e) {
    setStatus(exportStatusEl, "导出失败：" + (e?.message || e), "err");
  }
}

function getPlatformFromKind(kind) {
  if (!kind) return "";
  if (/deepseek/i.test(kind)) return "DeepSeek";
  if (/doubao/i.test(kind)) return "豆包";
  if (/qwen/i.test(kind)) return "通义千问";
  if (/zhihu/i.test(kind)) return "知乎";
  if (/weixin|wx|mp\.weixin/i.test(kind)) return "微信公众号";
  return kind;
}

function setRegisterMode(on) {
  registerMode = on;
  regCodeWrap.classList.toggle("hidden", !on);
  btnLogin.classList.toggle("hidden", on);
  btnRegister.classList.toggle("hidden", !on);
  btnToggleReg.textContent = on ? "去登录" : "去注册";
}

async function syncConfigFromServer() {
  try {
    const cfg = await ClipApi.config();
    if (cfg?.registerHint) registerHint.textContent = cfg.registerHint;
  } catch {
    /* offline: keep local defaults */
  }
}

async function refreshAccountUi() {
  apiBaseInput.value = await ClipStorage.getApiBase();
  const { token, user } = await ClipStorage.getSession();
  if (token && user) {
    accountLoggedIn.classList.remove("hidden");
    accountForms.classList.add("hidden");
    accountEmail.textContent = user.email || "";
    accountName.textContent = user.displayName ? `昵称：${user.displayName}` : "";
    setStatus(accountStatus, "已登录 · 摘录会同步到云端历史。", "ok");
    return;
  }
  accountLoggedIn.classList.add("hidden");
  accountForms.classList.remove("hidden");
  setStatus(accountStatus, "登录后可同步云端历史与传阅收件箱。");
  await syncConfigFromServer();
}

async function doLogin() {
  try {
    setStatus(accountStatus, "登录中…");
    const data = await ClipApi.login(authEmail.value.trim(), authPassword.value);
    await ClipStorage.setSession(data.token, data);
    setStatus(accountStatus, "登录成功。", "ok");
    await refreshAccountUi();
  } catch (e) {
    setStatus(accountStatus, e.message || String(e), "err");
  }
}

async function doSendCode() {
  try {
    setStatus(accountStatus, "发送验证码…");
    await ClipApi.sendRegisterCode(authEmail.value.trim());
    setStatus(accountStatus, "验证码已发送，请查收邮箱。", "ok");
  } catch (e) {
    setStatus(accountStatus, e.message || String(e), "err");
  }
}

async function doRegister() {
  try {
    setStatus(accountStatus, "注册中…");
    const data = await ClipApi.register({
      email: authEmail.value.trim(),
      password: authPassword.value,
      verificationCode: authCode.value.trim(),
      source: "clean-md",
    });
    await ClipStorage.setSession(data.token, data);
    setStatus(accountStatus, "注册并登录成功。", "ok");
    setRegisterMode(false);
    await refreshAccountUi();
  } catch (e) {
    setStatus(accountStatus, e.message || String(e), "err");
  }
}

async function doLogout() {
  try {
    await ClipApi.logout();
  } catch {
    /* ignore */
  }
  await ClipStorage.clearSession();
  setStatus(accountStatus, "已退出。", "ok");
  await refreshAccountUi();
}

async function fillCrashForm() {
  const meta = lastMeta || (await ClipStorage.getLastClipMeta());
  if (!meta) {
    setStatus(feedbackStatus, "还没有摘录记录，请先摘录一页。", "err");
    return;
  }
  fbKind.value = "crash";
  let ver = "";
  try {
    ver = chrome.runtime.getManifest().version;
  } catch {
    /* ignore */
  }
  const lines = [
    meta.ok === false ? "摘录失败/不理想" : "摘录结果需要改进",
    `扩展版本：${meta.extensionVersion || ver || ""}`,
    `站点：${meta.siteHost || ""}`,
    `类型：${meta.clipKind || ""}`,
    `URL：${meta.pageUrl || ""}`,
    meta.turnCount != null ? `轮次：${meta.turnCount}` : "",
    meta.error ? `错误：${meta.error}` : "",
    "",
    "问题描述：",
    "",
  ].filter((x, i, a) => x !== "" || a[i - 1] !== "");
  fbContent.value = lines.join("\n");
  setStatus(feedbackStatus, "已填入站点 / 类型 / URL，请补充具体问题后提交。", "ok");
}

async function submitFeedback() {
  const content = fbContent.value.trim();
  if (content.length < 4) {
    setStatus(feedbackStatus, "请至少写几句具体描述。", "err");
    return;
  }
  const meta = lastMeta || (await ClipStorage.getLastClipMeta()) || {};
  try {
    setStatus(feedbackStatus, "提交中…");
    await ClipApi.submitFeedback({
      kind: fbKind.value,
      content,
      contactEmail: fbEmail.value.trim() || undefined,
      pageUrl: meta.pageUrl || undefined,
      siteHost: meta.siteHost || undefined,
      clipKind: meta.clipKind || undefined,
      previewSnippet: meta.previewSnippet || meta.error || undefined,
      extensionVersion: meta.extensionVersion || chrome.runtime.getManifest().version,
      turnCount: meta.turnCount,
    });
    setStatus(feedbackStatus, "已提交，感谢反馈！", "ok");
    fbContent.value = "";
  } catch (e) {
    setStatus(feedbackStatus, e.message || String(e), "err");
  }
}

async function startRegionClip() {
  const tab = await getActiveTab();
  if (!tab?.id) {
    setStatus(statusEl, "找不到当前标签页。", "err");
    return;
  }
  if (!isClipableUrl(tab.url)) {
    setStatus(statusEl, "请在普通网页上使用。", "err");
    return;
  }

  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["lib/storage.js", "lib/api.js", "lib/html2md.js", "content/region-select.js"],
    });
    setStatus(
      statusEl,
      "已进入区域摘录：在页面点击锁定区域 → 扩大/缩小 → 确认复制。可关闭本弹窗。",
      "ok",
    );
  } catch (e) {
    setStatus(statusEl, `无法启动区域摘录：${e?.message || e}`, "err");
  }
}

async function loadRegionResultIfAny() {
  const data = await chrome.storage.local.get(["clip_region_result"]);
  const result = data.clip_region_result;
  if (!result?.markdown) return;
  // only auto-load if fresh (< 2 min)
  if (result.at && Date.now() - result.at > 120000) return;
  const kind = result.clipKind || "region-select";
  const label = kind === "selection-bubble" ? "划词摘录" : "区域摘录";
  const meta = {
    ok: true,
    pageUrl: "",
    siteHost: "",
    clipKind: kind,
    previewSnippet: result.markdown.slice(0, 1500),
  };
  setResult(result.markdown, result.title || label, meta);
  let saved = false;
  if (!result.historySaved) {
    saved = Boolean(await saveCloudHistory(result.markdown, result.title || label, meta));
  }
  setStatus(
    statusEl,
    saved
      ? `已载入${label}结果，并同步云端。`
      : result.historySaved
        ? `已载入${label}结果（已同步云端）。`
        : `已载入刚才的${label}结果。`,
    "ok",
  );
  await chrome.storage.local.remove(["clip_region_result"]);
}

async function refreshHistory() {
  const box = document.getElementById("history-list");
  const historyStatus = document.getElementById("history-status");
  const { token } = await ClipStorage.getSession();
  if (!token) {
    box.innerHTML = "";
    setStatus(historyStatus, "登录后可查看并打开云端摘录历史。");
    return;
  }
  try {
    setStatus(historyStatus, "加载中…");
    const list = await ClipApi.listHistory();
    if (!list?.length) {
      box.innerHTML = '<p class="hint">暂无云端历史。摘录成功后会自动保存。</p>';
      setStatus(historyStatus, "云端历史为空。", "ok");
      return;
    }
    box.innerHTML = list
      .map(
        (item) => `
      <div class="inbox-item" data-id="${item.id}">
        <div>
          <div>${escapeHtml(item.title || "摘录")}</div>
          <div class="muted">${escapeHtml(item.siteHost || "")} · ${escapeHtml(item.clipKind || "")} · ${escapeHtml(formatTime(item.createdAt))}</div>
        </div>
        <div class="row-actions">
          <button type="button" data-open="${item.id}">打开</button>
          <button type="button" data-del="${item.id}">删除</button>
        </div>
      </div>`,
      )
      .join("");
    box.querySelectorAll("[data-open]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        try {
          const data = await ClipApi.openHistory(btn.getAttribute("data-open"));
          setResult(data.markdown, data.title || "云端历史", {
            ok: true,
            pageUrl: data.sourceUrl || "",
            siteHost: data.siteHost || "",
            clipKind: data.clipKind || "history",
            previewSnippet: (data.markdown || "").slice(0, 1500),
          });
          setStatus(historyStatus, "已打开历史记录。", "ok");
          showPanel("clip");
        } catch (e) {
          setStatus(historyStatus, e.message || String(e), "err");
        }
      });
    });
    box.querySelectorAll("[data-del]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        try {
          await ClipApi.deleteHistory(btn.getAttribute("data-del"));
          await refreshHistory();
        } catch (e) {
          setStatus(historyStatus, e.message || String(e), "err");
        }
      });
    });
    setStatus(historyStatus, `共 ${list.length} 条云端历史。`, "ok");
  } catch (e) {
    box.innerHTML = "";
    setStatus(historyStatus, e.message || String(e), "err");
  }
}

function formatTime(v) {
  if (!v) return "";
  try {
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return String(v);
    return d.toLocaleString();
  } catch {
    return String(v);
  }
}

async function applyShareResult(data) {
  const box = document.getElementById("share-result-box");
  const kindEl = document.getElementById("share-result-kind");
  shareCodeOut.value = data.shareCode || "";
  shareUrlOut.value = data.shareUrl || "";
  btnCopyShareCode.disabled = !shareCodeOut.value;
  btnCopyShareUrl.disabled = !shareUrlOut.value;
  if (box) box.classList.remove("hidden");
  if (kindEl) {
    kindEl.textContent = data.hasFile ? "文件" : "文字";
  }

  const code = (data.shareCode || "").trim();
  try {
    await navigator.clipboard.writeText(code);
    const kindHint = data.hasFile
      ? `文件传阅码 ${code} 已复制。发给对方，对方在「领取」输入即可下载（约 3 分钟 / 阅后即焚）。`
      : `文字传阅码 ${code} 已复制。发给对方，对方在「领取」输入即可查看（约 3 分钟 / 阅后即焚）。`;
    setStatus(
      shareStatus,
      data.directed
        ? `已发给 ${data.recipientEmail || "对方"}。传阅码 ${code} 已复制。`
        : kindHint,
      "ok",
    );
  } catch {
    setStatus(
      shareStatus,
      `已生成传阅码 ${code}，请点「复制码」发给对方。`,
      "ok",
    );
  }
}

async function createShare(extra = {}) {
  if (!lastMarkdown) {
    setStatus(shareStatus, "请先在「摘录」备份内容，再传阅。", "err");
    showPanel("share");
    return;
  }
  try {
    setStatus(shareStatus, "正在生成 6 位传阅码…");
    showPanel("share");
    const data = await ClipApi.createShare({
      markdown: lastMarkdown,
      title: lastTitle,
      sourceUrl: lastMeta?.pageUrl,
      siteHost: lastMeta?.siteHost,
      clipKind: lastMeta?.clipKind,
      ttlMinutes: 3,
      ...extra,
    });
    await applyShareResult(data);
  } catch (e) {
    setStatus(shareStatus, e.message || String(e), "err");
  }
}

async function createFileShare() {
  const input = document.getElementById("share-file-input");
  const file = input?.files?.[0];
  if (!file) {
    setStatus(shareStatus, "请先选择要传阅的文件。", "err");
    showPanel("share");
    return;
  }
  const max = 5 * 1024 * 1024;
  if (file.size > max) {
    setStatus(shareStatus, "文件不能超过 5MB。", "err");
    return;
  }
  try {
    setStatus(shareStatus, "正在上传并生成传阅码…");
    showPanel("share");
    const data = await ClipApi.createFileShare(file, {
      title: file.name,
      ttlMinutes: 3,
    });
    await applyShareResult(data);
    if (input) input.value = "";
    const btn = document.getElementById("btn-share-file");
    if (btn) btn.disabled = true;
  } catch (e) {
    setStatus(shareStatus, e.message || String(e), "err");
  }
}

async function shareToUser() {
  const email = (document.getElementById("share-to-email").value || "").trim();
  if (!email) {
    setStatus(shareStatus, "请填写对方注册邮箱。", "err");
    return;
  }
  const { token } = await ClipStorage.getSession();
  if (!token) {
    setStatus(shareStatus, "发给闲算用户需要先登录。", "err");
    showPanel("account");
    return;
  }
  await createShare({ recipientEmail: email });
  await refreshInbox();
}

async function refreshInbox() {
  const box = document.getElementById("share-inbox");
  const { token } = await ClipStorage.getSession();
  if (!token) {
    box.innerHTML = '<p class="hint">登录后可查看发给你的传阅。</p>';
    return;
  }
  try {
    const list = await ClipApi.inbox();
    if (!list?.length) {
      box.innerHTML = '<p class="hint">收件箱为空。</p>';
      return;
    }
    box.innerHTML = list
      .map(
        (item) => `
      <div class="inbox-item" data-id="${item.id}">
        <div>
          <div>${escapeHtml(item.title || "传阅")}</div>
          <div class="muted">来自 ${escapeHtml(item.senderEmail || "匿名")} · ${escapeHtml(item.shareCode || "")}</div>
        </div>
        <button type="button" data-open="${item.id}">打开</button>
      </div>`,
      )
      .join("");
    box.querySelectorAll("[data-open]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        try {
          const id = btn.getAttribute("data-open");
          const data = await ClipApi.openInbox(id);
          setResult(data.markdown, data.title || "收件箱", {
            ok: true,
            pageUrl: data.sourceUrl || "",
            siteHost: data.siteHost || "",
            clipKind: data.clipKind || "share-inbox",
            previewSnippet: (data.markdown || "").slice(0, 1500),
          });
          setStatus(shareStatus, "已打开收件内容。", "ok");
          showPanel("clip");
        } catch (e) {
          setStatus(shareStatus, e.message || String(e), "err");
        }
      });
    });
  } catch (e) {
    box.innerHTML = "";
    setStatus(shareStatus, e.message || String(e), "err");
  }
}

function escapeHtml(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function fetchShare() {
  const code = (shareCodeIn.value || "").replace(/\D/g, "");
  if (code.length !== 6) {
    setStatus(shareStatus, "请输入 6 位数字传阅码。", "err");
    return;
  }
  try {
    setStatus(shareStatus, "领取中…");
    const data = await ClipApi.getShare(code);
    shareCodeOut.value = data.shareCode || code;
    shareUrlOut.value = data.shareUrl || "";
    btnCopyShareCode.disabled = !shareCodeOut.value;
    btnCopyShareUrl.disabled = !shareUrlOut.value;

    if (data.hasFile) {
      setStatus(shareStatus, `收到文件「${data.fileName || "file"}」，正在下载…`);
      const { blob, fileName } = await ClipApi.downloadShareFile(data.shareCode || code);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName || data.fileName || "download.bin";
      a.click();
      URL.revokeObjectURL(url);
      setStatus(shareStatus, "文件已下载（阅后即焚，此码已作废）。", "ok");
      return;
    }

    setResult(data.markdown || "", data.title || "传阅内容", {
      ok: true,
      pageUrl: data.sourceUrl || "",
      siteHost: data.siteHost || "",
      clipKind: data.clipKind || "share-receive",
      previewSnippet: (data.markdown || "").slice(0, 1500),
    });
    setStatus(shareStatus, "已领取，内容已填入「摘录」预览（阅后即焚，此码已作废）。", "ok");
    showPanel("clip");
  } catch (e) {
    setStatus(shareStatus, e.message || String(e), "err");
  }
}

btnClip.addEventListener("click", () => runClip());
btnRegion.addEventListener("click", () => startRegionClip());
btnCopy.addEventListener("click", () => copyMarkdown());
btnDownloadMd.addEventListener("click", () => downloadMarkdown());
btnDownloadWord.addEventListener("click", () => downloadWord());
if (btnExportObsidian) btnExportObsidian.addEventListener("click", () => exportToObsidian());
if (btnExportNotion) btnExportNotion.addEventListener("click", () => exportToNotion());
if (btnShareCreate) btnShareCreate.addEventListener("click", () => createShare());
if (btnShareQuick) btnShareQuick.addEventListener("click", () => createShare());
document.getElementById("btn-share-file")?.addEventListener("click", () => createFileShare());
document.getElementById("share-file-input")?.addEventListener("change", (e) => {
  const btn = document.getElementById("btn-share-file");
  const nameEl = document.getElementById("share-file-name");
  const file = e.target.files?.[0];
  if (btn) btn.disabled = !file;
  if (nameEl) {
    nameEl.textContent = file
      ? `${file.name}（${(file.size / 1024).toFixed(1)} KB）`
      : "选择文件…";
  }
});
btnShareFetch.addEventListener("click", () => fetchShare());

if (turnList) {
  turnList.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-del]");
    if (!btn || !lastTurns) return;
    const idx = Number(btn.getAttribute("data-del"));
    if (!Number.isFinite(idx) || idx < 0 || idx >= lastTurns.length) return;
    lastTurns = lastTurns.filter((_, i) => i !== idx);
    applyTurnsEdit();
  });
}
if (btnTurnsReset) {
  btnTurnsReset.addEventListener("click", () => {
    if (!lastTurnsFull?.length) return;
    lastTurns = lastTurnsFull.map((t) => ({ ...t }));
    applyTurnsEdit();
  });
}
document.getElementById("btn-share-to-user").addEventListener("click", () => shareToUser());
document.getElementById("btn-inbox-refresh").addEventListener("click", () => refreshInbox());
btnCopyShareCode.addEventListener("click", async () => {
  if (!shareCodeOut.value) return;
  try {
    await navigator.clipboard.writeText(shareCodeOut.value);
    setStatus(shareStatus, "数字码已复制。", "ok");
  } catch {
    setStatus(shareStatus, "复制失败。", "err");
  }
});
btnCopyShareUrl.addEventListener("click", async () => {
  if (!shareUrlOut.value) return;
  try {
    await navigator.clipboard.writeText(shareUrlOut.value);
    setStatus(shareStatus, "链接已复制。", "ok");
  } catch {
    setStatus(shareStatus, "复制失败。", "err");
  }
});
document.getElementById("btn-goto-feedback")?.addEventListener("click", () => showPanel("share"));

document.getElementById("btn-history-refresh").addEventListener("click", () => refreshHistory());
btnLogin.addEventListener("click", () => doLogin());
btnRegister.addEventListener("click", () => doRegister());
btnSendCode.addEventListener("click", () => doSendCode());
btnLogout.addEventListener("click", () => doLogout());
btnToggleReg.addEventListener("click", () => setRegisterMode(!registerMode));
btnSaveApi.addEventListener("click", async () => {
  await ClipStorage.setApiBase(apiBaseInput.value);
  setStatus(accountStatus, "API 地址已保存。", "ok");
  await syncConfigFromServer();
});

// AI Summary state
let lastSummary = "";
let lastAiMeta = null;
const btnAiSummary = document.getElementById("btn-ai-summary");
const aiSummaryPreview = document.getElementById("ai-summary-preview");
const aiSummaryContent = document.getElementById("ai-summary-content");
const btnCopySummary = document.getElementById("btn-copy-summary");
const btnAppendSummary = document.getElementById("btn-append-summary");
const aiApiBaseInput = document.getElementById("ai-api-base");
const aiApiKeyInput = document.getElementById("ai-api-key");
const aiModelInput = document.getElementById("ai-model");
const btnSaveAiSettings = document.getElementById("btn-save-ai-settings");
const btnTestAi = document.getElementById("btn-test-ai");
const aiTestResult = document.getElementById("ai-test-result");
const aiSettingsStatus = document.getElementById("ai-settings-status");

async function loadAiSettings() {
  const settings = await ClipStorage.getAiSettings();
  if (aiApiBaseInput) aiApiBaseInput.value = settings.apiBase || "https://api.deepseek.com";
  if (aiModelInput) aiModelInput.value = settings.model || "deepseek-chat";
  // API Key 不显示明文，只显示是否已配置
  if (aiApiKeyInput) {
    aiApiKeyInput.value = settings.apiKey ? "••••••••" : "";
    aiApiKeyInput.dataset.hasKey = settings.apiKey ? "true" : "false";
  }
  updateAiButtonState(settings);
}

function updateAiButtonState(settings) {
  if (btnAiSummary) {
    btnAiSummary.disabled = !lastMarkdown || !settings.apiKey;
  }
}

async function generateAiSummary() {
  if (!lastMarkdown) {
    setStatus(exportStatusEl, "请先备份内容。", "err");
    return;
  }

  const settings = await ClipStorage.getAiSettings();
  if (!settings.apiKey || settings.apiKey === "••••••••") {
    setStatus(exportStatusEl, "请先配置 AI API Key（去账号页设置）", "err");
    showPanel("account");
    return;
  }

  const btn = btnAiSummary;
  const originalText = btn.textContent;
  btn.disabled = true;
  btn.textContent = "生成中...";
  lastSummary = "";

  try {
    setStatus(exportStatusEl, "正在调用 AI 生成摘要...");

    const result = await AISummary.generateSummaryWithFallback(lastMarkdown, {
      apiBase: settings.apiBase,
      apiKey: settings.apiKey,
      model: settings.model,
      meta: lastMeta,
    });

    if (result.success) {
      lastSummary = result.summary;
      if (aiSummaryContent) aiSummaryContent.textContent = lastSummary;
      if (aiSummaryPreview) aiSummaryPreview.classList.remove("hidden");
      setStatus(exportStatusEl, "摘要生成成功！", "ok");
    } else {
      setStatus(exportStatusEl, "生成失败：" + result.error, "err");
    }
  } catch (e) {
    setStatus(exportStatusEl, "生成失败：" + (e.message || e), "err");
  } finally {
    btn.disabled = false;
    btn.textContent = originalText;
  }
}

async function copySummary() {
  if (!lastSummary) return;
  try {
    await navigator.clipboard.writeText(lastSummary);
    setStatus(exportStatusEl, "摘要已复制。", "ok");
  } catch {
    setStatus(exportStatusEl, "复制失败。", "err");
  }
}

function appendSummaryToPreview() {
  if (!lastSummary || !lastMarkdown) return;
  const combined = `${lastMarkdown}\n\n---\n\n## AI 摘要\n\n${lastSummary}\n`;
  lastMarkdown = combined;
  previewEl.value = combined;
  setStatus(exportStatusEl, "摘要已追加到预览，可复制或下载。", "ok");
}

async function saveAiSettings() {
  const apiBase = aiApiBaseInput?.value?.trim() || "https://api.deepseek.com";
  let apiKey = aiApiKeyInput?.value?.trim() || "";
  // 如果输入的是占位符，保留原来的
  if (apiKey === "••••••••") {
    const settings = await ClipStorage.getAiSettings();
    apiKey = settings.apiKey;
  }
  const model = aiModelInput?.value?.trim() || "deepseek-chat";

  await ClipStorage.setAiSettings({
    apiBase,
    apiKey,
    model,
    enabled: true,
  });

  setStatus(aiSettingsStatus, "AI 设置已保存。", "ok");
  updateAiButtonState({ apiKey });
}

async function testAiConnection() {
  const apiBase = aiApiBaseInput?.value?.trim();
  let apiKey = aiApiKeyInput?.value?.trim();
  const model = aiModelInput?.value?.trim() || "deepseek-chat";

  if (apiKey === "••••••••") {
    const settings = await ClipStorage.getAiSettings();
    apiKey = settings.apiKey;
  }

  if (!apiKey) {
    setStatus(aiTestResult, "请先输入 API Key", "err");
    return;
  }

  setStatus(aiTestResult, "测试中...");
  btnTestAi.disabled = true;

  try {
    const result = await AISummary.generateSummary("你好，请回复 OK", {
      apiBase: apiBase || "https://api.deepseek.com",
      apiKey,
      model,
    });

    if (result.success) {
      setStatus(aiTestResult, "连接成功！AI 回复：" + result.summary.slice(0, 50) + "...", "ok");
    } else {
      setStatus(aiTestResult, "测试失败：" + result.error, "err");
    }
  } catch (e) {
    setStatus(aiTestResult, "测试失败：" + (e.message || e), "err");
  } finally {
    btnTestAi.disabled = false;
  }
}

setStatus(statusEl, "");
try {
  const ver = chrome.runtime.getManifest().version;
  const el = document.getElementById("app-version");
  if (el) el.textContent = `v${ver}`;
} catch {
  /* ignore */
}

refreshAccountUi();
loadAiSettings();
loadRegionResultIfAny();

// AI Summary event listeners
if (btnAiSummary) {
  btnAiSummary.addEventListener("click", () => generateAiSummary());
}
if (btnCopySummary) {
  btnCopySummary.addEventListener("click", () => copySummary());
}
if (btnAppendSummary) {
  btnAppendSummary.addEventListener("click", () => appendSummaryToPreview());
}
if (btnSaveAiSettings) {
  btnSaveAiSettings.addEventListener("click", () => saveAiSettings());
}
if (btnTestAi) {
  btnTestAi.addEventListener("click", () => testAiConnection());
}
document.getElementById("btn-goto-ai-settings")?.addEventListener("click", () => showPanel("account"));
