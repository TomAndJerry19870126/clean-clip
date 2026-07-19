/**
 * Keep a detached popup window (固定弹出框) that does not close when the page is clicked.
 */
const FIXED_POPUP_PATH = "popup/popup.html?fixed=1";

let fixedWindowId = null;

async function openFixedPopup() {
  if (fixedWindowId != null) {
    try {
      await chrome.windows.update(fixedWindowId, { focused: true });
      return { ok: true, reused: true };
    } catch {
      fixedWindowId = null;
    }
  }

  const win = await chrome.windows.create({
    url: chrome.runtime.getURL(FIXED_POPUP_PATH),
    type: "popup",
    width: 420,
    height: 740,
    focused: true,
  });
  fixedWindowId = win?.id ?? null;
  return { ok: true, reused: false };
}

chrome.windows.onRemoved.addListener((id) => {
  if (id === fixedWindowId) fixedWindowId = null;
});

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === "OPEN_FIXED_POPUP") {
    openFixedPopup()
      .then((r) => sendResponse(r))
      .catch((e) => sendResponse({ ok: false, error: e?.message || String(e) }));
    return true;
  }
  return false;
});
