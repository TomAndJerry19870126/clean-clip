/**
 * chrome.storage helpers for clean-clip.
 */
const ClipStorage = (() => {
  const KEYS = {
    apiBase: "clip_api_base",
    token: "clip_token",
    user: "clip_user",
    lastClipMeta: "clip_last_meta",
    // AI Summary settings
    aiApiBase: "clip_ai_api_base",
    aiApiKey: "clip_ai_api_key",
    aiModel: "clip_ai_model",
    aiEnabled: "clip_ai_enabled",
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

  // AI Summary methods
  async function getAiSettings() {
    const data = await get([KEYS.aiApiBase, KEYS.aiApiKey, KEYS.aiModel, KEYS.aiEnabled]);
    return {
      apiBase: data[KEYS.aiApiBase] || "https://api.deepseek.com",
      apiKey: data[KEYS.aiApiKey] || "",
      model: data[KEYS.aiModel] || "deepseek-chat",
      enabled: data[KEYS.aiEnabled] !== false, // Default enabled
    };
  }

  async function setAiSettings(settings) {
    await set({
      [KEYS.aiApiBase]: (settings.apiBase || "https://api.deepseek.com").replace(/\/$/, ""),
      [KEYS.aiApiKey]: settings.apiKey || "",
      [KEYS.aiModel]: settings.model || "deepseek-chat",
      [KEYS.aiEnabled]: settings.enabled !== false,
    });
  }

  async function isAiEnabled() {
    const data = await get([KEYS.aiEnabled, KEYS.aiApiKey]);
    return data[KEYS.aiEnabled] !== false && !!data[KEYS.aiApiKey];
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
    getAiSettings,
    setAiSettings,
    isAiEnabled,
  };
})();
