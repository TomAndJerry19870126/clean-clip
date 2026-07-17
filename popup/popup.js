const statusEl = document.getElementById("status");
const previewEl = document.getElementById("preview");
const btnClip = document.getElementById("btn-clip");
const btnRegion = document.getElementById("btn-region");
const btnCopy = document.getElementById("btn-copy");
const btnDownloadMd = document.getElementById("btn-download-md");
const btnDownloadWord = document.getElementById("btn-download-word");
const btnDownloadExcel = document.getElementById("btn-download-excel");
const btnShareCreate = document.getElementById("btn-share-create");
const crashHint = document.getElementById("crash-hint");
const trialBadge = document.getElementById("trial-badge");

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
let registerMode = false;

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

async function refreshTrialBadge() {
  const st = await ClipStorage.getTrialStatus();
  trialBadge.classList.remove("warn", "ok");
  if (st.loggedIn) {
    trialBadge.textContent = "已登录";
    trialBadge.classList.add("ok");
    trialBadge.classList.remove("hidden");
    return;
  }
  trialBadge.textContent = "";
  trialBadge.classList.add("hidden");
}

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

function setResult(markdown, title, meta) {
  lastMarkdown = markdown || "";
  lastTitle = (title || "cleanmd").replace(/[\\/:*?"<>|]/g, "_").slice(0, 80);
  lastMeta = meta || null;
  previewEl.value = lastMarkdown;
  const has = Boolean(lastMarkdown);
  btnCopy.disabled = !has;
  btnDownloadMd.disabled = !has;
  btnDownloadWord.disabled = !has;
  btnDownloadExcel.disabled = !has;
  btnShareCreate.disabled = !has;
  const btnShareToUser = document.getElementById("btn-share-to-user");
  if (btnShareToUser) btnShareToUser.disabled = !has;
  crashHint.classList.toggle("hidden", !has);
  if (meta) ClipStorage.setLastClipMeta(meta);
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
        if (window.__ZHIHU_CLEAN_CLIP_READY__) {
          return await window.__ZHIHU_CLEAN_CLIP_READY__;
        }
        return window.__ZHIHU_CLEAN_CLIP__;
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
    };
    setResult(result.markdown, result.title, meta);

    const saved = await saveCloudHistory(result.markdown, result.title, meta);
    const cloudNote = saved ? " · 已同步云端" : "";
    setStatus(statusEl, `完成（${result.kind}）· ${result.markdown.length} 字符${cloudNote}`, "ok");
    await refreshTrialBadge();
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

function downloadExcel() {
  if (!lastMarkdown) return;
  const { tableCount } = ClipExport.downloadExcel(lastMarkdown, lastTitle || "cleanmd");
  setStatus(
    statusEl,
    tableCount
      ? `已开始下载 Excel（.xls，含 ${tableCount} 张表）。`
      : "已开始下载 Excel（.xls）；未检测到表格，已按正文逐行导出。",
    "ok",
  );
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
    accountName.textContent = user.displayName
      ? `昵称：${user.displayName}`
      : `余额：${user.creditsBalance ?? "-"} CR`;
    setStatus(accountStatus, "已登录 · 摘录会同步到云端历史。", "ok");
    fbEmail.value = user.email || "";
    await refreshTrialBadge();
    return;
  }
  accountLoggedIn.classList.add("hidden");
  accountForms.classList.remove("hidden");
  setStatus(accountStatus, "登录后可同步云端历史与传阅收件箱。");
  await syncConfigFromServer();
  await refreshTrialBadge();
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
  const lines = [
    meta.ok === false ? "摘录失败/不理想" : "摘录结果需要改进",
    `站点：${meta.siteHost || ""}`,
    `类型：${meta.clipKind || ""}`,
    `URL：${meta.pageUrl || ""}`,
    meta.error ? `错误：${meta.error}` : "",
    "",
    "问题描述：",
    "",
  ].filter((x, i, a) => x !== "" || a[i - 1] !== "");
  fbContent.value = lines.join("\n");
  setStatus(feedbackStatus, "已填入上次摘录信息，请补充具体问题后提交。", "ok");
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
      files: ["lib/html2md.js", "content/region-select.js"],
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
  await refreshTrialBadge();
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

async function createShare(extra = {}) {
  if (!lastMarkdown) {
    setStatus(shareStatus, "请先摘录或领取内容。", "err");
    showPanel("share");
    return;
  }
  try {
    setStatus(shareStatus, "正在生成传阅…");
    showPanel("share");
    const data = await ClipApi.createShare({
      markdown: lastMarkdown,
      title: lastTitle,
      sourceUrl: lastMeta?.pageUrl,
      siteHost: lastMeta?.siteHost,
      clipKind: lastMeta?.clipKind,
      ttlHours: 24,
      ...extra,
    });
    shareCodeOut.value = data.shareCode || "";
    shareUrlOut.value = data.shareUrl || "";
    btnCopyShareCode.disabled = !shareCodeOut.value;
    btnCopyShareUrl.disabled = !shareUrlOut.value;
    const directed = data.directed
      ? `已发给 ${data.recipientEmail || "对方"}，对方可在收件箱查看。`
      : "可把口令或链接发给任何人。";
    setStatus(
      shareStatus,
      `口令 ${data.shareCode}（约 24 小时有效）。${directed}`,
      "ok",
    );
    try {
      const tip = data.directed
        ? `【干净摘录】发给你的内容，口令 ${data.shareCode}\n${data.shareUrl || ""}`
        : `【干净摘录】口令 ${data.shareCode}\n${data.shareUrl || ""}`;
      await navigator.clipboard.writeText(tip.trim());
    } catch {
      /* ignore */
    }
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
  const code = (shareCodeIn.value || "").trim();
  if (code.length < 4) {
    setStatus(shareStatus, "请输入有效口令。", "err");
    return;
  }
  try {
    setStatus(shareStatus, "领取中…");
    const data = await ClipApi.getShare(code);
    setResult(data.markdown, data.title || "传阅领取", {
      ok: true,
      pageUrl: data.sourceUrl || "",
      siteHost: data.siteHost || "",
      clipKind: data.clipKind || "share-receive",
      previewSnippet: (data.markdown || "").slice(0, 1500),
    });
    shareCodeOut.value = data.shareCode || code;
    shareUrlOut.value = data.shareUrl || "";
    btnCopyShareCode.disabled = !shareCodeOut.value;
    btnCopyShareUrl.disabled = !shareUrlOut.value;
    setStatus(shareStatus, "已领取并填入预览，可复制或下载。", "ok");
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
btnDownloadExcel.addEventListener("click", () => downloadExcel());
btnShareCreate.addEventListener("click", () => createShare());
btnShareFetch.addEventListener("click", () => fetchShare());
document.getElementById("btn-share-to-user").addEventListener("click", () => shareToUser());
document.getElementById("btn-inbox-refresh").addEventListener("click", () => refreshInbox());
btnCopyShareCode.addEventListener("click", async () => {
  if (!shareCodeOut.value) return;
  try {
    await navigator.clipboard.writeText(shareCodeOut.value);
    setStatus(shareStatus, "口令已复制。", "ok");
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
document.getElementById("btn-goto-crash").addEventListener("click", async () => {
  showPanel("feedback");
  await fillCrashForm();
});
document.getElementById("btn-fill-crash").addEventListener("click", () => fillCrashForm());
document.getElementById("btn-feedback").addEventListener("click", () => submitFeedback());

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
  await refreshTrialBadge();
});

setStatus(statusEl, "");
try {
  const ver = chrome.runtime.getManifest().version;
  const el = document.getElementById("app-version");
  if (el) el.textContent = `v${ver}`;
} catch {
  /* ignore */
}
refreshAccountUi();
refreshTrialBadge();
loadRegionResultIfAny();
