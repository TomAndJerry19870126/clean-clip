/**
 * Fixed launcher icon on every page — opens the detached (pinned) extension window.
 */
(function () {
  const NS = "__CLEAN_MD_FIXED_LAUNCHER__";
  if (window[NS]) return;
  window[NS] = true;

  const ROOT_ID = "cleanmd-fixed-launcher";
  const STYLE_ID = "cleanmd-fixed-launcher-style";

  function ensureStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      #${ROOT_ID} {
        all: initial;
        position: fixed;
        right: 18px;
        bottom: 88px;
        z-index: 2147483645;
        width: 48px;
        height: 48px;
        margin: 0;
        padding: 0;
        border: 1px solid rgba(0, 122, 255, 0.35);
        border-radius: 14px;
        cursor: pointer;
        background: #ffffff;
        box-shadow: 0 8px 24px rgba(15, 23, 42, 0.18);
        display: flex;
        align-items: center;
        justify-content: center;
        transition: transform 0.12s ease, box-shadow 0.12s ease;
      }
      #${ROOT_ID}:hover {
        transform: scale(1.06);
        box-shadow: 0 10px 28px rgba(0, 122, 255, 0.28);
      }
      #${ROOT_ID} img {
        width: 30px;
        height: 30px;
        border-radius: 8px;
        display: block;
        pointer-events: none;
        background: #fff;
      }
      #${ROOT_ID}.dragging {
        opacity: 0.85;
        cursor: grabbing;
      }
    `;
    document.documentElement.appendChild(style);
  }

  function openFixedPopup() {
    try {
      chrome.runtime.sendMessage({ type: "OPEN_FIXED_POPUP" }, () => {
        void chrome.runtime.lastError;
      });
    } catch {
      /* ignore */
    }
  }

  function mount() {
    if (document.getElementById(ROOT_ID)) return;
    ensureStyle();
    const btn = document.createElement("button");
    btn.id = ROOT_ID;
    btn.type = "button";
    btn.title = "打开干净摘录（固定窗口）";
    btn.setAttribute("aria-label", "打开干净摘录固定窗口");
    const img = document.createElement("img");
    try {
      img.src = chrome.runtime.getURL("icons/logo.png");
    } catch {
      /* ignore */
    }
    img.alt = "";
    btn.appendChild(img);

    let dragMoved = false;
    let startX = 0;
    let startY = 0;
    let origRight = 18;
    let origBottom = 88;

    btn.addEventListener("mousedown", (e) => {
      if (e.button !== 0) return;
      dragMoved = false;
      startX = e.clientX;
      startY = e.clientY;
      const rect = btn.getBoundingClientRect();
      origRight = window.innerWidth - rect.right;
      origBottom = window.innerHeight - rect.bottom;
      btn.classList.add("dragging");

      const onMove = (ev) => {
        const dx = ev.clientX - startX;
        const dy = ev.clientY - startY;
        if (Math.abs(dx) + Math.abs(dy) > 4) dragMoved = true;
        const right = Math.min(
          Math.max(8, origRight - dx),
          window.innerWidth - 56,
        );
        const bottom = Math.min(
          Math.max(8, origBottom - dy),
          window.innerHeight - 56,
        );
        btn.style.right = `${Math.round(right)}px`;
        btn.style.bottom = `${Math.round(bottom)}px`;
        btn.style.left = "auto";
        btn.style.top = "auto";
      };
      const onUp = () => {
        document.removeEventListener("mousemove", onMove, true);
        document.removeEventListener("mouseup", onUp, true);
        btn.classList.remove("dragging");
      };
      document.addEventListener("mousemove", onMove, true);
      document.addEventListener("mouseup", onUp, true);
    });

    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (dragMoved) return;
      openFixedPopup();
    });

    document.documentElement.appendChild(btn);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount);
  } else {
    mount();
  }
})();
