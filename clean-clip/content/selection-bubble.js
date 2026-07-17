/**
 * Selection bubble: after mouse-selecting text, show CleanMD icon near the caret.
 * Click → convert selection HTML to Markdown → clipboard + chrome.storage.
 */
(function () {
  const NS = "__CLEAN_MD_SELECTION_BUBBLE__";
  if (window[NS]) return;
  window[NS] = true;

  const ROOT_ID = "cleanmd-sel-bubble-root";
  const STYLE_ID = "cleanmd-sel-bubble-style";
  const MIN_CHARS = 2;

  let lastMouse = { x: 0, y: 0 };
  let hideTimer = null;

  function ensureStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      #${ROOT_ID} {
        all: initial;
        position: fixed;
        z-index: 2147483646;
        display: none;
        width: 36px;
        height: 36px;
        margin: 0;
        padding: 0;
        border: 1px solid rgba(0, 122, 255, 0.28);
        border-radius: 10px;
        cursor: pointer;
        background: #ffffff;
        box-shadow: 0 4px 14px rgba(15, 23, 42, 0.14), 0 0 0 1px rgba(0, 122, 255, 0.06);
        align-items: center;
        justify-content: center;
        transition: transform 0.12s ease, box-shadow 0.12s ease;
      }
      #${ROOT_ID}.visible { display: flex; }
      #${ROOT_ID}:hover {
        transform: scale(1.06);
        border-color: rgba(0, 122, 255, 0.5);
        box-shadow: 0 6px 18px rgba(0, 122, 255, 0.22), 0 2px 8px rgba(0,0,0,0.1);
      }
      #${ROOT_ID} img {
        width: 32px;
        height: 32px;
        border-radius: 6px;
        pointer-events: none;
        display: block;
        background: #fff;
      }
      #${ROOT_ID}-toast {
        all: initial;
        position: fixed;
        z-index: 2147483647;
        left: 50%;
        top: 20px;
        transform: translateX(-50%);
        background: #0a2540;
        color: #fff;
        font-family: "SF Pro Text", "PingFang SC", "Segoe UI", sans-serif;
        font-size: 13px;
        padding: 10px 16px;
        border-radius: 10px;
        box-shadow: 0 8px 24px rgba(0,0,0,0.2);
        pointer-events: none;
      }
    `;
    document.documentElement.appendChild(style);
  }

  function getBubble() {
    let btn = document.getElementById(ROOT_ID);
    if (btn) return btn;
    ensureStyle();
    btn = document.createElement("button");
    btn.id = ROOT_ID;
    btn.type = "button";
    btn.title = "干净摘录 · CleanMD";
    btn.setAttribute("aria-label", "摘录选中内容");
    const img = document.createElement("img");
    try {
      img.src = chrome.runtime.getURL("icons/logo.png");
    } catch {
      img.alt = "MD";
    }
    img.alt = "";
    btn.appendChild(img);
    btn.addEventListener("mousedown", (e) => {
      // keep selection while clicking the bubble
      e.preventDefault();
      e.stopPropagation();
    });
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      clipSelection();
    });
    document.documentElement.appendChild(btn);
    return btn;
  }

  function toast(msg) {
    document.getElementById(`${ROOT_ID}-toast`)?.remove();
    const el = document.createElement("div");
    el.id = `${ROOT_ID}-toast`;
    el.textContent = msg;
    document.documentElement.appendChild(el);
    setTimeout(() => el.remove(), 2000);
  }

  function isEditableTarget(el) {
    if (!el || el.nodeType !== 1) return false;
    const tag = el.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
    if (el.isContentEditable) return true;
    return !!el.closest?.("input, textarea, [contenteditable='true']");
  }

  function isOurUi(el) {
    return !!(el && (el.id === ROOT_ID || el.closest?.(`#${ROOT_ID}`) || el.id === "clean-clip-region-root"));
  }

  function regionModeActive() {
    return !!document.getElementById("clean-clip-region-root");
  }

  function getSelectionInfo() {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || sel.rangeCount < 1) return null;
    const text = (sel.toString() || "").replace(/\s+/g, " ").trim();
    if (text.length < MIN_CHARS) return null;
    const range = sel.getRangeAt(0);
    return { sel, range, text };
  }

  function hideBubble() {
    const btn = document.getElementById(ROOT_ID);
    if (btn) btn.classList.remove("visible");
  }

  function positionBubble(clientX, clientY) {
    const btn = getBubble();
    const size = 36;
    const pad = 8;
    const offset = 10; // bottom-right of mouse anchor
    // Anchor = mouse; place icon at its bottom-right
    let x = (clientX ?? lastMouse.x) + offset;
    let y = (clientY ?? lastMouse.y) + offset;
    x = Math.min(Math.max(pad, x), window.innerWidth - size - pad);
    y = Math.min(Math.max(pad, y), window.innerHeight - size - pad);
    btn.style.left = `${Math.round(x)}px`;
    btn.style.top = `${Math.round(y)}px`;
    btn.classList.add("visible");
  }

  function scheduleShow(clientX, clientY) {
    if (hideTimer) {
      clearTimeout(hideTimer);
      hideTimer = null;
    }
    // slight delay so selection settles
    hideTimer = setTimeout(() => {
      if (regionModeActive()) {
        hideBubble();
        return;
      }
      const info = getSelectionInfo();
      if (!info) {
        hideBubble();
        return;
      }
      positionBubble(clientX ?? lastMouse.x, clientY ?? lastMouse.y);
    }, 10);
  }

  function selectionHtml(range) {
    const frag = range.cloneContents();
    const wrap = document.createElement("div");
    wrap.appendChild(frag);
    return wrap;
  }

  async function clipSelection() {
    const info = getSelectionInfo();
    if (!info) {
      hideBubble();
      toast("没有选中内容");
      return;
    }
    if (!window.ZhihuClipHtml2Md) {
      toast("转换库未加载，请刷新页面后再试");
      return;
    }

    const wrap = selectionHtml(info.range);
    // strip scripts / our bubble if any
    wrap.querySelectorAll("script, style, svg").forEach((n) => n.remove());
    let body = window.ZhihuClipHtml2Md.htmlToMarkdown(wrap).trim();
    if (!body) {
      body = info.text;
    }
    if (!body) {
      toast("选区为空");
      return;
    }

    const title =
      (document.title || "").split(/[-_|–—]/)[0].trim() || "选区摘录";
    const markdown = [
      `# ${title}`,
      "",
      `- 来源：${location.href}`,
      `- 方式：划词摘录`,
      "",
      body,
      "",
    ].join("\n");

    try {
      await navigator.clipboard.writeText(markdown);
    } catch {
      /* ignore */
    }

    const meta = {
      ok: true,
      pageUrl: location.href,
      siteHost: location.hostname,
      clipKind: "selection-bubble",
      previewSnippet: markdown.slice(0, 1500),
    };

    let historySaved = false;
    try {
      if (typeof ClipStorage !== "undefined" && typeof ClipApi !== "undefined") {
        const { token } = await ClipStorage.getSession();
        if (token) {
          await ClipApi.saveHistory({
            markdown,
            title,
            sourceUrl: meta.pageUrl,
            siteHost: meta.siteHost,
            clipKind: meta.clipKind,
          });
          historySaved = true;
        }
      }
    } catch {
      /* ignore cloud errors */
    }

    try {
      await chrome.storage.local.set({
        clip_last_meta: meta,
        clip_region_result: {
          markdown,
          title,
          at: Date.now(),
          historySaved,
          clipKind: "selection-bubble",
        },
      });
    } catch {
      /* ignore */
    }

    hideBubble();
    toast(historySaved ? "已摘录并同步云端" : "已摘录并复制 Markdown");
  }

  document.addEventListener(
    "mousemove",
    (e) => {
      lastMouse = { x: e.clientX, y: e.clientY };
    },
    true,
  );

  document.addEventListener(
    "mouseup",
    (e) => {
      if (e.button !== 0) return;
      if (isOurUi(e.target)) return;
      if (regionModeActive()) return;
      lastMouse = { x: e.clientX, y: e.clientY };
      // Don't show bubble when selecting inside form fields (optional UX)
      if (isEditableTarget(e.target)) {
        hideBubble();
        return;
      }
      scheduleShow(e.clientX, e.clientY);
    },
    true,
  );

  document.addEventListener(
    "mousedown",
    (e) => {
      if (isOurUi(e.target)) return;
      hideBubble();
    },
    true,
  );

  document.addEventListener(
    "keydown",
    (e) => {
      if (e.key === "Escape") hideBubble();
    },
    true,
  );

  document.addEventListener(
    "scroll",
    () => {
      hideBubble();
    },
    true,
  );

  window.addEventListener("resize", hideBubble);
})();
