/**
 * AI chat conversation → Markdown.
 * DeepSeek · 通义千问 · 豆包
 *
 * DeepSeek: skips .ds-think-content (思考过程), keeps final answer;
 * scrolls the thread once to reduce virtualization gaps.
 */
(function (global) {
  function toMd(el) {
    if (!el) return "";
    return global.ZhihuClipHtml2Md.htmlToMarkdown(el).trim();
  }

  function text(el) {
    return (el?.textContent || "").replace(/\s+/g, " ").trim();
  }

  function cleanClone(el) {
    if (!el) return null;
    const clone = el.cloneNode(true);
    clone
      .querySelectorAll(
        [
          "button",
          "svg",
          "nav",
          '[class*="toolbar"]',
          '[class*="Toolbar"]',
          '[class*="action"]',
          '[class*="Action"]',
          '[class*="feedback"]',
          '[class*="copy"]',
          '[class*="Copy"]',
          '[class*="regenerate"]',
          '[aria-label*="复制"]',
          '[aria-label*="Copy"]',
          '[aria-label*="重新生成"]',
          ".ds-think-content",
          "[class*='ds-think']",
          ".ds-markdown-cite",
          "[class*='ds-markdown-cite']",
          "[class*='citation']",
          "script",
          "style",
        ].join(",")
      )
      .forEach((n) => n.remove());
    return clone;
  }

  function isNoiseText(t) {
    if (!t || t.length < 2) return true;
    const noise = [
      "请仔细甄别",
      "下载电脑版",
      "内容由豆包",
      "内容由 AI 生成",
      "新对话",
      "New chat",
      "分享",
      "Share",
      "重新生成",
      "Regenerate",
      "复制",
      "Copy",
      "点赞",
      "踩",
    ];
    return noise.some((n) => t === n || (t.length < 40 && t.includes(n) && t.length < n.length + 8));
  }

  function packTurns(kind, title, turns) {
    const cleaned = dedupeTurns(turns);
    if (!cleaned.length) {
      return {
        ok: false,
        error:
          "未找到对话消息。请确认已打开具体会话，必要时向上滚动加载更多历史后再试。",
      };
    }
    const note = qualityNote(cleaned);
    const lines = [];
    lines.push(`# ${title || "AI 对话"}`, "");
    lines.push(`- 平台：${kind}`);
    lines.push(`- 来源：${location.href}`);
    lines.push(`- 轮次：${cleaned.length}`);
    lines.push(`- 说明：仅包含当前页面已渲染的消息`, "");
    if (note) lines.push(`> ${note}`, "");
    cleaned.forEach((turn, i) => {
      lines.push(`## ${turn.role} · #${i + 1}`, "");
      lines.push(turn.body, "");
    });
    return {
      ok: true,
      kind,
      title: title || kind,
      author: "",
      turns: cleaned,
      warning: note || "",
      markdown: lines.join("\n").replace(/\n{3,}/g, "\n\n").trim() + "\n",
    };
  }

  function turnKey(role, body) {
    const norm = (body || "").replace(/\s+/g, " ").trim().slice(0, 160);
    return `${role}::${norm}`;
  }

  /** Drop exact / near-duplicate turns; keep the longer body on near-match. */
  function dedupeTurns(turns) {
    const out = [];
    for (const t of turns || []) {
      const body = (t.body || "").trim();
      if (!body || isNoiseText(body)) continue;
      const role = t.role || "助手";
      const key = turnKey(role, body);
      const near = `${role}::${body.replace(/\s+/g, " ").slice(0, 100)}`;
      const prevIdx = out.findIndex((x) => {
        const xKey = turnKey(x.role, x.body);
        const xNear = `${x.role}::${x.body.replace(/\s+/g, " ").slice(0, 100)}`;
        return xKey === key || xNear === near;
      });
      if (prevIdx >= 0) {
        if (body.length > out[prevIdx].body.length) out[prevIdx] = { role, body };
        continue;
      }
      out.push({ role, body });
    }
    return out;
  }

  function qualityNote(turns) {
    if (!turns.length) return "";
    const users = turns.filter((t) => t.role === "用户").length;
    const bots = turns.length - users;
    if (turns.length === 1) return "仅抓到 1 条消息，可向上滚动加载更多后再摘一次。";
    if (users === 0) return "未识别到用户消息，请核对预览是否缺轮。";
    if (bots === 0) return "未识别到助手回复，请核对预览是否缺轮。";
    return "";
  }

  function chatTitle(fallbacks) {
    for (const sel of fallbacks) {
      const el = document.querySelector(sel);
      const t = text(el);
      if (t && t.length < 120) return t;
    }
    const doc = (document.title || "").split(/[-_|·]/)[0].trim();
    return doc || "AI 对话";
  }

  // ——— DeepSeek ———

  /** Thinking / search panels — must NOT be treated as the final answer. */
  const DS_THINK_SEL = [
    ".ds-think-content",
    "[class*='ds-think']",
    "[class*='think-content']",
    "[class*='ThinkContent']",
  ].join(",");

  function isInsideThink(el) {
    return !!(el && el.closest && el.closest(DS_THINK_SEL));
  }

  function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }

  function deepSeekScrollRoot() {
    const candidates = [
      document.querySelector(".ds-scroll-area"),
      document.querySelector('[class*="scroll-area"]'),
      document.querySelector('[class*="ScrollArea"]'),
      document.querySelector("main"),
      document.scrollingElement,
      document.body,
    ].filter(Boolean);
    // Prefer the element that actually scrolls the chat
    let best = candidates[0];
    let bestScore = -1;
    for (const el of candidates) {
      const score = (el.scrollHeight || 0) - (el.clientHeight || 0);
      if (score > bestScore) {
        bestScore = score;
        best = el;
      }
    }
    return best || document.body;
  }

  /** Top-level message bubbles only (ignore nested matches). */
  function deepSeekMessageNodes() {
    const all = Array.from(document.querySelectorAll(".ds-message"));
    const list = all.length
      ? all
      : Array.from(document.querySelectorAll("[class*='ds-message']"));
    return list.filter((el) => {
      const parentMsg = el.parentElement && el.parentElement.closest(".ds-message, [class*='ds-message']");
      return !parentMsg || parentMsg === el;
    });
  }

  function deepSeekHasFinalMarkdown(node) {
    return Array.from(
      node.querySelectorAll(".ds-markdown, .markdown, [class*='markdown'], .f-markdown"),
    ).some((n) => !isInsideThink(n));
  }

  function isDeepSeekUserMessage(node) {
    if (!node) return false;
    const role = (node.getAttribute("data-role") || "").toLowerCase();
    if (role === "user" || role === "human") return true;
    if (role === "assistant" || role === "bot" || role === "ai") return false;

    // Community heuristics: hashed user bubble classes / wrappers
    if (node.querySelector(".fbb737a4, [class*='fbb737']")) return true;
    const cls = (node.className || "").toString();
    if (/\buser\b/i.test(cls) && !/\bassistant\b/i.test(cls)) return true;
    if (node.getAttribute("data-is-user") === "true") return true;

    // Assistant messages almost always have final .ds-markdown and/or think panel
    if (node.querySelector(DS_THINK_SEL) || deepSeekHasFinalMarkdown(node)) {
      return false;
    }
    // Plain text bubble → user
    return true;
  }

  function deepSeekAnswerMarkdown(node) {
    if (!node) return "";
    const mdNodes = Array.from(
      node.querySelectorAll(".ds-markdown, .markdown, [class*='markdown'], .f-markdown"),
    ).filter((n) => !isInsideThink(n));
    // Prefer the longest final markdown (answer), not a short leftover
    if (mdNodes.length) {
      mdNodes.sort((a, b) => (b.textContent || "").length - (a.textContent || "").length);
      return toMd(cleanClone(mdNodes[0]));
    }
    const clone = cleanClone(node);
    if (!clone) return "";
    clone.querySelectorAll(DS_THINK_SEL).forEach((n) => n.remove());
    return toMd(clone);
  }

  function deepSeekUserText(node) {
    if (!node) return "";
    const md = Array.from(
      node.querySelectorAll(".ds-markdown, .markdown, [class*='markdown']"),
    ).find((n) => !isInsideThink(n));
    if (md) return toMd(cleanClone(md));
    const clone = cleanClone(node);
    if (!clone) return text(node);
    clone.querySelectorAll(DS_THINK_SEL).forEach((n) => n.remove());
    return (toMd(clone) || text(clone)).trim();
  }

  function isThinkLikeAssistantBody(body) {
    if (!body || body.length > 800) return false;
    return /我需要|我将|为了全面|同时进行多项搜索|用户想了解|我先|接下来我会/.test(body);
  }

  function extractDeepSeekTurnsOnce() {
    const turns = [];
    const seen = new Set();
    const push = (role, body) => {
      let b = (body || "").trim();
      if (!b || isNoiseText(b)) return;
      if (role === "DeepSeek" && isThinkLikeAssistantBody(b) && b.length < 400) {
        // Likely grabbed think text alone — skip unless nothing else
        return;
      }
      const key = turnKey(role, b);
      if (seen.has(key)) return;
      seen.add(key);
      turns.push({ role, body: b, key });
    };

    const roleNodes = document.querySelectorAll(
      '[data-role="user"], [data-role="assistant"], [data-role="human"], [data-role="bot"]',
    );
    if (roleNodes.length >= 2) {
      roleNodes.forEach((node) => {
        // skip nested
        if (node.parentElement?.closest("[data-role]")) return;
        const roleAttr = (node.getAttribute("data-role") || "").toLowerCase();
        const isUser = roleAttr === "user" || roleAttr === "human";
        const body = isUser ? deepSeekUserText(node) : deepSeekAnswerMarkdown(node);
        push(isUser ? "用户" : "DeepSeek", body);
      });
      if (turns.length) return turns;
    }

    const msgs = deepSeekMessageNodes();
    msgs.forEach((msg) => {
      const isUser = isDeepSeekUserMessage(msg);
      const body = isUser ? deepSeekUserText(msg) : deepSeekAnswerMarkdown(msg);
      push(isUser ? "用户" : "DeepSeek", body);
    });
    return turns;
  }

  function mergeTurns(bucket, batch) {
    for (const t of batch) {
      if (!bucket.has(t.key)) bucket.set(t.key, { role: t.role, body: t.body, key: t.key });
    }
  }

  async function orderCollectedTurns(bucket) {
    if (bucket.size <= 1) return Array.from(bucket.values()).map(({ role, body }) => ({ role, body }));

    const root = deepSeekScrollRoot();
    const orderedKeys = [];
    const seen = new Set();
    const record = () => {
      for (const t of extractDeepSeekTurnsOnce()) {
        if (bucket.has(t.key) && !seen.has(t.key)) {
          seen.add(t.key);
          orderedKeys.push(t.key);
        }
      }
    };

    try {
      root.scrollTop = 0;
    } catch {
      /* ignore */
    }
    await sleep(120);
    record();

    const step = Math.max(280, Math.floor((root.clientHeight || 500) * 0.7));
    let lastTop = -1;
    let stuck = 0;
    for (let i = 0; i < 50; i++) {
      record();
      const top = root.scrollTop;
      if (top === lastTop) {
        stuck += 1;
        if (stuck >= 3) break;
      } else stuck = 0;
      lastTop = top;
      if (top + root.clientHeight >= root.scrollHeight - 4) break;
      root.scrollTop = top + step;
      await sleep(80);
    }
    record();

    for (const key of bucket.keys()) {
      if (!seen.has(key)) orderedKeys.push(key);
    }

    return orderedKeys.map((k) => {
      const t = bucket.get(k);
      return { role: t.role, body: t.body };
    });
  }

  /**
   * DeepSeek virtualizes the thread: scrolling removes off-screen DOM.
   * Collect turns AFTER EACH scroll step, then merge & re-order.
   */
  async function deepSeekCollectAllTurns() {
    const root = deepSeekScrollRoot();
    const bucket = new Map();
    const maxUp = 25;
    const maxDown = 50;

    try {
      root.scrollTop = 0;
    } catch {
      /* ignore */
    }
    await sleep(180);
    mergeTurns(bucket, extractDeepSeekTurnsOnce());

    for (let i = 0; i < maxUp; i++) {
      const beforeH = root.scrollHeight;
      root.scrollTop = 0;
      await sleep(160);
      mergeTurns(bucket, extractDeepSeekTurnsOnce());
      if (root.scrollHeight <= beforeH + 2 && i > 2) break;
    }

    const step = Math.max(280, Math.floor((root.clientHeight || 500) * 0.7));
    let lastTop = -1;
    let stuck = 0;
    for (let i = 0; i < maxDown; i++) {
      mergeTurns(bucket, extractDeepSeekTurnsOnce());
      const top = root.scrollTop;
      if (top === lastTop) {
        stuck += 1;
        if (stuck >= 3) break;
      } else {
        stuck = 0;
      }
      lastTop = top;
      if (top + root.clientHeight >= root.scrollHeight - 4) break;
      root.scrollTop = top + step;
      await sleep(110);
    }
    mergeTurns(bucket, extractDeepSeekTurnsOnce());

    return orderCollectedTurns(bucket);
  }

  /**
   * Fallback: click each message's official「复制」and intercept clipboard write.
   * Official copy usually returns clean Markdown for that bubble.
   */
  async function deepSeekHarvestViaCopyButtons() {
    const msgs = deepSeekMessageNodes();
    if (msgs.length < 2) return [];

    const results = [];
    const nav = navigator.clipboard;
    if (!nav || typeof nav.writeText !== "function") return [];

    const original = nav.writeText.bind(nav);
    let captured = null;
    nav.writeText = async (text) => {
      captured = String(text || "");
    };

    try {
      for (const msg of msgs) {
        const buttons = Array.from(msg.querySelectorAll("button, [role='button']"));
        const copyBtn = buttons.find((b) => {
          const label = `${b.getAttribute("aria-label") || ""} ${b.getAttribute("title") || ""} ${b.textContent || ""}`;
          return /复制|Copy/i.test(label) && !/代码|Code/i.test(label);
        });
        if (!copyBtn) continue;
        captured = null;
        try {
          copyBtn.click();
        } catch {
          continue;
        }
        await sleep(100);
        if (!captured || captured.length < 1) continue;
        const isUser = isDeepSeekUserMessage(msg);
        results.push({
          role: isUser ? "用户" : "DeepSeek",
          body: captured.trim(),
        });
      }
    } finally {
      nav.writeText = original;
    }
    return results;
  }

  function scoreTurns(turns) {
    if (!turns?.length) return 0;
    const assistant = turns.filter((t) => t.role === "DeepSeek");
    const chars = turns.reduce((n, t) => n + (t.body?.length || 0), 0);
    const thinkHits = assistant.filter((t) => isThinkLikeAssistantBody(t.body)).length;
    return turns.length * 1000 + chars - thinkHits * 5000;
  }

  async function clipDeepSeek() {
    const title = chatTitle([
      '[class*="conversation"] [class*="title"]',
      "header h1",
      ".ds-theme",
    ]);

    let turns = await deepSeekCollectAllTurns();
    let best = turns;
    let bestScore = scoreTurns(turns);

    // If assistant answers look like think snippets or too few turns, try copy-button harvest
    const weak =
      bestScore < 3000 ||
      (turns.filter((t) => t.role === "DeepSeek").length > 0 &&
        turns.filter((t) => t.role === "DeepSeek").every((t) => isThinkLikeAssistantBody(t.body) || t.body.length < 80));

    if (weak || turns.length < 2) {
      // ensure messages near bottom are mounted
      const root = deepSeekScrollRoot();
      try {
        root.scrollTop = root.scrollHeight;
      } catch {
        /* ignore */
      }
      await sleep(200);
      const viaCopy = await deepSeekHarvestViaCopyButtons();
      if (scoreTurns(viaCopy) > bestScore) {
        best = viaCopy;
        bestScore = scoreTurns(viaCopy);
      }
      // also merge DOM extract at bottom
      const bottom = extractDeepSeekTurnsOnce();
      if (scoreTurns(bottom) > bestScore) {
        best = bottom;
      }
    }

    // Drop empty / noise again
    best = best.filter((t) => t.body && !isNoiseText(t.body));

    const result = packTurns("deepseek-chat", title, best);
    if (!result.ok) {
      result.error =
        "未收集到 DeepSeek 对话。请先滚到会话顶部加载历史，再点摘录；仍缺段可用划词或区域摘录。";
    } else {
      result.markdown = result.markdown.replace(
        "- 说明：仅包含当前页面已渲染的消息",
        "- 说明：已滚动收集多轮对话（虚拟列表会卸载离屏消息）；若仍缺段请先滚到顶部再摘录",
      );
    }
    return result;
  }

  // ——— 通义千问 ———

  function clipQwen() {
    const title = chatTitle([
      '[class*="chat-title"]',
      '[class*="conversation-title"]',
      "header h1",
      '[class*="title"]',
    ]);
    const turns = [];

    const withRole = document.querySelectorAll(
      '[data-role="user"], [data-role="assistant"], [data-role="bot"], [class*="questionItem"], [class*="answerItem"]'
    );
    if (withRole.length) {
      withRole.forEach((node) => {
        if (node.parentElement?.closest('[data-role], [class*="questionItem"], [class*="answerItem"]'))
          return;
        const cls = (node.className || "").toString().toLowerCase();
        const roleAttr = (node.getAttribute("data-role") || "").toLowerCase();
        let role = "千问";
        if (roleAttr === "user" || cls.includes("question") || cls.includes("user")) role = "用户";
        const bodyEl =
          node.querySelector(
            ".markdown-body, .tongyi-markdown, [class*='markdown'], [class*='Markdown'], pre"
          ) || node;
        const body = toMd(cleanClone(bodyEl));
        if (body && !isNoiseText(body)) turns.push({ role, body });
      });
      if (turns.length) return packTurns("qwen-chat", title, turns);
    }

    // chat.qwen.ai / tongyi common message list
    const list =
      document.querySelector("#chat-message-container") ||
      document.querySelector('[class*="chatList"]') ||
      document.querySelector('[class*="message-list"]') ||
      document.querySelector("main");

    const items = (list || document).querySelectorAll(
      '[class*="chat-item"], [class*="ChatItem"], [class*="message-item"], [class*="MessageItem"], [class*="question"], [class*="answer"]'
    );

    items.forEach((item) => {
      const cls = (item.className || "").toString().toLowerCase();
      const isUser =
        cls.includes("user") ||
        cls.includes("question") ||
        cls.includes("human") ||
        !!item.querySelector('[class*="user-avatar"], [class*="UserAvatar"]');
      const bodyEl =
        item.querySelector(
          ".markdown-body, .tongyi-markdown, [class*='markdown'], [class*='content'], [class*='Content']"
        ) || item;
      const body = toMd(cleanClone(bodyEl));
      if (!body || isNoiseText(body) || body.length < 2) return;
      turns.push({ role: isUser ? "用户" : "千问", body });
    });

    if (turns.length) return packTurns("qwen-chat", title, turns);

    // Fallback: all markdown blocks in main
    const mdBlocks = document.querySelectorAll(
      "main .markdown-body, main [class*='markdown'], [class*='tongyi'] [class*='markdown']"
    );
    mdBlocks.forEach((b, i) => {
      const body = toMd(cleanClone(b));
      if (!body || isNoiseText(body)) return;
      turns.push({ role: i % 2 === 0 ? "用户" : "千问", body });
    });
    const packed = packTurns("qwen-chat", title, turns);
    if (!packed.ok) {
      packed.error =
        "未识别到通义千问对话。请打开具体会话页，等消息加载完后再试；仍失败可用划词或区域摘录。";
    }
    return packed;
  }

  // ——— 豆包 ———

  function clipDoubao() {
    const title = chatTitle([
      '[data-testid="chat_list_thread_item"][aria-current="page"]',
      '[class*="conversation"] [class*="title"]',
      "header h1",
    ]);
    const turns = [];

    // Prefer stable attributes when present
    const byMsgId = document.querySelectorAll("[data-message-id]");
    if (byMsgId.length) {
      byMsgId.forEach((node) => {
        const cls = (node.className || "").toString();
        const isUser =
          cls.includes("justify-end") ||
          !!node.querySelector('[class*="bg-g-send-msg-bubble"]') ||
          node.getAttribute("data-testid") === "send_message";
        const bodyEl =
          node.querySelector(
            ".flow-markdown-body, .md-box-root, [data-testid='message_text_content'], [class*='markdown'], .container-markdown-body"
          ) ||
          node.querySelector('[class*="receive-msg"], [class*="send-msg"]') ||
          node;
        const body = toMd(cleanClone(bodyEl));
        if (!body || isNoiseText(body)) return;
        turns.push({ role: isUser ? "用户" : "豆包", body });
      });
      if (turns.length) return packTurns("doubao-chat", title, turns);
    }

    const userBubbles = document.querySelectorAll(
      '[class*="bg-g-send-msg-bubble"], [data-testid="send_message"], [data-testid="message_content"].justify-end'
    );
    const aiBubbles = document.querySelectorAll(
      '[class*="bg-g-receive-msg-bubble"], [data-testid="receive_message"], .flow-markdown-body, .md-box-root'
    );

    // Interleave by document order
    const nodes = [];
    userBubbles.forEach((n) => nodes.push({ role: "用户", el: n }));
    aiBubbles.forEach((n) => {
      // skip if nested inside already collected user bubble
      if (n.closest('[class*="bg-g-send-msg-bubble"]')) return;
      nodes.push({ role: "豆包", el: n });
    });
    nodes.sort((a, b) => {
      const p = a.el.compareDocumentPosition(b.el);
      if (p & Node.DOCUMENT_POSITION_FOLLOWING) return -1;
      if (p & Node.DOCUMENT_POSITION_PRECEDING) return 1;
      return 0;
    });

    for (const { role, el } of nodes) {
      const bodyEl =
        el.querySelector(".flow-markdown-body, .md-box-root, [class*='markdown']") || el;
      const body = toMd(cleanClone(bodyEl));
      if (!body || isNoiseText(body)) continue;
      turns.push({ role, body });
    }

    const packed = packTurns("doubao-chat", title, turns);
    if (!packed.ok) {
      packed.error =
        "未识别到豆包对话。请打开具体会话，等气泡加载完后再试；仍失败可用划词或区域摘录。";
    }
    return packed;
  }

  function detect() {
    const host = location.hostname;
    if (host === "chat.deepseek.com" || host.endsWith(".deepseek.com")) return "deepseek";
    if (
      host === "chat.qwen.ai" ||
      host === "chat.qwenlm.ai" ||
      host.includes("tongyi") ||
      host === "qwen.aliyun.com" ||
      host.endsWith("qwen.ai")
    ) {
      return "qwen";
    }
    if (host === "www.doubao.com" || host === "doubao.com" || host.endsWith(".doubao.com")) {
      return "doubao";
    }
    return null;
  }

  function clip() {
    const kind = detect();
    if (kind === "deepseek") return clipDeepSeek();
    if (kind === "qwen") return clipQwen();
    if (kind === "doubao") return clipDoubao();
    return null;
  }

  global.CleanClipAiChat = { detect, clip };
})(typeof window !== "undefined" ? window : globalThis);
