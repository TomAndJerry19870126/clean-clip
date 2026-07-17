/**
 * Minimal HTML → Markdown for clip / CleanMD.
 * Covers: headings, p, br, strong/em, a, lists, blockquote, pre/code, img, hr, tables.
 */
(function (global) {
  function textOf(node) {
    return (node.textContent || "").replace(/\u00a0/g, " ");
  }

  function escapeMd(text) {
    return text.replace(/([\\`*_[\]#])/g, "\\$1");
  }

  function escapeTableCell(text) {
    return String(text || "")
      .replace(/\u00a0/g, " ")
      .replace(/\s+/g, " ")
      .replace(/\|/g, "\\|")
      .trim()
      // DeepSeek / border artifacts often leave a dangling trailing "-"
      .replace(/([\p{L}\p{N}\u4e00-\u9fff).）%％])-+\s*$/u, "$1");
  }

  /** Keep GFM tables contiguous (no blank lines between rows). */
  function normalizeMarkdownTables(md) {
    const lines = md.split("\n");
    const out = [];
    let inTable = false;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();
      const isTableLine = /^\|.*\|$/.test(trimmed);
      if (isTableLine) {
        if (!inTable && out.length && out[out.length - 1] !== "") {
          out.push("");
        }
        inTable = true;
        out.push(trimmed);
        continue;
      }
      if (trimmed === "" && inTable) {
        let j = i + 1;
        while (j < lines.length && lines[j].trim() === "") j++;
        if (j < lines.length && /^\|.*\|$/.test(lines[j].trim())) {
          // blank line inside a table — drop it
          continue;
        }
        inTable = false;
        out.push("");
        continue;
      }
      inTable = false;
      out.push(line);
    }
    return out.join("\n");
  }

  /** Zhihu inline entity / 直答 search chips — keep plain text only. */
  function isZhihuEntityLink(href) {
    if (!href) return false;
    try {
      const u = new URL(href, "https://www.zhihu.com");
      const host = u.hostname;
      if (host === "zhida.zhihu.com") return true;
      if (host.endsWith("zhihu.com") && u.pathname.startsWith("/search")) return true;
      if (u.searchParams.has("zhida_source")) return true;
    } catch {
      return /zhida\.zhihu\.com|zhida_source=/.test(href);
    }
    return false;
  }

  /** DeepSeek / similar citation chips — drop from Markdown. */
  function isCitationNoise(el) {
    if (!el || el.nodeType !== 1) return false;
    const cls = (el.className || "").toString();
    if (/ds-markdown-cite|cite-bubble|citation|ref-index|footnote/i.test(cls)) return true;
    if (el.getAttribute("data-footnote") != null) return true;
    if (el.getAttribute("data-citation") != null) return true;
    const t = (el.textContent || "").trim();
    if (/^(a|span|sup|button)$/i.test(el.tagName) && /^\d{1,3}$/.test(t)) {
      if (/cite|ref|footnote|ds-markdown/i.test(cls)) return true;
      if (el.closest("a") && el.closest("a").querySelector("svg")) return true;
    }
    return false;
  }

  function convertTable(tableEl) {
    const rows = Array.from(tableEl.querySelectorAll("tr")).filter(
      (tr) => tr.closest("table") === tableEl,
    );
    if (!rows.length) return "";

    const matrix = rows.map((tr) =>
      Array.from(tr.children)
        .filter((c) => /^(td|th)$/i.test(c.tagName))
        .map((cell) => escapeTableCell(inlineChildren(cell))),
    );
    if (!matrix.length || !matrix[0].length) return "";

    const colCount = Math.max(...matrix.map((r) => r.length));
    const norm = matrix.map((r) => {
      const copy = r.slice();
      while (copy.length < colCount) copy.push("");
      return copy;
    });

    const header = norm[0];
    const sep = header.map(() => "---");
    let out = `\n\n| ${header.join(" | ")} |\n| ${sep.join(" | ")} |\n`;
    for (let i = 1; i < norm.length; i++) {
      out += `| ${norm[i].join(" | ")} |\n`;
    }
    return out + "\n";
  }

  function convert(node) {
    if (!node) return "";
    if (node.nodeType === 3) {
      return node.nodeValue.replace(/\s+/g, " ");
    }
    if (node.nodeType !== 1) return "";

    const el = node;
    const tag = el.tagName.toLowerCase();

    if (el.getAttribute("data-za-detail-view-path-module") === "AnswerItem-status") return "";
    if (tag === "script" || tag === "style" || tag === "svg") return "";
    if (isCitationNoise(el)) return "";

    if (el.classList && el.classList.contains("RichText-LinkCardContainer")) {
      const a = el.querySelector("a[href]");
      if (a) {
        const href = a.getAttribute("href") || "";
        const title = (a.getAttribute("data-text") || textOf(a) || href).trim();
        return `[${escapeMd(title)}](${href})\n\n`;
      }
    }

    if (tag === "br") return "\n";
    if (tag === "hr") {
      // Decorative rules inside DeepSeek table cells must not become "---"/trailing "-"
      if (el.closest && el.closest("table, td, th")) return "";
      return "\n\n---\n\n";
    }

    if (tag === "table") {
      return convertTable(el);
    }
    if (tag === "thead" || tag === "tbody" || tag === "tfoot") {
      return blockChildren(el);
    }
    if (tag === "tr" || tag === "td" || tag === "th") {
      return inlineChildren(el);
    }

    if (/^h[1-6]$/.test(tag)) {
      const level = Number(tag[1]);
      const inner = inlineChildren(el).trim();
      return `\n\n${"#".repeat(level)} ${inner}\n\n`;
    }

    if (tag === "p" || tag === "div") {
      if (
        tag === "div" &&
        el.querySelector("p, h1, h2, h3, ul, ol, pre, blockquote, table")
      ) {
        return blockChildren(el);
      }
      const inner = inlineChildren(el).trim();
      if (!inner) return "";
      return `\n\n${inner}\n\n`;
    }

    if (tag === "strong" || tag === "b") {
      const inner = inlineChildren(el).trim();
      return inner ? `**${inner}**` : "";
    }
    if (tag === "em" || tag === "i") {
      const inner = inlineChildren(el).trim();
      return inner ? `*${inner}*` : "";
    }
    if (tag === "code" && el.parentElement && el.parentElement.tagName.toLowerCase() !== "pre") {
      return "`" + textOf(el).replace(/`/g, "\\`") + "`";
    }
    if (tag === "pre") {
      const code = el.querySelector("code");
      const raw = textOf(code || el).replace(/\n$/, "");
      return `\n\n\`\`\`\n${raw}\n\`\`\`\n\n`;
    }
    if (tag === "blockquote") {
      const inner = blockChildren(el)
        .trim()
        .split("\n")
        .map((l) => `> ${l}`)
        .join("\n");
      return `\n\n${inner}\n\n`;
    }
    if (tag === "a") {
      if (el.querySelector(".ds-markdown-cite") || isCitationNoise(el)) return "";
      const href = el.getAttribute("href") || "";
      const inner = inlineChildren(el).trim() || href;
      if (!href || href.startsWith("javascript:") || isZhihuEntityLink(href)) return inner;
      if (/^#/.test(href) && /^\d+$/.test(inner.replace(/\s/g, ""))) return "";
      return `[${inner}](${href})`;
    }
    if (tag === "img") {
      const src =
        el.getAttribute("src") ||
        el.getAttribute("data-actualsrc") ||
        el.getAttribute("data-original") ||
        "";
      const alt = el.getAttribute("alt") || "image";
      if (!src) return "";
      return `\n\n![${alt}](${src})\n\n`;
    }
    if (tag === "ul" || tag === "ol") {
      const ordered = tag === "ol";
      let i = 1;
      let out = "\n\n";
      for (const child of el.children) {
        if (child.tagName.toLowerCase() !== "li") continue;
        const body = blockChildren(child).trim().replace(/\n+/g, "\n  ");
        out += ordered ? `${i}. ${body}\n` : `- ${body}\n`;
        i += 1;
      }
      return out + "\n";
    }
    if (tag === "li") {
      return blockChildren(el);
    }
    if (tag === "figure") {
      return blockChildren(el);
    }

    return blockChildren(el);
  }

  function inlineChildren(el) {
    let out = "";
    for (const child of el.childNodes) {
      out += convert(child);
    }
    return out;
  }

  function blockChildren(el) {
    let out = "";
    for (const child of el.childNodes) {
      out += convert(child);
    }
    return out;
  }

  function htmlToMarkdown(root) {
    if (!root) return "";
    const work = root.nodeType === 1 ? root.cloneNode(true) : root;
    if (work.querySelectorAll) {
      // DeepSeek citation chips / footnote anchors
      work
        .querySelectorAll(
          [
            ".ds-markdown-cite",
            "[class*='ds-markdown-cite']",
            "[class*='citation']",
            "[class*='Cite']",
            "[data-footnote]",
            "[data-citation]",
            "a[href^='#']",
            "sup",
          ].join(","),
        )
        .forEach((n) => {
          const t = (n.textContent || "").trim();
          if (n.tagName === "A" && n.getAttribute("href")?.startsWith("#")) {
            if (!/^\d{1,3}$/.test(t) && t.length > 3) return;
          }
          if (n.tagName === "SUP" && !/^\d{1,3}$/.test(t)) return;
          const a = n.closest("a");
          if (a && a !== work && (a.textContent || "").trim().length <= 6) {
            a.remove();
          } else {
            n.remove();
          }
        });
    }
    let md = blockChildren(work);
    // Only collapse spaces/tabs — never touch newlines (Markdown tables need them)
    md = md.replace(/[ \t]+\n/g, "\n");
    md = md.replace(/\n{3,}/g, "\n\n");
    md = md.replace(/[ \t]*🔗[ \t]*/g, " ");
    // leftover bare cite numbers in a cell: "万亿元 26 28" → "万亿元"
    md = md.replace(/(\S)[ \t]+(?:\d{1,3}[ \t]+){1,4}(?=\||$)/gm, "$1 ");
    md = md.replace(/[ \t]{2,}/g, " ");
    md = md.replace(/\|[ \t]{2,}/g, "| ");
    md = md.replace(/[ \t]{2,}\|/g, " |");
    md = normalizeMarkdownTables(md);
    return md.trim() + "\n";
  }

  global.ZhihuClipHtml2Md = { htmlToMarkdown };
})(typeof window !== "undefined" ? window : globalThis);
