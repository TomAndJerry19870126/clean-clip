/**
 * Interactive region clip: hover → click lock → expand/shrink → confirm → Markdown.
 * Runs in page; popup closes after launch. Result saved to chrome.storage + clipboard.
 */
(function () {
  const NS = "__CLEAN_CLIP_REGION__";
  if (window[NS] && typeof window[NS].restart === "function") {
    window[NS].restart();
    return;
  }

  const STYLE_ID = "clean-clip-region-style";
  const ROOT_ID = "clean-clip-region-root";

  let locked = null;
  let hoverEl = null;
  let stack = [];
  let active = false;

  function ensureStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      #${ROOT_ID} { all: initial; }
      #${ROOT_ID} * { box-sizing: border-box; font-family: "Segoe UI","PingFang SC","Microsoft YaHei",sans-serif; }
      #${ROOT_ID} .ccr-mask {
        position: fixed; inset: 0; z-index: 2147483645;
        cursor: crosshair; background: transparent;
      }
      #${ROOT_ID} .ccr-box {
        position: fixed; z-index: 2147483646; pointer-events: none;
        border: 2px solid #0f766e; background: rgba(15,118,110,0.12);
        box-shadow: 0 0 0 9999px rgba(15,23,42,0.35);
        border-radius: 4px; transition: top .05s,left .05s,width .05s,height .05s;
      }
      #${ROOT_ID} .ccr-box.locked {
        border-color: #ea580c; background: rgba(234,88,12,0.10);
        box-shadow: 0 0 0 9999px rgba(15,23,42,0.45);
      }
      #${ROOT_ID} .ccr-handle {
        position: absolute; width: 10px; height: 10px; background: #fff;
        border: 2px solid #ea580c; border-radius: 2px; pointer-events: none;
      }
      #${ROOT_ID} .ccr-handle.tl { top: -6px; left: -6px; }
      #${ROOT_ID} .ccr-handle.tr { top: -6px; right: -6px; }
      #${ROOT_ID} .ccr-handle.bl { bottom: -6px; left: -6px; }
      #${ROOT_ID} .ccr-handle.br { bottom: -6px; right: -6px; }
      #${ROOT_ID} .ccr-bar {
        position: fixed; z-index: 2147483647; left: 50%; transform: translateX(-50%);
        bottom: 24px; display: flex; flex-wrap: wrap; gap: 8px; align-items: center;
        padding: 10px 12px; background: #1c1917; color: #fafaf9;
        border-radius: 12px; box-shadow: 0 12px 40px rgba(0,0,0,.35);
        max-width: min(560px, calc(100vw - 24px));
      }
      #${ROOT_ID} .ccr-bar button {
        border: none; border-radius: 8px; padding: 7px 12px; font-size: 12px;
        cursor: pointer; background: #44403c; color: #fff;
      }
      #${ROOT_ID} .ccr-bar button:hover { filter: brightness(1.08); }
      #${ROOT_ID} .ccr-bar button.primary { background: #0f766e; font-weight: 600; }
      #${ROOT_ID} .ccr-bar button:disabled { opacity: .4; cursor: not-allowed; }
      #${ROOT_ID} .ccr-hint {
        width: 100%; font-size: 11px; color: #a8a29e; line-height: 1.4;
      }
      #${ROOT_ID} .ccr-toast {
        position: fixed; z-index: 2147483647; top: 20px; left: 50%; transform: translateX(-50%);
        background: #0f766e; color: #fff; padding: 10px 16px; border-radius: 10px;
        font-size: 13px; box-shadow: 0 8px 24px rgba(0,0,0,.25);
      }
    `;
    document.documentElement.appendChild(style);
  }

  function removeUi() {
    document.getElementById(ROOT_ID)?.remove();
  }

  function toast(msg) {
    const root = document.getElementById(ROOT_ID);
    if (!root) return;
    const old = root.querySelector(".ccr-toast");
    if (old) old.remove();
    const el = document.createElement("div");
    el.className = "ccr-toast";
    el.textContent = msg;
    root.appendChild(el);
    setTimeout(() => el.remove(), 2200);
  }

  function isOurUi(el) {
    return el && (el.id === ROOT_ID || el.closest?.(`#${ROOT_ID}`));
  }

  function pickElement(x, y) {
    const stackEls = document.elementsFromPoint(x, y);
    for (const el of stackEls) {
      if (isOurUi(el)) continue;
      if (el === document.documentElement || el === document.body) continue;
      if (el.nodeType !== 1) continue;
      return el;
    }
    return null;
  }

  function paintBox(el, lockedMode) {
    const root = document.getElementById(ROOT_ID);
    if (!root || !el) return;
    let box = root.querySelector(".ccr-box");
    if (!box) {
      box = document.createElement("div");
      box.className = "ccr-box";
      ["tl", "tr", "bl", "br"].forEach((pos) => {
        const h = document.createElement("div");
        h.className = `ccr-handle ${pos}`;
        box.appendChild(h);
      });
      root.appendChild(box);
    }
    const r = el.getBoundingClientRect();
    box.classList.toggle("locked", !!lockedMode);
    box.style.top = `${Math.max(0, r.top)}px`;
    box.style.left = `${Math.max(0, r.left)}px`;
    box.style.width = `${Math.max(0, r.width)}px`;
    box.style.height = `${Math.max(0, r.height)}px`;
  }

  function meaningfulParent(el) {
    let p = el?.parentElement;
    while (p && p !== document.body && p !== document.documentElement) {
      const pr = p.getBoundingClientRect();
      const er = el.getBoundingClientRect();
      if (pr.width * pr.height > er.width * er.height * 1.05) return p;
      if (p.childElementCount > 1) return p;
      p = p.parentElement;
    }
    return el?.parentElement && el.parentElement !== document.documentElement ? el.parentElement : null;
  }

  function bestChild(el) {
    if (!el) return null;
    const kids = Array.from(el.children).filter((c) => {
      if (isOurUi(c)) return false;
      const tag = c.tagName.toLowerCase();
      if (["script", "style", "svg", "noscript"].includes(tag)) return false;
      const t = (c.innerText || "").trim();
      return t.length >= 20 || c.querySelector("img, pre, table, p, article");
    });
    if (!kids.length) return null;
    kids.sort((a, b) => {
      const ta = (a.innerText || "").length;
      const tb = (b.innerText || "").length;
      return tb - ta;
    });
    return kids[0];
  }

  function expand() {
    if (!locked) return;
    const parent = meaningfulParent(locked);
    if (!parent || parent === locked) {
      toast("已到最大区域");
      return;
    }
    stack.push(locked);
    locked = parent;
    paintBox(locked, true);
    updateBar();
  }

  function shrink() {
    if (!locked) return;
    if (stack.length) {
      locked = stack.pop();
      paintBox(locked, true);
      updateBar();
      return;
    }
    const child = bestChild(locked);
    if (!child || child === locked) {
      toast("已到最小区域");
      return;
    }
    locked = child;
    paintBox(locked, true);
    updateBar();
  }

  function cleanClone(el) {
    const clone = el.cloneNode(true);
    clone
      .querySelectorAll(
        "script,style,noscript,iframe,button,nav,aside,[class*='advert'],[id*='ad-']"
      )
      .forEach((n) => n.remove());
    return clone;
  }

  async function confirm() {
    if (!locked) {
      toast("请先点击锁定区域");
      return;
    }
    if (!window.ZhihuClipHtml2Md) {
      toast("转换库未加载，请从插件重新点「区域摘录」");
      return;
    }

    const body = window.ZhihuClipHtml2Md.htmlToMarkdown(cleanClone(locked)).trim();
    if (!body) {
      toast("选区内没有可用文本");
      return;
    }

    const title =
      (document.title || "").split(/[-_|–—]/)[0].trim() || "区域摘录";
    const markdown = [`# ${title}`, "", `- 来源：${location.href}`, `- 方式：区域摘录`, "", body, ""].join(
      "\n"
    );

    try {
      await navigator.clipboard.writeText(markdown);
    } catch {
      /* ignore */
    }

    let historySaved = false;
    try {
      if (typeof ClipStorage !== "undefined" && typeof ClipApi !== "undefined") {
        const { token } = await ClipStorage.getSession();
        if (token) {
          await ClipApi.saveHistory({
            markdown,
            title,
            sourceUrl: location.href,
            siteHost: location.hostname,
            clipKind: "region-select",
          });
          historySaved = true;
        }
      }
    } catch {
      /* ignore cloud errors */
    }

    await chrome.storage.local.set({
      clip_last_meta: {
        ok: true,
        pageUrl: location.href,
        siteHost: location.hostname,
        clipKind: "region-select",
        previewSnippet: markdown.slice(0, 1500),
      },
      clip_region_result: {
        markdown,
        title,
        at: Date.now(),
        historySaved,
        clipKind: "region-select",
      },
    });
    toast(historySaved ? "已复制并同步云端 · 可打开插件查看预览" : "已复制 Markdown · 可再打开插件查看预览");
    stop();
  }

  function updateBar() {
    const root = document.getElementById(ROOT_ID);
    const confirmBtn = root?.querySelector("[data-act=confirm]");
    const expandBtn = root?.querySelector("[data-act=expand]");
    const shrinkBtn = root?.querySelector("[data-act=shrink]");
    if (confirmBtn) confirmBtn.disabled = !locked;
    if (expandBtn) expandBtn.disabled = !locked;
    if (shrinkBtn) shrinkBtn.disabled = !locked;
    const hint = root?.querySelector(".ccr-hint");
    if (hint) {
      hint.textContent = locked
        ? "已锁定 · 点「扩大/缩小」调整选区 · Enter 确认 · Esc 取消"
        : "移动鼠标选择区域 · 单击锁定 · Esc 取消";
    }
  }

  function buildUi() {
    removeUi();
    ensureStyle();
    const root = document.createElement("div");
    root.id = ROOT_ID;
    root.innerHTML = `
      <div class="ccr-mask"></div>
      <div class="ccr-bar">
        <span class="ccr-hint"></span>
        <button type="button" data-act="expand">扩大选区</button>
        <button type="button" data-act="shrink">缩小选区</button>
        <button type="button" class="primary" data-act="confirm" disabled>确认复制</button>
        <button type="button" data-act="cancel">取消</button>
      </div>
    `;
    document.documentElement.appendChild(root);
    updateBar();

    const mask = root.querySelector(".ccr-mask");
    mask.addEventListener(
      "mousemove",
      (e) => {
        if (locked) return;
        const el = pickElement(e.clientX, e.clientY);
        hoverEl = el;
        if (el) paintBox(el, false);
      },
      true
    );

    mask.addEventListener(
      "click",
      (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (locked) return;
        const el = pickElement(e.clientX, e.clientY);
        if (!el) return;
        locked = el;
        stack = [];
        paintBox(locked, true);
        updateBar();
      },
      true
    );

    root.querySelector("[data-act=expand]").addEventListener("click", (e) => {
      e.stopPropagation();
      expand();
    });
    root.querySelector("[data-act=shrink]").addEventListener("click", (e) => {
      e.stopPropagation();
      shrink();
    });
    root.querySelector("[data-act=confirm]").addEventListener("click", (e) => {
      e.stopPropagation();
      confirm();
    });
    root.querySelector("[data-act=cancel]").addEventListener("click", (e) => {
      e.stopPropagation();
      stop();
    });
  }

  function onKey(e) {
    if (!active) return;
    if (e.key === "Escape") {
      e.preventDefault();
      stop();
    } else if (e.key === "Enter" && locked) {
      e.preventDefault();
      confirm();
    } else if ((e.key === "ArrowUp" || e.key === "+") && locked) {
      e.preventDefault();
      expand();
    } else if ((e.key === "ArrowDown" || e.key === "-") && locked) {
      e.preventDefault();
      shrink();
    }
  }

  function onScroll() {
    if (locked) paintBox(locked, true);
    else if (hoverEl) paintBox(hoverEl, false);
  }

  function start() {
    active = true;
    locked = null;
    hoverEl = null;
    stack = [];
    buildUi();
    document.addEventListener("keydown", onKey, true);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll, true);
    toast("区域摘录：点击锁定，可扩大/缩小");
  }

  function stop() {
    active = false;
    locked = null;
    hoverEl = null;
    stack = [];
    document.removeEventListener("keydown", onKey, true);
    window.removeEventListener("scroll", onScroll, true);
    window.removeEventListener("resize", onScroll, true);
    removeUi();
  }

  function restart() {
    stop();
    start();
  }

  window[NS] = { start, stop, restart };
  start();
})();
