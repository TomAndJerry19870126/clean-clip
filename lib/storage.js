/**
 * chrome.storage helpers for clean-clip.
 */
const ClipStorage = (() => {
  const KEYS = {
    apiBase: "clip_api_base",
    token: "clip_token",
    user: "clip_user",
    lastClipMeta: "clip_last_meta",
  };

  async function get(keys) {
    return chrome.storage.local.get(keys);
  }

  async function set(obj) {
    return chrome.storage.local.set(obj);
  }

  async function getApiBase() {
    const data = await get([KEYS.apiBase]);
    return (data[KEYS.apiBase] || "https://www.xiansuan.top").replace(/\/$/, "");
  }

  async function setApiBase(url) {
    await set({ [KEYS.apiBase]: (url || "").trim().replace(/\/$/, "") });
  }

  async function getSession() {
    const data = await get([KEYS.token, KEYS.user]);
    return { token: data[KEYS.token] || "", user: data[KEYS.user] || null };
  }

  async function setSession(token, user) {
    await set({ [KEYS.token]: token || "", [KEYS.user]: user || null });
  }

  async function clearSession() {
    await set({ [KEYS.token]: "", [KEYS.user]: null });
  }

  async function setLastClipMeta(meta) {
    await set({ [KEYS.lastClipMeta]: meta || null });
  }

  async function getLastClipMeta() {
    const data = await get([KEYS.lastClipMeta]);
    return data[KEYS.lastClipMeta] || null;
  }

  return {
    KEYS,
    getApiBase,
    setApiBase,
    getSession,
    setSession,
    clearSession,
    setLastClipMeta,
    getLastClipMeta,
  };
})();
