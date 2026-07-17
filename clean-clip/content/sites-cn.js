/**
 * High-traffic CN sites → clean Markdown.
 * Prefer site rules; unknown pages fall back to generic article extract.
 */
(function (global) {
  function toMd(el) {
    return global.ZhihuClipHtml2Md.htmlToMarkdown(el).trim();
  }

  function text(el) {
    return (el?.textContent || "").replace(/\s+/g, " ").trim();
  }

  function q(sel, root) {
    return (root || document).querySelector(sel);
  }

  function qa(sel, root) {
    return Array.from((root || document).querySelectorAll(sel));
  }

  function cleanClone(el, extraRemove) {
    if (!el) return null;
    const clone = el.cloneNode(true);
    const kill = [
      "script",
      "style",
      "nav",
      "aside",
      "iframe",
      ".advertisement",
      '[class*="ad-"]',
      '[class*="advert"]',
      '[id*="ad-"]',
      '[class*="recommend"]',
      '[class*="related"]',
      '[class*="comment"]',
      '[id*="comment"]',
      '[class*="sidebar"]',
      '[class*="tool-box"]',
      '[class*="toolbar"]',
      "button",
      ...(extraRemove || []),
    ];
    clone.querySelectorAll(kill.join(",")).forEach((n) => {
      try {
        n.remove();
      } catch (_) {}
    });
    return clone;
  }

  function pack({ kind, title, author, extraMeta, bodyEl, bodyMarkdown }) {
    const body = (bodyMarkdown || (bodyEl ? toMd(bodyEl) : "")).trim();
    if (!body) {
      return { ok: false, error: "正文为空，请等页面加载完或向下滚动后再试。" };
    }
    const lines = [];
    if (title) lines.push(`# ${title}`, "");
    const meta = [];
    if (author) meta.push(`- 作者：${author}`);
    for (const m of extraMeta || []) if (m) meta.push(`- ${m}`);
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

  function titleFrom(...sels) {
    for (const sel of sels) {
      const t = text(typeof sel === "string" ? q(sel) : sel);
      if (t) return t;
    }
    const og = q('meta[property="og:title"]')?.getAttribute("content");
    if (og) return og.trim();
    return (document.title || "").split(/[-_|–—]/)[0].trim();
  }

  // ——— Content sites ———

  function clipJuejin() {
    return pack({
      kind: "juejin-article",
      title: titleFrom("h1.article-title", "h1"),
      author: text(q(".author-name, .username, .user-name")),
      bodyEl: cleanClone(q(".markdown-body, #article-root, .article-content")),
    });
  }

  function clipJianshu() {
    return pack({
      kind: "jianshu-article",
      title: titleFrom("h1._1RuRku", "h1"),
      author: text(q("._1OhGeD, .name")),
      bodyEl: cleanClone(q("article._2rhmJa, article")),
    });
  }

  function clipCnblogs() {
    return pack({
      kind: "cnblogs-post",
      title: titleFrom("#cb_post_title_url", "h1", "#topics .postTitle a"),
      author: text(q("#post-author, #blog-news #profile_block a")),
      bodyEl: cleanClone(q("#cnblogs_post_body, #post_body")),
    });
  }

  function clipWeixin() {
    return pack({
      kind: "weixin-mp",
      title: titleFrom("#activity-name", "h1"),
      author: text(q("#js_name, .rich_media_meta_text a, .profile_nickname")),
      extraMeta: [text(q("#publish_time")) ? `时间：${text(q("#publish_time"))}` : ""],
      bodyEl: cleanClone(q("#js_content")),
    });
  }

  function clipSspai() {
    return pack({
      kind: "sspai-article",
      title: titleFrom(".title", "h1"),
      author: text(q(".user-name, .author-name, a.name")),
      bodyEl: cleanClone(q(".article-content, .wangEditor-txt, .content")),
    });
  }

  function clipSegmentFault() {
    const isA = /\/a\//.test(location.pathname) || q(".article__content, .articleFmt");
    return pack({
      kind: isA ? "sf-article" : "sf-qa",
      title: titleFrom("h1", ".article-title"),
      author: text(q(".author .name, .user-name")),
      bodyEl: cleanClone(
        q(".article__content, .articleFmt.fmt, .question .fmt, .answer .fmt, .fmt")
      ),
    });
  }

  function clipV2ex() {
    const topic = q(".topic_content");
    const replies = qa(".reply_content")
      .slice(0, 30)
      .map((el, i) => {
        const who = text(el.closest(".cell")?.querySelector("strong a, .dark"));
        return `### 回复 ${i + 1}${who ? ` · ${who}` : ""}\n\n${toMd(cleanClone(el))}`;
      })
      .join("\n\n");
    const main = topic ? toMd(cleanClone(topic)) : "";
    const body = [main, replies ? `## 回复（前 30 条）\n\n${replies}` : ""].filter(Boolean).join("\n\n");
    return pack({
      kind: "v2ex-topic",
      title: titleFrom("h1", ".header h1"),
      author: text(q(".header small a, .dark")),
      bodyMarkdown: body,
    });
  }

  function clipBaike() {
    return pack({
      kind: "baidu-baike",
      title: titleFrom("h1", ".lemmaWgt-lemmaTitle-title h1"),
      bodyEl: cleanClone(q(".lemma-summary, .main-content, #bodyContent, .J-lemma-content"), [
        ".lemmaWgt-sideTools",
        ".side-content",
      ]),
    });
  }

  function clipZhidao() {
    const best =
      q(".best-text, .best-answer-content, .bd.answer .answer-text") ||
      q(".answer-text, .rich-content-container");
    return pack({
      kind: "baidu-zhidao",
      title: titleFrom("h1 span, h1, .ask-title"),
      author: text(q(".best-answer-meta .user-name, .answerer-name")),
      bodyEl: cleanClone(best),
    });
  }

  function clipJingyan() {
    return pack({
      kind: "baidu-jingyan",
      title: titleFrom("h1.exp-title, h1"),
      bodyEl: cleanClone(q("#content-wraper, .exp-content-outer, .content-list")),
    });
  }

  function clipTieba() {
    const first = q(".d_post_content_first, .d_post_content.j_d_post_content");
    return pack({
      kind: "baidu-tieba",
      title: titleFrom("h1", ".core_title_txt"),
      author: text(q(".p_author_name, .d_name a")),
      bodyEl: cleanClone(first),
    });
  }

  function clipBilibiliRead() {
    return pack({
      kind: "bilibili-read",
      title: titleFrom("h1", ".title"),
      author: text(q(".up-name, .author-name, a.username")),
      bodyEl: cleanClone(q("#read-article-holder, .article-content, .opus-module-content")),
    });
  }

  function clip36kr() {
    return pack({
      kind: "36kr-article",
      title: titleFrom("h1", ".article-title"),
      author: text(q(".author-name, .name")),
      bodyEl: cleanClone(q(".articleDetailContent, .article-content, .common-width")),
    });
  }

  function clipIthome() {
    return pack({
      kind: "ithome-news",
      title: titleFrom("h1", ".post_title"),
      bodyEl: cleanClone(q(".post_content, #paragraph")),
    });
  }

  function clipCloudTencent() {
    return pack({
      kind: "tencent-cloud-dev",
      title: titleFrom("h1", ".title-text"),
      author: text(q(".user-name, .author-name")),
      bodyEl: cleanClone(q(".com-markdown-collpase, .markdown-body, .rno-markdown")),
    });
  }

  function clipAliyunDev() {
    return pack({
      kind: "aliyun-developer",
      title: titleFrom("h1", ".article-title"),
      author: text(q(".author-name, .username")),
      bodyEl: cleanClone(q(".article-content, .markdown-body, #article-content-root")),
    });
  }

  function clip51cto() {
    return pack({
      kind: "51cto-blog",
      title: titleFrom("h1", ".article-title"),
      author: text(q(".author, .name")),
      bodyEl: cleanClone(q("#content, .article-content, .main-content")),
    });
  }

  function clipJb51() {
    return pack({
      kind: "jb51-article",
      title: titleFrom("h1", ".title"),
      bodyEl: cleanClone(q("#content, .content")),
    });
  }

  function clipDouban() {
    const review = q("#link-report, .review-content, .note-content, #comments");
    return pack({
      kind: "douban",
      title: titleFrom("h1", "h1 span"),
      author: text(q(".from a, .author a, header .name")),
      bodyEl: cleanClone(q(".related-info, #link-report .intro, .review-content, .note"), [
        ".aside",
      ]),
    });
  }

  // ——— E-commerce ———

  function clipJd() {
    const title = titleFrom(".sku-name", "h1", ".itemInfo-wrap .sku-name");
    const price =
      text(q(".p-price .price, .summary-price-wrap .price, [class*='price'] .price")) ||
      text(q(".p-price"));
    const shop = text(q("#crumb-wrap .crumb a, .J-hove-wrap .name a, .shop-name"));
    const params = qa("#detail .parameter2 li, .p-parameter-list li, .parameter2 li")
      .map((li) => `- ${text(li)}`)
      .filter(Boolean)
      .slice(0, 40)
      .join("\n");
    const detail =
      q("#detail .detail-content, #J-detail-content, .detail-content-wrap") ||
      q("#detail");
    const parts = [];
    if (params) parts.push("## 规格参数\n\n" + params);
    if (detail) parts.push("## 详情\n\n" + toMd(cleanClone(detail)));
    return pack({
      kind: "jd-item",
      title,
      extraMeta: [price ? `价格：${price}` : "", shop ? `店铺：${shop}` : ""],
      bodyMarkdown: parts.join("\n\n") || title,
    });
  }

  function clipTaobaoTmall() {
    const title = titleFrom("h1", "[class*='ItemHeader'] h1", ".tb-main-title", "#detail h1");
    const price =
      text(q("[class*='Price'] [class*='text'], .tm-price, .tb-rmb-num, [class*='price']")) || "";
    const shop = text(q("[class*='ShopHeader'] a, .tb-shop-name a, .slogo-shopname"));
    const attrs = qa("[class*='ItemHeader--'] li, .attributes-list li, #J_AttrList li, ul.attributes-list li")
      .map((li) => `- ${text(li)}`)
      .filter((x) => x.length > 3)
      .slice(0, 40)
      .join("\n");
    const desc =
      q("#description, #J_DivItemDesc, [class*='descV8'], .content") ||
      q("#detail");
    const parts = [];
    if (attrs) parts.push("## 商品属性\n\n" + attrs);
    if (desc) parts.push("## 详情\n\n" + toMd(cleanClone(desc)));
    return pack({
      kind: "taobao-item",
      title,
      extraMeta: [price ? `价格：${price}` : "", shop ? `店铺：${shop}` : ""],
      bodyMarkdown: parts.join("\n\n") || title,
    });
  }

  // ——— Generic fallback (any page) ———

  function scoreNode(el) {
    if (!el || el.nodeType !== 1) return 0;
    const t = (el.innerText || "").trim();
    if (t.length < 80) return 0;
    const tag = el.tagName.toLowerCase();
    let s = Math.min(t.length, 5000);
    if (tag === "article") s += 800;
    if (el.getAttribute("itemprop") === "articleBody") s += 1000;
    if (/article|post|content|entry|markdown|rich/i.test(el.className + el.id)) s += 400;
    if (/comment|footer|header|nav|aside|sidebar|recommend/i.test(el.className + el.id)) s -= 600;
    const links = el.querySelectorAll("a").length;
    const paras = el.querySelectorAll("p").length;
    if (paras >= 3) s += 200;
    if (links > paras * 4 && paras < 2) s -= 300;
    return s;
  }

  function clipGeneric() {
    const candidates = [
      q("article"),
      q('[itemprop="articleBody"]'),
      q("main article"),
      q(".markdown-body"),
      q("#js_content"),
      q(".Post-RichText"),
      q("#content_views"),
      q(".article-content"),
      q(".post-content"),
      q(".entry-content"),
      q("#article-content"),
      q(".rich_media_content"),
      q("main"),
      ...qa("article, .content, #content, .main-content").slice(0, 8),
    ].filter(Boolean);

    let best = null;
    let bestScore = 0;
    for (const el of candidates) {
      const s = scoreNode(el);
      if (s > bestScore) {
        bestScore = s;
        best = el;
      }
    }

    if (!best || bestScore < 100) {
      return {
        ok: false,
        error:
          "未能可靠识别正文。可尝试：打开文章详情页、展开全文后再剪；或反馈站点 URL 以便加专属规则。",
      };
    }

    return pack({
      kind: "generic-article",
      title: titleFrom("h1", "h1.title", "h2"),
      author: text(q('[rel="author"], .author, .byline, [itemprop="author"]')),
      bodyEl: cleanClone(best),
    });
  }

  function match() {
    const host = location.hostname.replace(/^www\./, "");
    const path = location.pathname;
    const href = location.href;

    if (host.endsWith("juejin.cn") && (path.includes("/post/") || path.includes("/article/")))
      return "juejin";
    if (host.endsWith("jianshu.com") && path.includes("/p/")) return "jianshu";
    if (host.endsWith("cnblogs.com") && (path.includes("/p/") || /\/\d+\.html/.test(path)))
      return "cnblogs";
    if (host === "mp.weixin.qq.com") return "weixin";
    if (host.endsWith("sspai.com") && path.includes("/post/")) return "sspai";
    if (host.endsWith("segmentfault.com")) return "sf";
    if (host === "v2ex.com" || host.endsWith(".v2ex.com")) {
      if (path.startsWith("/t/")) return "v2ex";
    }
    if (host.includes("baike.baidu.com")) return "baike";
    if (host.includes("zhidao.baidu.com")) return "zhidao";
    if (host.includes("jingyan.baidu.com")) return "jingyan";
    if (host.includes("tieba.baidu.com")) return "tieba";
    if (host.endsWith("bilibili.com") && (path.includes("/read/") || path.includes("/opus/")))
      return "bili-read";
    if (host.endsWith("36kr.com")) return "36kr";
    if (host.endsWith("ithome.com")) return "ithome";
    if (host.includes("cloud.tencent.com") && path.includes("/developer/")) return "tencent-cloud";
    if (host.includes("developer.aliyun.com")) return "aliyun-dev";
    if (host.endsWith("51cto.com")) return "51cto";
    if (host.endsWith("jb51.net")) return "jb51";
    if (host.endsWith("douban.com")) return "douban";

    if (host.includes("jd.com") && (host.startsWith("item") || path.includes("/product/") || /\/\d+\.html/.test(path)))
      return "jd";
    if (
      host.includes("taobao.com") ||
      host.includes("tmall.com") ||
      host.includes("tmall.hk")
    ) {
      if (path.includes("item") || host.startsWith("item") || host.startsWith("detail") || href.includes("id="))
        return "taobao";
    }

    return null;
  }

  function clipMatched(kind) {
    switch (kind) {
      case "juejin":
        return clipJuejin();
      case "jianshu":
        return clipJianshu();
      case "cnblogs":
        return clipCnblogs();
      case "weixin":
        return clipWeixin();
      case "sspai":
        return clipSspai();
      case "sf":
        return clipSegmentFault();
      case "v2ex":
        return clipV2ex();
      case "baike":
        return clipBaike();
      case "zhidao":
        return clipZhidao();
      case "jingyan":
        return clipJingyan();
      case "tieba":
        return clipTieba();
      case "bili-read":
        return clipBilibiliRead();
      case "36kr":
        return clip36kr();
      case "ithome":
        return clipIthome();
      case "tencent-cloud":
        return clipCloudTencent();
      case "aliyun-dev":
        return clipAliyunDev();
      case "51cto":
        return clip51cto();
      case "jb51":
        return clipJb51();
      case "douban":
        return clipDouban();
      case "jd":
        return clipJd();
      case "taobao":
        return clipTaobaoTmall();
      default:
        return null;
    }
  }

  function clip() {
    const kind = match();
    if (kind) {
      const r = clipMatched(kind);
      if (r?.ok) return r;
      // site matched but failed → still try generic
      const g = clipGeneric();
      if (g?.ok) {
        g.kind = kind + "+generic";
        return g;
      }
      return r;
    }
    return clipGeneric();
  }

  global.CleanClipSitesCn = { match, clip, clipGeneric };
})(typeof window !== "undefined" ? window : globalThis);
