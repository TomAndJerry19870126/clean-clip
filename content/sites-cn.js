/**
 * Content sites → clean Markdown.
 * CN mainstream (news / social / tech / ecommerce) + overseas social.
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

  // ——— Twitter / X ———

  function twitterHandleFromUserBlock(userEl) {
    if (!userEl) return "";
    for (const a of qa('a[href^="/"]', userEl)) {
      const href = (a.getAttribute("href") || "").split("?")[0];
      if (/^\/[A-Za-z0-9_]{1,15}\/?$/.test(href)) {
        return href.replace(/\//g, "");
      }
    }
    const m = text(userEl).match(/@([A-Za-z0-9_]{1,15})/);
    return m ? m[1] : "";
  }

  function twitterAuthor(article) {
    const user = q('[data-testid="User-Name"]', article);
    if (!user) return "";
    const handle = twitterHandleFromUserBlock(user);
    const display = text(user)
      .replace(/@[\w]+/g, "")
      .replace(/\s*·.*$/, "")
      .replace(/\s+/g, " ")
      .trim();
    if (display && handle) return `${display} (@${handle})`;
    if (handle) return `@${handle}`;
    return display;
  }

  function twitterStatusId(article) {
    for (const a of qa('a[href*="/status/"]', article)) {
      const m = (a.getAttribute("href") || "").match(/\/status\/(\d+)/);
      if (m) return m[1];
    }
    return "";
  }

  function twitterTweetMarkdown(article) {
    const parts = [];
    const textEl = q('[data-testid="tweetText"]', article);
    if (textEl) {
      const md = toMd(cleanClone(textEl, ['[role="button"]']));
      if (md) parts.push(md);
    }

    const imgUrls = [];
    for (const img of qa(
      '[data-testid="tweetPhoto"] img, a[href*="/photo/"] img, img[src*="pbs.twimg.com/media"]',
      article
    )) {
      const src = (img.getAttribute("src") || "").replace(/&name=\w+/, "&name=large");
      if (src && !imgUrls.includes(src)) imgUrls.push(src);
    }
    for (const src of imgUrls) parts.push(`![image](${src})`);

    const quote = q('[data-testid="quoteTweet"]', article);
    if (quote) {
      const qAuthor = twitterAuthor(quote) || text(q('[data-testid="User-Name"]', quote));
      const qText = q('[data-testid="tweetText"]', quote);
      const qMd = qText ? toMd(cleanClone(qText)) : text(quote);
      if (qMd) {
        parts.push(
          ["> **引用推文**" + (qAuthor ? ` · ${qAuthor}` : ""), ...qMd.split("\n").map((l) => `> ${l}`)].join(
            "\n"
          )
        );
      }
    }

    if (!parts.length) {
      const fallback = text(article).slice(0, 2000);
      if (fallback) parts.push(fallback);
    }
    return parts.join("\n\n").trim();
  }

  function clipTwitter() {
    const statusId = (location.pathname.match(/\/status\/(\d+)/) || [])[1] || null;
    const articles = qa('article[data-testid="tweet"]');
    if (!articles.length) {
      return {
        ok: false,
        error: "找不到推文。请打开单条推文详情页（URL 含 /status/），等加载完后再试。",
      };
    }

    let main = articles[0];
    if (statusId) {
      const hit = articles.find((a) => twitterStatusId(a) === statusId);
      if (hit) main = hit;
    }

    const author = twitterAuthor(main);
    const mainHandle = twitterHandleFromUserBlock(q('[data-testid="User-Name"]', main));
    const mainMd = twitterTweetMarkdown(main);
    const blocks = [mainMd];

    // Same-author thread continuation under this status page
    if (statusId && mainHandle) {
      let n = 0;
      for (const art of articles) {
        if (art === main) continue;
        if (twitterHandleFromUserBlock(q('[data-testid="User-Name"]', art)) !== mainHandle) continue;
        const md = twitterTweetMarkdown(art);
        if (!md) continue;
        n += 1;
        blocks.push(`### 续 ${n}\n\n${md}`);
        if (n >= 20) break;
      }
    }

    const title =
      (mainMd.split("\n").find((l) => l.trim()) || "").replace(/^#+\s*/, "").slice(0, 80) ||
      titleFrom() ||
      `Tweet by ${author || "unknown"}`;

    return pack({
      kind: statusId ? "twitter-status" : "twitter-feed",
      title,
      author,
      extraMeta: statusId ? [`推文 ID：${statusId}`] : [],
      bodyMarkdown: blocks.filter(Boolean).join("\n\n"),
    });
  }

  // ——— Reddit ———

  function clipRedditOld() {
    const thing =
      q(".thing.link:not(.promoted)") ||
      q("#siteTable .thing.link") ||
      q(".linkthing, .thing");
    const title =
      text(q("a.title", thing)) ||
      titleFrom("a.title", "h1");
    const author =
      text(q("a.author", thing)) ||
      text(q(".tagline .author"));
    const sub = text(q("a.subreddit", thing)) || (location.pathname.match(/\/r\/([^/]+)/) || [])[1] || "";
    const selfMd = (() => {
      const body = q(".usertext-body .md", thing) || q(".expando .usertext-body .md");
      return body ? toMd(cleanClone(body)) : "";
    })();
    const linkUrl = q("a.title", thing)?.href || "";
    const parts = [];
    if (selfMd) parts.push(selfMd);
    else if (linkUrl && !linkUrl.includes("reddit.com")) parts.push(`[链接](${linkUrl})`);

    const comments = qa(".commentarea .comment .usertext-body .md")
      .slice(0, 30)
      .map((el, i) => {
        const who = text(el.closest(".comment")?.querySelector("a.author"));
        return `### 评论 ${i + 1}${who ? ` · ${who}` : ""}\n\n${toMd(cleanClone(el))}`;
      })
      .join("\n\n");
    if (comments) parts.push(`## 评论（前 30 条）\n\n${comments}`);

    return pack({
      kind: "reddit-post",
      title,
      author,
      extraMeta: [sub ? `版块：r/${sub.replace(/^r\//, "")}` : ""],
      bodyMarkdown: parts.join("\n\n") || title,
    });
  }

  function clipRedditNew() {
    const post =
      q("shreddit-post") ||
      q('[data-testid="post-container"]') ||
      q("div[data-test-id='post-content']")?.closest("div") ||
      q("main");

    const title =
      text(q('h1[slot="title"], [slot="title"] h1, h1', post)) ||
      text(q("h1")) ||
      titleFrom("h1");
    const author =
      text(q('[slot="authorName"] a, a[href*="/user/"]', post)) ||
      text(q('a[href*="/user/"]')) ||
      "";
    const sub =
      text(q('a[href*="/r/"]', post)) ||
      (location.pathname.match(/\/r\/([^/]+)/) || [])[1] ||
      "";

    const bodyEl =
      q('[slot="text-body"]', post) ||
      q('[data-click-id="text"]', post) ||
      q(".md", post) ||
      q('[property="schema:articleBody"]', post) ||
      q("div[data-test-id='post-content'] .md") ||
      q("shreddit-post [slot='text-body']");

    const parts = [];
    if (bodyEl) {
      const md = toMd(cleanClone(bodyEl, ["faceplate-tracker", "shreddit-async-loader"]));
      if (md) parts.push(md);
    } else {
      const ext = q('a[slot="outbound-link"], a[data-testid="outbound-link"]', post);
      if (ext?.href) parts.push(`[链接](${ext.href})`);
    }

    const commentBodies = qa(
      'shreddit-comment [slot="comment"], shreddit-comment .md, [data-testid="comment"] .md'
    ).slice(0, 30);
    if (commentBodies.length) {
      const comments = commentBodies
        .map((el, i) => {
          const root = el.closest("shreddit-comment") || el.closest("[data-testid='comment']");
          const who =
            text(q('a[href*="/user/"]', root)) ||
            (root?.getAttribute?.("author") || "");
          return `### 评论 ${i + 1}${who ? ` · ${who}` : ""}\n\n${toMd(cleanClone(el))}`;
        })
        .join("\n\n");
      parts.push(`## 评论（前 30 条）\n\n${comments}`);
    }

    return pack({
      kind: "reddit-post",
      title,
      author: author.replace(/^u\//, ""),
      extraMeta: [sub ? `版块：r/${String(sub).replace(/^\/?r\//, "")}` : ""],
      bodyMarkdown: parts.join("\n\n") || title,
    });
  }

  function clipReddit() {
    if (
      location.hostname.startsWith("old.") ||
      q("#siteTable .thing.link") ||
      q(".commentarea .comment")
    ) {
      const r = clipRedditOld();
      if (r?.ok) return r;
    }
    return clipRedditNew();
  }

  // ——— Meta / social helpers ———

  function metaContent(...attrs) {
    for (const a of attrs) {
      const el =
        q(`meta[property="${a}"]`) ||
        q(`meta[name="${a}"]`) ||
        q(`meta[itemprop="${a}"]`);
      const v = el?.getAttribute("content")?.trim();
      if (v) return v;
    }
    return "";
  }

  function absUrl(href) {
    if (!href) return "";
    try {
      return new URL(href, location.href).href;
    } catch (_) {
      return href;
    }
  }

  function mdImagesFrom(urls) {
    const seen = [];
    for (const u of urls || []) {
      const src = absUrl(u);
      if (src && !seen.includes(src)) seen.push(src);
    }
    return seen.map((src) => `![image](${src})`).join("\n\n");
  }

  function collectImgSrcs(root, limit) {
    const out = [];
    const max = limit || 12;
    for (const img of qa("img", root || document)) {
      const src =
        img.getAttribute("src") ||
        img.getAttribute("data-src") ||
        img.currentSrc ||
        "";
      if (
        !src ||
        src.startsWith("data:") ||
        src.includes("emoji") ||
        (src.includes("static.xx.fbcdn") && src.includes("/rsrc.php"))
      )
        continue;
      if (/avatar|profile|icon|logo|sprite|blank/i.test(src) && src.length < 120) continue;
      const abs = absUrl(src);
      if (abs && !out.includes(abs)) out.push(abs);
      if (out.length >= max) break;
    }
    return out;
  }

  // ——— Instagram ———

  function clipInstagram() {
    const path = location.pathname;
    const isPost = /\/(p|reel|tv|reels)\//.test(path);
    const author =
      text(q('header a[href^="/"]')) ||
      text(q('a[role="link"][href^="/"]')) ||
      (metaContent("og:title") || "").replace(/\s*[•·].*$/, "").trim() ||
      (path.match(/^\/([^/]+)/) || [])[1] ||
      "";

    let caption =
      text(q('h1 + div span, [class*="Caption"] span, ul li span')) ||
      metaContent("og:description", "description") ||
      "";
    // og:description often "xxx: caption" or "xxx on Instagram: …"
    const ogDesc = metaContent("og:description");
    if (ogDesc) {
      const m = ogDesc.match(/Instagram:\s*[“"«]?([\s\S]+?)[”"»]?\s*$/i) || ogDesc.match(/:\s*[“"]([\s\S]+)[”"]\s*$/);
      if (m?.[1]) caption = m[1].trim();
      else if (!caption) caption = ogDesc;
    }

    const imgs = [];
    const ogImg = metaContent("og:image");
    if (ogImg) imgs.push(ogImg);
    imgs.push(...collectImgSrcs(q("article") || q("main") || document, 8));

    const parts = [];
    if (caption) parts.push(caption);
    const imgMd = mdImagesFrom(imgs);
    if (imgMd) parts.push(imgMd);

    if (!parts.length) {
      return {
        ok: false,
        error: isPost
          ? "找不到帖文内容，请等图片/文案加载完后再试（需登录时请先登录）。"
          : "请打开单条帖子 / Reels 详情页后再摘录。",
      };
    }

    const title =
      (caption.split("\n").find((l) => l.trim()) || "").slice(0, 80) ||
      `Instagram · ${author || "post"}`;

    return pack({
      kind: /\/reel/.test(path) ? "instagram-reel" : "instagram-post",
      title,
      author: author.replace(/^@/, ""),
      bodyMarkdown: parts.join("\n\n"),
    });
  }

  // ——— Facebook ———

  function clipFacebook() {
    const articles = qa('[role="article"]');
    let best = null;
    let bestLen = 0;
    for (const art of articles.slice(0, 12)) {
      const msg =
        q('[data-ad-preview="message"], [data-ad-comet-preview="message"], [data-ad-rendering-role="story_message"]', art) ||
        q('div[dir="auto"]', art);
      const len = text(msg || art).length;
      if (len > bestLen) {
        bestLen = len;
        best = art;
      }
    }

    const msgEl =
      (best &&
        (q('[data-ad-preview="message"], [data-ad-comet-preview="message"], [data-ad-rendering-role="story_message"]', best) ||
          q('div[dir="auto"]', best))) ||
      q('[data-ad-preview="message"], [data-ad-comet-preview="message"]');

    let bodyText = msgEl ? text(msgEl) : "";
    if (!bodyText || bodyText.length < 8) {
      bodyText = metaContent("og:description", "description") || bodyText;
    }

    const author =
      (best &&
        text(
          q(
            'h2 a, h3 a, strong a, a[role="link"][tabindex="0"]',
            best
          )
        )) ||
      metaContent("og:title")?.split(/[|–—-]/)[0].trim() ||
      "";

    const imgs = [];
    const ogImg = metaContent("og:image");
    if (ogImg) imgs.push(ogImg);
    if (best) imgs.push(...collectImgSrcs(best, 8));

    const parts = [];
    if (bodyText) parts.push(bodyText);
    const imgMd = mdImagesFrom(imgs);
    if (imgMd) parts.push(imgMd);

    if (!parts.length) {
      return {
        ok: false,
        error: "找不到帖文。请打开公开帖子详情页，等加载完后再试（登录墙可能导致失败）。",
      };
    }

    const title =
      (bodyText.split("\n").find((l) => l.trim()) || "").slice(0, 80) ||
      metaContent("og:title") ||
      `Facebook · ${author || "post"}`;

    return pack({
      kind: "facebook-post",
      title,
      author,
      bodyMarkdown: parts.join("\n\n"),
    });
  }

  // ——— Threads ———

  function clipThreads() {
    const posts = qa('[data-pressable-container="true"], article, [class*="post"]');
    let main = posts[0] || q("main");
    // Prefer post matching URL id
    const id = (location.pathname.match(/\/post\/([^/]+)/) || [])[1];

    let bodyText = "";
    let author = "";
    if (main) {
      author =
        text(q('a[href^="/@"], a[href*="/@"]', main)) ||
        text(q('a[href^="/"]', main));
      const spans = qa('span, div[dir="auto"]', main)
        .map((el) => text(el))
        .filter((t) => t.length > 20)
        .sort((a, b) => b.length - a.length);
      bodyText = spans[0] || text(main).slice(0, 3000);
    }
    if (!bodyText) bodyText = metaContent("og:description", "description");
    if (!author) {
      author =
        (metaContent("og:title") || "").replace(/\s*[•·:].*$/, "").trim() ||
        (location.pathname.match(/^\/@?([^/]+)/) || [])[1] ||
        "";
    }

    const imgs = [];
    const ogImg = metaContent("og:image");
    if (ogImg) imgs.push(ogImg);
    if (main) imgs.push(...collectImgSrcs(main, 8));

    const parts = [];
    if (bodyText) parts.push(bodyText);
    const imgMd = mdImagesFrom(imgs);
    if (imgMd) parts.push(imgMd);

    if (!parts.length) {
      return {
        ok: false,
        error: "找不到 Threads 帖文，请打开单条帖子详情后再试。",
      };
    }

    return pack({
      kind: "threads-post",
      title: (bodyText.split("\n").find((l) => l.trim()) || "").slice(0, 80) || `Threads · ${author}`,
      author: author.replace(/^@/, ""),
      extraMeta: id ? [`帖子：${id}`] : [],
      bodyMarkdown: parts.join("\n\n"),
    });
  }

  // ——— LinkedIn ———

  function clipLinkedin() {
    const path = location.pathname;

    // Long-form Pulse / newsletter article
    if (path.includes("/pulse/") || path.includes("/newsletter/")) {
      return pack({
        kind: "linkedin-article",
        title: titleFrom("h1", ".article-title", ".reader-article-header__title"),
        author: text(q(".article-author, .reader-author-info__name, .base-main-card__title")),
        bodyEl: cleanClone(
          q(
            ".article-content, .reader-article-content, .pulse-article, article .article-main__content, .core-section-container__content"
          ),
          [".comments-comment-list", ".social-action-bar"]
        ),
      });
    }

    const update =
      q(".feed-shared-update-v2") ||
      q('[data-urn*="activity"]') ||
      q("article.main-feed-activity-card") ||
      q(".update-components-update") ||
      q("main");

    const author =
      text(
        q(
          ".update-components-actor__name, .feed-shared-actor__name, .update-components-actor__title span[aria-hidden='true'], a.app-aware-link span[dir='ltr']",
          update
        )
      ) || text(q(".update-components-actor__name"));

    const textEl =
      q(
        ".feed-shared-update-v2__description, .update-components-text, .feed-shared-text, .break-words",
        update
      ) || q(".update-components-text");

    let bodyText = textEl ? toMd(cleanClone(textEl)) : "";
    if (!bodyText) bodyText = metaContent("og:description", "description");

    const imgs = [];
    const ogImg = metaContent("og:image");
    if (ogImg) imgs.push(ogImg);
    if (update) imgs.push(...collectImgSrcs(update, 6));

    const parts = [];
    if (bodyText) parts.push(bodyText);
    const imgMd = mdImagesFrom(imgs);
    if (imgMd) parts.push(imgMd);

    if (!parts.length) {
      return {
        ok: false,
        error: "找不到动态内容。请打开单条帖子或文章页，展开全文后再试。",
      };
    }

    return pack({
      kind: "linkedin-post",
      title:
        (bodyText.split("\n").find((l) => l.trim()) || "").slice(0, 80) ||
        metaContent("og:title") ||
        `LinkedIn · ${author || "post"}`,
      author,
      bodyMarkdown: parts.join("\n\n"),
    });
  }

  // ——— TikTok ———

  function clipTiktok() {
    const author =
      text(q('[data-e2e="browse-username"], [data-e2e="user-title"], h2[data-e2e="user-subtitle"]')) ||
      text(q('a[href^="/@"]')) ||
      (location.pathname.match(/\/@([^/]+)/) || [])[1] ||
      "";
    let desc =
      text(q('[data-e2e="browse-video-desc"], [data-e2e="video-desc"], h1')) ||
      metaContent("og:description", "description") ||
      "";
    const title =
      text(q('h1')) ||
      metaContent("og:title") ||
      (desc.split("\n").find((l) => l.trim()) || "").slice(0, 80) ||
      `TikTok · ${author || "video"}`;

    const imgs = [];
    const ogImg = metaContent("og:image");
    if (ogImg) imgs.push(ogImg);
    imgs.push(...collectImgSrcs(q("main") || document, 4));

    const parts = [];
    if (desc) parts.push(desc);
    const imgMd = mdImagesFrom(imgs);
    if (imgMd) parts.push(imgMd);
    if (!parts.length && title) parts.push(title);

    if (!parts.length) {
      return { ok: false, error: "找不到视频描述，请打开单条视频页后再试。" };
    }

    return pack({
      kind: "tiktok-video",
      title,
      author: author.replace(/^@/, ""),
      bodyMarkdown: parts.join("\n\n"),
    });
  }

  // ——— YouTube ———

  function clipYoutube() {
    const title =
      text(q("h1.ytd-watch-metadata yt-formatted-string, h1 yt-formatted-string, h1")) ||
      metaContent("og:title") ||
      titleFrom("h1");
    const author =
      text(q("#channel-name a, ytd-channel-name a, #owner #text a, #upload-info a")) ||
      metaContent("og:video:tag") ||
      "";
    const descEl =
      q("#description-inline-expander, #description, ytd-text-inline-expander, #info-container #description");
    let desc = descEl ? text(descEl) : "";
    if (!desc || desc.length < 10) desc = metaContent("og:description", "description") || "";

    // Trim YouTube UI noise
    desc = desc
      .replace(/\n?Show more\s*$/i, "")
      .replace(/\n?显示更多\s*$/i, "")
      .trim();

    const parts = [];
    if (desc) parts.push(desc);
    const ogImg = metaContent("og:image");
    if (ogImg) parts.push(mdImagesFrom([ogImg]));

    if (!parts.length && !title) {
      return { ok: false, error: "找不到视频信息，请打开 watch 页面并展开简介后再试。" };
    }

    return pack({
      kind: "youtube-video",
      title: title || "YouTube",
      author,
      bodyMarkdown: parts.join("\n\n") || title,
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

  // ——— More CN mainstream ———

  function clipWeibo() {
    if (
      /\/ttarticle\//.test(location.pathname) ||
      q(".WB_editor_iframe_new, .WB_editor_iframe, .main_editor")
    ) {
      const body = q(
        ".WB_editor_iframe_new, .WB_editor_iframe, .article-content, .main_editor, .content"
      );
      if (body) {
        return pack({
          kind: "weibo-article",
          title: titleFrom("h1", ".title", ".Article_title"),
          author: text(q(".name, .author, .W_f14 a")),
          bodyEl: cleanClone(body),
        });
      }
    }

    const cards = qa(
      '.wb-item, .Feed_body, [node-type="feed_list_content"], .detail_wbtext_4CRf9, .WB_text, article'
    );
    let best = null;
    let bestLen = 0;
    for (const el of cards.slice(0, 20)) {
      const t = text(el);
      if (t.length > bestLen) {
        bestLen = t.length;
        best = el;
      }
    }
    const bodyText =
      (best && text(best)) ||
      metaContent("og:description", "description") ||
      "";
    const author =
      text(q(".username, .name, .Feed_head a, header a, .woo-box-flex a")) ||
      (metaContent("og:title") || "").split(/[-_|]/)[0].trim();
    const imgs = [];
    const ogImg = metaContent("og:image");
    if (ogImg) imgs.push(ogImg);
    if (best) imgs.push(...collectImgSrcs(best.closest("article, .wb-item, .Feed") || best, 9));

    const parts = [];
    if (bodyText) parts.push(bodyText);
    const imgMd = mdImagesFrom(imgs);
    if (imgMd) parts.push(imgMd);
    if (!parts.length) {
      return { ok: false, error: "找不到微博正文，请打开单条微博详情后再试。" };
    }
    return pack({
      kind: "weibo-status",
      title: (bodyText.split("\n").find((l) => l.trim()) || "").slice(0, 80) || `微博 · ${author}`,
      author,
      bodyMarkdown: parts.join("\n\n"),
    });
  }

  function clipXiaohongshu() {
    const note =
      q("#detail-desc, .note-content, .desc, .note-text, [class*='desc']") ||
      q("article") ||
      q("main");
    let caption =
      text(q("#detail-desc .note-text, .note-text, #detail-desc, .desc")) ||
      metaContent("og:description", "description") ||
      "";
    const author =
      text(q(".username, .name, .author-wrapper .username, a.name")) ||
      (metaContent("og:title") || "").split(/[-_·]/)[0].trim();
    const title =
      text(q("#detail-title, .title, h1")) ||
      metaContent("og:title") ||
      (caption.split("\n").find((l) => l.trim()) || "").slice(0, 80) ||
      `小红书 · ${author || "笔记"}`;

    const imgs = [];
    const ogImg = metaContent("og:image");
    if (ogImg) imgs.push(ogImg);
    imgs.push(...collectImgSrcs(note || document, 12));

    const parts = [];
    if (caption) parts.push(caption);
    const imgMd = mdImagesFrom(imgs);
    if (imgMd) parts.push(imgMd);
    if (!parts.length) {
      return { ok: false, error: "找不到笔记内容，请打开笔记详情页（可能需登录）后再试。" };
    }
    return pack({
      kind: "xhs-note",
      title,
      author,
      bodyMarkdown: parts.join("\n\n"),
    });
  }

  function clipDouyin() {
    const author =
      text(q('[data-e2e="user-info"] a, [data-e2e="browse-user-avatar"] + div, h1 a, .account')) ||
      (location.pathname.match(/\/user\/([^/]+)/) || [])[1] ||
      "";
    let desc =
      text(q('[data-e2e="video-desc"], [data-e2e="browse-video-desc"], .video-info-detail h1, .desc')) ||
      metaContent("og:description", "description") ||
      "";
    const title =
      text(q("h1")) ||
      metaContent("og:title") ||
      (desc.split("\n").find((l) => l.trim()) || "").slice(0, 80) ||
      `抖音 · ${author || "视频"}`;
    const parts = [];
    if (desc) parts.push(desc);
    const ogImg = metaContent("og:image");
    if (ogImg) parts.push(mdImagesFrom([ogImg]));
    if (!parts.length) {
      return { ok: false, error: "找不到视频描述，请打开单条视频页后再试。" };
    }
    return pack({
      kind: "douyin-video",
      title,
      author: author.replace(/^@/, ""),
      bodyMarkdown: parts.join("\n\n"),
    });
  }

  function clipToutiao() {
    return pack({
      kind: "toutiao-article",
      title: titleFrom("h1", ".article-title", ".title"),
      author: text(q(".user-info .name, .author-name, .name a, .article-meta .name")),
      bodyEl: cleanClone(
        q(
          ".article-content, .syl-article-base, article, .tt-article-content, #article-content"
        ),
        [".ad-wrap", ".recommend", ".comment"]
      ),
    });
  }

  function clipKuaishou() {
    const desc =
      text(q('[class*="video-info"] [class*="desc"], .video-info-desc, h1')) ||
      metaContent("og:description", "description") ||
      "";
    const author =
      text(q('[class*="author"] a, .profile-user-name, a[href*="/profile/"]')) ||
      "";
    const title =
      metaContent("og:title") ||
      (desc.split("\n").find((l) => l.trim()) || "").slice(0, 80) ||
      `快手 · ${author || "视频"}`;
    const parts = [];
    if (desc) parts.push(desc);
    const ogImg = metaContent("og:image");
    if (ogImg) parts.push(mdImagesFrom([ogImg]));
    if (!parts.length) {
      return { ok: false, error: "找不到快手内容，请打开作品详情后再试。" };
    }
    return pack({
      kind: "kuaishou-video",
      title,
      author,
      bodyMarkdown: parts.join("\n\n"),
    });
  }

  function clipTencentNews() {
    return pack({
      kind: "qq-news",
      title: titleFrom("h1", ".title, #ArticleTitle"),
      author: text(q(".author, .a_source, .color-text-secondary a, .article-info a")),
      bodyEl: cleanClone(
        q("#ArticleContent, .content-article, .article-content, .rich_media_content, article"),
        [".ap-news", ".recommend", ".comment"]
      ),
    });
  }

  function clipThepaper() {
    return pack({
      kind: "thepaper-news",
      title: titleFrom("h1", ".index_title__"),
      author: text(q(".index_author__, .author, .name")),
      bodyEl: cleanClone(q(".index_cententWrap__, .news_txt, .content, article"), [
        ".index_relatednews__",
      ]),
    });
  }

  function clipHuxiu() {
    return pack({
      kind: "huxiu-article",
      title: titleFrom("h1", ".article__title"),
      author: text(q(".author-info__username, .user-info__name, .username")),
      bodyEl: cleanClone(q(".article__content, .article-content-wrap, .article-content")),
    });
  }

  function clipSohu() {
    return pack({
      kind: "sohu-article",
      title: titleFrom("h1", ".text-title h1"),
      author: text(q(".user-info .name, #user-info .name, .article-info span")),
      bodyEl: cleanClone(q("#mp-editor, .article, article.article, #article-content")),
    });
  }

  function clipNetEase() {
    return pack({
      kind: "netease-article",
      title: titleFrom("h1", ".post_title, .title"),
      author: text(q(".post_info a, .author, .name")),
      bodyEl: cleanClone(
        q("#content, .post_body, .post_text, .article-content, .content, #endText"),
        ["#js_n_anti"]
      ),
    });
  }

  function clipSina() {
    return pack({
      kind: "sina-article",
      title: titleFrom("h1", "#artibodyTitle, .main-title"),
      author: text(q(".author, .from a, .date-source a")),
      bodyEl: cleanClone(q("#artibody, .article, #article_content, .article-content")),
    });
  }

  function clipOschina() {
    return pack({
      kind: "oschina-article",
      title: titleFrom("h1", ".article-detail h1"),
      author: text(q(".user-name, .author, a.name")),
      bodyEl: cleanClone(q(".article-detail .content, .content.editor-viewer, #articleContent")),
    });
  }

  function clipInfoq() {
    return pack({
      kind: "infoq-article",
      title: titleFrom("h1", ".article-title"),
      author: text(q(".author, .name, .article-author a")),
      bodyEl: cleanClone(q(".article-content, .article-detail, .RichContent")),
    });
  }

  function clipWoshipm() {
    return pack({
      kind: "woshipm-article",
      title: titleFrom("h2.artic-title, h1, .article--title"),
      author: text(q(".author, .user-name, .name")),
      bodyEl: cleanClone(q(".artic-content, .article--content, .graphical-content")),
    });
  }

  function clipSmzdm() {
    return pack({
      kind: "smzdm-article",
      title: titleFrom("h1", ".title"),
      author: text(q(".author, .name, .user-name")),
      bodyEl: cleanClone(
        q("#articleTxt, .articleTxt, .txt-detail, .item-descrip, .describe"),
        [".related", ".comment"]
      ),
    });
  }

  function clipXueqiu() {
    const status = q(".article__bd, .status-content, .detail__content, article");
    const body =
      q(".article__bd, .status-content .content, .detail__content, .article__content") || status;
    return pack({
      kind: "xueqiu-post",
      title: titleFrom("h1", ".article__hd h1", ".status-title") || titleFrom(),
      author: text(q(".avatar__name, .user-name, .name, a.user-name")),
      bodyEl: cleanClone(body, [".comment", ".related"]),
    });
  }

  function clipHupu() {
    return pack({
      kind: "hupu-thread",
      title: titleFrom("h1", ".bbs-title, .headline"),
      author: text(q(".author, .user-name, .bbs-author a")),
      bodyEl: cleanClone(
        q(".thread-content, .bbs-content, .article-content, #content, .thread-content-detail"),
        [".recommend"]
      ),
    });
  }

  function clipGuokr() {
    return pack({
      kind: "guokr-article",
      title: titleFrom("h1", ".content-title"),
      author: text(q(".author, .name")),
      bodyEl: cleanClone(q(".content-txt, .styled-content, article, .documentContent")),
    });
  }

  function clipJiemian() {
    return pack({
      kind: "jiemian-news",
      title: titleFrom("h1", ".article-header h1"),
      author: text(q(".author, .name, .article-info a")),
      bodyEl: cleanClone(q(".article-content, .article_content, article")),
    });
  }

  function clipYuque() {
    return pack({
      kind: "yuque-doc",
      title: titleFrom("h1", ".title, .ne-viewer-body h1"),
      author: text(q(".user-name, .author, .name")),
      bodyEl: cleanClone(
        q(".ne-viewer-body, .lake-content, .yuque-doc-content, #content, article"),
        [".ne-comment", ".reader-catalog"]
      ),
    });
  }

  function clipBilibiliVideo() {
    const title =
      text(q("h1.video-title, h1[title], .video-info-title h1, h1")) ||
      metaContent("og:title") ||
      titleFrom("h1");
    const author =
      text(q(".up-name, .username, a.up-name, .l-info .name")) ||
      "";
    let desc =
      text(q(".desc-info-text, #v_desc, .video-desc, .basic-desc-info")) ||
      metaContent("og:description", "description") ||
      "";
    desc = desc.replace(/\n?展开\s*$/i, "").trim();
    const parts = [];
    if (desc) parts.push(desc);
    const ogImg = metaContent("og:image");
    if (ogImg) parts.push(mdImagesFrom([ogImg]));
    return pack({
      kind: "bilibili-video",
      title,
      author,
      bodyMarkdown: parts.join("\n\n") || title,
    });
  }

  function clipNowcoder() {
    return pack({
      kind: "nowcoder-post",
      title: titleFrom("h1", ".title, .topic-title"),
      author: text(q(".user-name, .name, .author")),
      bodyEl: cleanClone(
        q(".post-topic-des, .topic-content, .nc-post-content, .content, .answer-content")
      ),
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
    if (host.endsWith("bilibili.com")) {
      if (path.includes("/read/") || path.includes("/opus/")) return "bili-read";
      if (path.includes("/video/") || path.startsWith("/BV") || path.includes("/bangumi/"))
        return "bili-video";
    }
    if (host.endsWith("36kr.com")) return "36kr";
    if (host.endsWith("ithome.com")) return "ithome";
    if (host.includes("cloud.tencent.com") && path.includes("/developer/")) return "tencent-cloud";
    if (host.includes("developer.aliyun.com")) return "aliyun-dev";
    if (host.endsWith("51cto.com")) return "51cto";
    if (host.endsWith("jb51.net")) return "jb51";
    if (host.endsWith("douban.com")) return "douban";

    // CN social / news / community
    if (host.endsWith("weibo.com") || host.endsWith("weibo.cn")) return "weibo";
    if (host.endsWith("xiaohongshu.com") || host.endsWith("xhslink.com")) return "xhs";
    if (host.endsWith("douyin.com") || host.endsWith("iesdouyin.com")) return "douyin";
    if (host.endsWith("toutiao.com") || host.includes("toutiao.com")) return "toutiao";
    if (host.endsWith("kuaishou.com") || host.endsWith("chenzhongtech.com")) return "kuaishou";
    if (host.endsWith("qq.com") && (host.startsWith("new.") || host.startsWith("news.") || host.includes("view.inews")))
      return "qq-news";
    if (host.endsWith("thepaper.cn")) return "thepaper";
    if (host.endsWith("huxiu.com")) return "huxiu";
    if (host.endsWith("sohu.com") && (path.includes("/a/") || path.includes("/n/") || q("#mp-editor, article")))
      return "sohu";
    if (
      (host.endsWith("163.com") || host.includes("163.com")) &&
      (path.includes("/article/") || path.includes("/blog/") || host.includes("dy.") || q("#content, .post_body"))
    )
      return "netease";
    if (host.includes("sina.com.cn") || host.endsWith("sina.cn")) return "sina";
    if (host.endsWith("oschina.net")) return "oschina";
    if (host.endsWith("infoq.cn")) return "infoq";
    if (host.endsWith("woshipm.com")) return "woshipm";
    if (host.endsWith("smzdm.com")) return "smzdm";
    if (host.endsWith("xueqiu.com")) return "xueqiu";
    if (host.endsWith("hupu.com")) return "hupu";
    if (host.endsWith("guokr.com")) return "guokr";
    if (host.endsWith("jiemian.com")) return "jiemian";
    if (host.endsWith("yuque.com")) return "yuque";
    if (host.endsWith("nowcoder.com")) return "nowcoder";

    if (
      host === "x.com" ||
      host === "twitter.com" ||
      host.endsWith(".x.com") ||
      host.endsWith(".twitter.com")
    ) {
      return "twitter";
    }
    if (host === "reddit.com" || host.endsWith(".reddit.com")) {
      return "reddit";
    }
    if (host === "instagram.com" || host.endsWith(".instagram.com")) {
      return "instagram";
    }
    if (
      host === "facebook.com" ||
      host.endsWith(".facebook.com") ||
      host === "fb.com" ||
      host.endsWith(".fb.com") ||
      host === "fb.watch"
    ) {
      return "facebook";
    }
    if (host === "threads.net" || host.endsWith(".threads.net")) {
      return "threads";
    }
    if (host === "linkedin.com" || host.endsWith(".linkedin.com")) {
      return "linkedin";
    }
    if (host === "tiktok.com" || host.endsWith(".tiktok.com")) {
      return "tiktok";
    }
    if (
      host === "youtube.com" ||
      host.endsWith(".youtube.com") ||
      host === "youtu.be" ||
      host === "m.youtube.com"
    ) {
      return "youtube";
    }

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
      case "bili-video":
        return clipBilibiliVideo();
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
      case "weibo":
        return clipWeibo();
      case "xhs":
        return clipXiaohongshu();
      case "douyin":
        return clipDouyin();
      case "toutiao":
        return clipToutiao();
      case "kuaishou":
        return clipKuaishou();
      case "qq-news":
        return clipTencentNews();
      case "thepaper":
        return clipThepaper();
      case "huxiu":
        return clipHuxiu();
      case "sohu":
        return clipSohu();
      case "netease":
        return clipNetEase();
      case "sina":
        return clipSina();
      case "oschina":
        return clipOschina();
      case "infoq":
        return clipInfoq();
      case "woshipm":
        return clipWoshipm();
      case "smzdm":
        return clipSmzdm();
      case "xueqiu":
        return clipXueqiu();
      case "hupu":
        return clipHupu();
      case "guokr":
        return clipGuokr();
      case "jiemian":
        return clipJiemian();
      case "yuque":
        return clipYuque();
      case "nowcoder":
        return clipNowcoder();
      case "twitter":
        return clipTwitter();
      case "reddit":
        return clipReddit();
      case "instagram":
        return clipInstagram();
      case "facebook":
        return clipFacebook();
      case "threads":
        return clipThreads();
      case "linkedin":
        return clipLinkedin();
      case "tiktok":
        return clipTiktok();
      case "youtube":
        return clipYoutube();
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
