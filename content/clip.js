/**
 * Multi-site clean clip → Markdown.
 * Core: Zhihu · CSDN · GitHub
 * Plus: AI chats (ai-chat.js) · CN high-traffic + generic (sites-cn.js)
 */
(function () {
  function toMd(el) {
    return window.ZhihuClipHtml2Md.htmlToMarkdown(el);
  }

  function text(el) {
    return (el?.textContent || "").replace(/\s+/g, " ").trim();
  }

  function pack({ kind, title, author, extraMeta, bodyEl }) {
    if (!bodyEl) {
      return { ok: false, error: "找不到正文容器，请等页面加载完再试。" };
    }
    const body = toMd(bodyEl).trim();
    if (!body) {
      return { ok: false, error: "正文为空（可能未展开全文，或选择器未命中）。" };
    }
    const lines = [];
    if (title) lines.push(`# ${title}`, "");
    const meta = [];
    if (author) meta.push(`- 作者：${author}`);
    for (const m of extraMeta || []) meta.push(`- ${m}`);
    meta.push(`- 来源：${location.href}`);
    lines.push(...meta, "", body, "");
    return {
      ok: true,
      kind,
      title: title || kind,
      author: author || "",
      markdown: lines.join("\n").replace(/\n{3,}/g, "\n\n").trim() + "\n",
    };
  }

  function pageKind() {
    const host = location.hostname;
    const path = location.pathname;

    if (host === "zhuanlan.zhihu.com" && /^\/p\/\d+/.test(path)) return "zhihu-column";
    if (host === "www.zhihu.com" && /\/question\/\d+\/answer\/\d+/.test(path)) return "zhihu-answer";
    if (host === "www.zhihu.com" && /\/question\/\d+\/?$/.test(path)) return "zhihu-question";

    if (/(^|\.)csdn\.net$/.test(host) && /\/article\/details\//.test(path)) return "csdn-article";

    if (host === "github.com") {
      if (/^\/[^/]+\/[^/]+\/issues\/\d+/.test(path)) return "github-issue";
      if (/^\/[^/]+\/[^/]+\/pull\/\d+/.test(path)) return "github-pr";
      if (/^\/[^/]+\/[^/]+\/discussions\/\d+/.test(path)) return "github-discussion";
      if (/^\/[^/]+\/[^/]+\/blob\//.test(path)) return "github-blob";
      if (/^\/[^/]+\/[^/]+\/?$/.test(path)) return "github-repo";
    }
    return "unsupported";
  }

  // ——— Zhihu ———

  function zhihuAnswerId() {
    const m = location.pathname.match(/\/answer\/(\d+)/);
    return m ? m[1] : null;
  }

  function zhihuFindAnswerItem(answerId) {
    const items = Array.from(
      document.querySelectorAll(".AnswerItem, .AnswerCard, [data-zop-type='answer']")
    );
    if (!items.length) return document.querySelector(".QuestionAnswer-content");
    if (answerId) {
      for (const item of items) {
        const zop = item.getAttribute("data-zop") || "";
        if (zop.includes(answerId)) return item;
        const name = item.getAttribute("name") || item.id || "";
        if (name.includes(answerId)) return item;
        if (item.querySelector(`a[href*="/answer/${answerId}"]`)) return item;
      }
    }
    return items[0];
  }

  function zhihuRichText(scope) {
    if (!scope) return null;
    return (
      scope.querySelector(".RichContent-inner .RichText") ||
      scope.querySelector(".RichText.ztext") ||
      scope.querySelector(".RichText") ||
      scope.querySelector(".Post-RichText") ||
      scope.querySelector("[class*='RichText']")
    );
  }

  function zhihuAuthor(scope) {
    if (!scope) return "";
    for (const sel of [".AuthorInfo-name a", ".AuthorInfo-name", ".UserLink-link", 'meta[itemprop="name"]']) {
      const el = scope.querySelector(sel);
      if (!el) continue;
      if (el.tagName === "META") return (el.getAttribute("content") || "").trim();
      const t = text(el);
      if (t) return t;
    }
    return "";
  }

  function zhihuTitle() {
    const h1 =
      document.querySelector("h1.QuestionHeader-title") ||
      document.querySelector(".QuestionHeader-title") ||
      document.querySelector("h1.Post-Title") ||
      document.querySelector("h1");
    if (h1) return text(h1);
    return (document.title || "").replace(/\s*-\s*知乎\s*$/, "").trim();
  }

  function clipZhihuAnswer() {
    const item = zhihuFindAnswerItem(zhihuAnswerId());
    if (!item) return { ok: false, error: "找不到知乎回答容器。" };
    const btn = item.querySelector(".VoteButton--up, [aria-label*='赞同']");
    const voteMatch = btn ? text(btn).match(/([\d.]+万?)/) : null;
    return pack({
      kind: "zhihu-answer",
      title: zhihuTitle(),
      author: zhihuAuthor(item),
      extraMeta: voteMatch ? [`赞同：${voteMatch[1]}`] : [],
      bodyEl: zhihuRichText(item),
    });
  }

  function clipZhihuColumn() {
    return pack({
      kind: "zhihu-column",
      title: zhihuTitle(),
      author: zhihuAuthor(document.querySelector(".Post-Header") || document),
      bodyEl:
        zhihuRichText(document.querySelector(".Post-RichTextContainer") || document) ||
        document.querySelector(".Post-RichText"),
    });
  }

  // ——— CSDN ———

  function clipCsdn() {
    const title =
      text(document.querySelector("#articleContentId")) ||
      text(document.querySelector("h1.title-article")) ||
      text(document.querySelector("h1")) ||
      (document.title || "").replace(/\s*-\s*CSDN.*/, "").trim();

    const author =
      text(document.querySelector("a.follow-nickName")) ||
      text(document.querySelector(".user-info .name")) ||
      "";

    const raw =
      document.querySelector("#content_views") ||
      document.querySelector("#article_content") ||
      document.querySelector(".article_content");

    if (!raw) return pack({ kind: "csdn-article", title, author, bodyEl: null });

    const clone = raw.cloneNode(true);
    clone
      .querySelectorAll(
        ".hide-article-box, .article-copyright, .more-toolbox, .csdn-side-toolbar, script, style, .hljs-button"
      )
      .forEach((n) => n.remove());

    return pack({ kind: "csdn-article", title, author, bodyEl: clone });
  }

  // ——— GitHub ———

  function githubTitleFallback() {
    return (document.title || "").replace(/\s*·\s*GitHub\s*$/i, "").trim();
  }

  function firstMarkdownBody(root) {
    const scope = root || document;
    return (
      scope.querySelector("article.markdown-body") ||
      scope.querySelector(".markdown-body") ||
      scope.querySelector('[data-testid="markdown-body"]')
    );
  }

  function clipGithubIssueOrPr(kind) {
    const title =
      text(document.querySelector("bdi.js-issue-title-text")) ||
      text(document.querySelector('[data-testid="issue-title"]')) ||
      text(document.querySelector(".js-issue-title")) ||
      text(document.querySelector("h1.gh-header-title")) ||
      text(document.querySelector("h1")) ||
      githubTitleFallback();

    const author =
      text(document.querySelector(".gh-header-meta a.author")) ||
      text(document.querySelector("a.author")) ||
      "";

    const body =
      document.querySelector('[data-testid="issue-body"] .markdown-body') ||
      document.querySelector(".js-comment-body .markdown-body") ||
      document.querySelector(".timeline-comment .markdown-body") ||
      firstMarkdownBody(document.querySelector(".js-discussion")) ||
      firstMarkdownBody();

    return pack({ kind, title, author, bodyEl: body });
  }

  function clipGithubDiscussion() {
    const title =
      text(document.querySelector('[data-testid="discussion-title"]')) ||
      text(document.querySelector("h1")) ||
      githubTitleFallback();
    const author = text(document.querySelector("a.author")) || "";
    const body =
      document.querySelector('[data-testid="discussion-comment-body"] .markdown-body') ||
      firstMarkdownBody(document.querySelector(".js-discussion")) ||
      firstMarkdownBody();
    return pack({ kind: "github-discussion", title, author, bodyEl: body });
  }

  function clipGithubBlob() {
    const title =
      text(document.querySelector("#file-name-id-wide")) ||
      text(document.querySelector(".final-path")) ||
      location.pathname.split("/").pop() ||
      githubTitleFallback();

    const body =
      document.querySelector("#readme .markdown-body") ||
      document.querySelector("article.markdown-body") ||
      document.querySelector(".Box-body.readme .markdown-body") ||
      document.querySelector('[data-testid="readme"] .markdown-body') ||
      firstMarkdownBody();

    if (!body) {
      return {
        ok: false,
        error: "当前文件没有 Markdown 预览。请打开 README 或 .md 的预览视图。",
      };
    }
    return pack({ kind: "github-blob", title, author: "", bodyEl: body });
  }

  function clipGithubRepo() {
    const title =
      text(document.querySelector('strong[itemprop="name"] a')) ||
      text(document.querySelector('[itemprop="name"]')) ||
      githubTitleFallback();
    const body =
      document.querySelector("#readme .markdown-body") ||
      document.querySelector('[data-testid="readme"] .markdown-body') ||
      document.querySelector("article.markdown-body");
    if (!body) return { ok: false, error: "仓库首页找不到 README。" };
    return pack({ kind: "github-repo", title, author: "", bodyEl: body });
  }

  function clip() {
    if (window.CleanClipAiChat && window.CleanClipAiChat.detect()) {
      return window.CleanClipAiChat.clip();
    }

    switch (pageKind()) {
      case "zhihu-answer":
        return clipZhihuAnswer();
      case "zhihu-column":
        return clipZhihuColumn();
      case "zhihu-question":
        return { ok: false, error: "请打开具体「回答」页（URL 含 /answer/数字）。" };
      case "csdn-article":
        return clipCsdn();
      case "github-issue":
        return clipGithubIssueOrPr("github-issue");
      case "github-pr":
        return clipGithubIssueOrPr("github-pr");
      case "github-discussion":
        return clipGithubDiscussion();
      case "github-blob":
        return clipGithubBlob();
      case "github-repo":
        return clipGithubRepo();
      default:
        break;
    }

    if (window.CleanClipSitesCn) {
      return window.CleanClipSitesCn.clip();
    }

    return {
      ok: false,
      error: "摘录脚本未完整加载，请重新加载扩展后再试。",
    };
  }

  // May return a Promise for AI chats (DeepSeek scroll-load).
  const ready = Promise.resolve(clip()).then((result) => {
    window.__CLEAN_CLIP__ = result;
    window.__ZHIHU_CLEAN_CLIP__ = result; // legacy alias
    return result;
  });
  window.__CLEAN_CLIP_READY__ = ready;
  window.__ZHIHU_CLEAN_CLIP_READY__ = ready;
})();
