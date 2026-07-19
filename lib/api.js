/**
 * XianSuan API client for clean-clip.
 */
const ClipApi = (() => {
  async function request(path, { method = "POST", body, auth = true } = {}) {
    const base = await ClipStorage.getApiBase();
    const headers = {
      "Content-Type": "application/json",
      Accept: "application/json",
      "Accept-Language": navigator.language || "zh-CN",
    };
    if (auth) {
      const { token } = await ClipStorage.getSession();
      if (token) headers.Authorization = `Bearer ${token}`;
    }
    const res = await fetch(`${base}${path}`, {
      method,
      headers,
      body: body === undefined ? "{}" : JSON.stringify(body ?? {}),
    });
    let json;
    try {
      json = await res.json();
    } catch {
      if (res.status === 403) {
        throw new Error(
          "服务器拒绝了插件请求（CORS 403）。请确认 API 地址正确，且服务端已允许 chrome-extension 来源后重新部署。",
        );
      }
      throw new Error(`服务器响应异常（HTTP ${res.status}）`);
    }
    if (!res.ok || (json && json.code !== 0 && json.code !== undefined)) {
      const raw = json?.message || json?.errorKey || "";
      if (res.status === 403 || /invalid cors request/i.test(raw)) {
        throw new Error(
          "服务器拒绝了插件请求（CORS）。请重新部署含 chrome-extension 放行的服务端配置。",
        );
      }
      const msg = raw || `请求失败 HTTP ${res.status}`;
      const err = new Error(msg);
      err.code = json?.code;
      err.errorKey = json?.errorKey;
      throw err;
    }
    return json?.data;
  }

  function extensionVersion() {
    try {
      return chrome.runtime.getManifest().version;
    } catch {
      return "";
    }
  }

  return {
    config: () => request("/api/public/clip/config", { auth: false }),
    login: (email, password) =>
      request("/api/auth/login", { body: { email, password }, auth: false }),
    sendRegisterCode: (email) =>
      request("/api/auth/register/send-code", { body: { email }, auth: false }),
    register: (payload) =>
      request("/api/auth/register", { body: payload, auth: false }),
    me: () => request("/api/auth/me"),
    logout: () => request("/api/auth/logout"),
    submitFeedback: (payload) =>
      request("/api/public/clip/feedback", {
        body: { ...payload, extensionVersion: extensionVersion(), locale: navigator.language || "zh-CN" },
        auth: true,
      }),
    createShare: (payload) => {
      const body = { ...payload, extensionVersion: extensionVersion() };
      // Directed share needs login; open link share is public (no login).
      if (payload?.recipientEmail) {
        return request("/api/clip/share/send", { body, auth: true });
      }
      return request("/api/public/clip/share/create", { body, auth: false });
    },
    getShare: (shareCode) =>
      request("/api/public/clip/share/get", {
        body: { shareCode },
        auth: false,
      }),
    createFileShare: async (file, { title, ttlMinutes } = {}) => {
      const base = await ClipStorage.getApiBase();
      const form = new FormData();
      form.append("file", file, file.name || "file");
      if (title) form.append("title", title);
      form.append("ttlMinutes", String(ttlMinutes ?? 3));
      form.append("extensionVersion", extensionVersion());
      const res = await fetch(`${base}/api/public/clip/share/create-file`, {
        method: "POST",
        body: form,
        headers: { Accept: "application/json" },
      });
      let json;
      try {
        json = await res.json();
      } catch {
        throw new Error(`服务器响应异常（HTTP ${res.status}）`);
      }
      if (!res.ok || (json && json.code !== 0 && json.code !== undefined)) {
        const msg = json?.message || json?.errorKey || `请求失败 HTTP ${res.status}`;
        throw new Error(msg);
      }
      return json?.data;
    },
    downloadShareFile: async (shareCode) => {
      const base = await ClipStorage.getApiBase();
      const res = await fetch(
        `${base}/api/public/clip/share/file/${encodeURIComponent(shareCode)}`,
        { method: "GET" },
      );
      if (!res.ok) {
        let msg = `下载失败 HTTP ${res.status}`;
        try {
          const json = await res.json();
          msg = json?.message || json?.errorKey || msg;
        } catch {
          /* ignore */
        }
        throw new Error(msg);
      }
      const blob = await res.blob();
      let fileName = "download.bin";
      const cd = res.headers.get("Content-Disposition") || "";
      const m = /filename\*=UTF-8''([^;]+)|filename=\"?([^\";]+)\"?/i.exec(cd);
      if (m) {
        fileName = decodeURIComponent((m[1] || m[2] || fileName).trim());
      }
      return { blob, fileName };
    },
    inbox: () => request("/api/clip/share/inbox", { body: { limit: 50 }, auth: true }),
    openInbox: (id) => request("/api/clip/share/inbox/open", { body: { id }, auth: true }),
    saveHistory: (payload) =>
      request("/api/clip/history/save", {
        body: { ...payload, extensionVersion: extensionVersion() },
        auth: true,
      }),
    listHistory: () => request("/api/clip/history/list", { body: { limit: 50 }, auth: true }),
    openHistory: (id) => request("/api/clip/history/open", { body: { id }, auth: true }),
    deleteHistory: (id) => request("/api/clip/history/delete", { body: { id }, auth: true }),
    extensionVersion,
  };
})();
