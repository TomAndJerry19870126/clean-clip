/**
 * Export clipped Markdown to Word (.doc) and Excel (.xls SpreadsheetML).
 * Pure client-side, no external deps.
 */
const ClipExport = (() => {
  function escapeHtml(s) {
    return String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function escapeXml(s) {
    return escapeHtml(s).replace(/\n/g, "&#10;");
  }

  function inlineMd(text) {
    let s = escapeHtml(text);
    s = s.replace(/`([^`]+)`/g, "<code>$1</code>");
    s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    s = s.replace(/__([^_]+)__/g, "<strong>$1</strong>");
    s = s.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, "<em>$1</em>");
    s = s.replace(/(?<!_)_([^_]+)_(?!_)/g, "<em>$1</em>");
    s = s.replace(
      /\[([^\]]+)\]\((https?:[^)\s]+)\)/g,
      '<a href="$2">$1</a>',
    );
    return s;
  }

  function splitTableRow(line) {
    let s = line.trim();
    if (s.startsWith("|")) s = s.slice(1);
    if (s.endsWith("|")) s = s.slice(0, -1);
    return s.split("|").map((c) => c.trim());
  }

  function isSepRow(line) {
    const cells = splitTableRow(line);
    return (
      cells.length > 0 &&
      cells.every((c) => /^:?-{3,}:?$/.test(c.replace(/\s/g, "")))
    );
  }

  /** @returns {{ headers: string[], rows: string[][] }[]} */
  function parseMarkdownTables(md) {
    const lines = String(md || "").split(/\r?\n/);
    const tables = [];
    let i = 0;
    while (i < lines.length) {
      const line = lines[i];
      if (
        line.includes("|") &&
        i + 1 < lines.length &&
        isSepRow(lines[i + 1])
      ) {
        const headers = splitTableRow(line);
        i += 2;
        const rows = [];
        while (i < lines.length && lines[i].includes("|") && !isSepRow(lines[i])) {
          const row = splitTableRow(lines[i]);
          while (row.length < headers.length) row.push("");
          rows.push(row.slice(0, Math.max(headers.length, row.length)));
          i += 1;
        }
        tables.push({ headers, rows });
        continue;
      }
      i += 1;
    }
    return tables;
  }

  function mdToHtmlBody(md) {
    const lines = String(md || "").split(/\r?\n/);
    const out = [];
    let i = 0;
    let inCode = false;
    let codeBuf = [];
    let listType = null; // 'ul' | 'ol'

    function closeList() {
      if (listType) {
        out.push(listType === "ol" ? "</ol>" : "</ul>");
        listType = null;
      }
    }

    while (i < lines.length) {
      const line = lines[i];

      if (/^```/.test(line.trim())) {
        if (inCode) {
          out.push(
            `<pre><code>${escapeHtml(codeBuf.join("\n"))}</code></pre>`,
          );
          codeBuf = [];
          inCode = false;
        } else {
          closeList();
          inCode = true;
        }
        i += 1;
        continue;
      }
      if (inCode) {
        codeBuf.push(line);
        i += 1;
        continue;
      }

      if (
        line.includes("|") &&
        i + 1 < lines.length &&
        isSepRow(lines[i + 1])
      ) {
        closeList();
        const headers = splitTableRow(line);
        i += 2;
        const rows = [];
        while (i < lines.length && lines[i].includes("|") && !isSepRow(lines[i])) {
          rows.push(splitTableRow(lines[i]));
          i += 1;
        }
        out.push("<table><thead><tr>");
        headers.forEach((h) => out.push(`<th>${inlineMd(h)}</th>`));
        out.push("</tr></thead><tbody>");
        rows.forEach((row) => {
          out.push("<tr>");
          headers.forEach((_, idx) =>
            out.push(`<td>${inlineMd(row[idx] || "")}</td>`),
          );
          out.push("</tr>");
        });
        out.push("</tbody></table>");
        continue;
      }

      const heading = /^(#{1,6})\s+(.*)$/.exec(line);
      if (heading) {
        closeList();
        const level = heading[1].length;
        out.push(`<h${level}>${inlineMd(heading[2])}</h${level}>`);
        i += 1;
        continue;
      }

      if (/^>\s?/.test(line)) {
        closeList();
        out.push(`<blockquote><p>${inlineMd(line.replace(/^>\s?/, ""))}</p></blockquote>`);
        i += 1;
        continue;
      }

      if (/^[-*+]\s+/.test(line)) {
        if (listType !== "ul") {
          closeList();
          out.push("<ul>");
          listType = "ul";
        }
        out.push(`<li>${inlineMd(line.replace(/^[-*+]\s+/, ""))}</li>`);
        i += 1;
        continue;
      }

      if (/^\d+\.\s+/.test(line)) {
        if (listType !== "ol") {
          closeList();
          out.push("<ol>");
          listType = "ol";
        }
        out.push(`<li>${inlineMd(line.replace(/^\d+\.\s+/, ""))}</li>`);
        i += 1;
        continue;
      }

      if (/^---+$/.test(line.trim()) || /^\*\*\*+$/.test(line.trim())) {
        closeList();
        out.push("<hr/>");
        i += 1;
        continue;
      }

      if (!line.trim()) {
        closeList();
        i += 1;
        continue;
      }

      closeList();
      out.push(`<p>${inlineMd(line)}</p>`);
      i += 1;
    }

    if (inCode) {
      out.push(`<pre><code>${escapeHtml(codeBuf.join("\n"))}</code></pre>`);
    }
    closeList();
    return out.join("\n");
  }

  function buildWordHtml(md, title) {
    const body = mdToHtmlBody(md);
    const safeTitle = escapeHtml(title || "干净摘录");
    return `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:w="urn:schemas-microsoft-com:office:word"
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="utf-8" />
<meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
<title>${safeTitle}</title>
<!--[if gte mso 9]>
<xml>
  <w:WordDocument>
    <w:View>Print</w:View>
    <w:Zoom>100</w:Zoom>
  </w:WordDocument>
</xml>
<![endif]-->
<style>
  body {
    font-family: "Microsoft YaHei", "PingFang SC", SimSun, sans-serif;
    font-size: 11pt;
    line-height: 1.55;
    color: #111;
  }
  h1 { font-size: 18pt; }
  h2 { font-size: 15pt; }
  h3 { font-size: 13pt; }
  pre, code {
    font-family: Consolas, "Courier New", monospace;
    font-size: 10pt;
  }
  pre {
    background: #f5f5f5;
    padding: 8pt;
    white-space: pre-wrap;
  }
  table { border-collapse: collapse; width: 100%; margin: 8pt 0; }
  th, td {
    border: 1px solid #444;
    padding: 4pt 6pt;
    vertical-align: top;
  }
  th { background: #eef3f8; font-weight: 600; }
  blockquote {
    margin: 8pt 0;
    padding-left: 10pt;
    border-left: 3pt solid #007aff;
    color: #444;
  }
</style>
</head>
<body>
${body}
</body>
</html>`;
  }

  function sheetFromMatrix(name, headers, rows) {
    const cols = Math.max(
      headers.length,
      ...rows.map((r) => r.length),
      1,
    );
    const rowXml = [];
    rowXml.push(
      (() => {
        const parts = [];
        for (let c = 0; c < cols; c += 1) {
          parts.push(
            `<Cell ss:StyleID="Header"><Data ss:Type="String">${escapeXml(headers[c] ?? "")}</Data></Cell>`,
          );
        }
        return `<Row>${parts.join("")}</Row>`;
      })(),
    );
    rows.forEach((row) => {
      const parts = [];
      for (let c = 0; c < cols; c += 1) {
        parts.push(
          `<Cell><Data ss:Type="String">${escapeXml(row[c] ?? "")}</Data></Cell>`,
        );
      }
      rowXml.push(`<Row>${parts.join("")}</Row>`);
    });

    return `
<Worksheet ss:Name="${escapeXml(name.slice(0, 31))}">
  <Table>${rowXml.join("")}</Table>
</Worksheet>`;
  }

  function buildExcelXml(md, title) {
    const tables = parseMarkdownTables(md);
    let sheets = "";
    if (tables.length) {
      tables.forEach((t, idx) => {
        const name =
          tables.length === 1 ? "表格" : `表格${idx + 1}`;
        sheets += sheetFromMatrix(name, t.headers, t.rows);
      });
    } else {
      const lines = String(md || "")
        .split(/\r?\n/)
        .map((l) => l.trimEnd())
        .filter((l) => l.length > 0);
      const rows = lines.map((l) => [l.replace(/^#+\s*/, "")]);
      sheets += sheetFromMatrix("正文", ["内容"], rows.length ? rows : [[""]]);
    }

    return `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <DocumentProperties xmlns="urn:schemas-microsoft-com:office:office">
  <Title>${escapeXml(title || "干净摘录")}</Title>
  <Author>CleanMD</Author>
 </DocumentProperties>
 <Styles>
  <Style ss:ID="Header">
   <Font ss:Bold="1"/>
   <Interior ss:Color="#EEF3F8" ss:Pattern="Solid"/>
  </Style>
 </Styles>
${sheets}
</Workbook>`;
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function safeFilename(title, ext) {
    const base = (title || "cleanmd")
      .replace(/[\\/:*?"<>|]/g, "_")
      .slice(0, 80);
    return `${base}.${ext}`;
  }

  function downloadMarkdown(md, title) {
    const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
    downloadBlob(blob, safeFilename(title, "md"));
  }

  function downloadWord(md, title) {
    const html = buildWordHtml(md, title);
    // Word / WPS open HTML saved as .doc
    const blob = new Blob(["\ufeff", html], {
      type: "application/msword;charset=utf-8",
    });
    downloadBlob(blob, safeFilename(title, "doc"));
  }

  function downloadExcel(md, title) {
    const xml = buildExcelXml(md, title);
    const tables = parseMarkdownTables(md);
    const blob = new Blob(["\ufeff", xml], {
      type: "application/vnd.ms-excel;charset=utf-8",
    });
    downloadBlob(blob, safeFilename(title, "xls"));
    return { tableCount: tables.length };
  }

  return {
    parseMarkdownTables,
    downloadMarkdown,
    downloadWord,
    downloadExcel,
    // Obsidian compatible frontmatter
    buildObsidianMd(md, title, meta = {}) {
      const date = new Date().toISOString().split("T")[0];
      const tags = (meta.tags || []).map((t) => `"${t}"`).join(", ");
      const frontmatter = [
        "---",
        `title: "${title || "AI对话"}"`,
        `date: ${date}`,
        meta.sourceUrl ? `source: ${meta.sourceUrl}` : "",
        meta.clipKind ? `type: ${meta.clipKind}` : "",
        meta.platform ? `platform: ${meta.platform}` : "",
        tags ? `tags: [${tags}]` : "",
        "---",
        "",
      ]
        .filter((l) => l.trim())
        .join("\n");
      return frontmatter + md;
    },
    // Notion block format (simplified)
    toNotionBlocks(md) {
      const blocks = [];
      const lines = String(md || "").split(/\r?\n/);
      for (const line of lines) {
        if (/^#{1,6}\s+(.+)$/.test(line)) {
          const level = RegExp.$1.length;
          blocks.push({
            type: `heading_${Math.min(level, 3)}`,
            [`heading_${Math.min(level, 3)}`]: { rich_text: [{ type: "text", text: { content: line.replace(/^#+\s*/, "") } }] },
          });
        } else if (/^[-*+]\s+(.+)$/.test(line)) {
          blocks.push({
            type: "bulleted_list_item",
            bulleted_list_item: { rich_text: [{ type: "text", text: { content: RegExp.$1 } }] },
          });
        } else if (/^\d+\.\s+(.+)$/.test(line)) {
          blocks.push({
            type: "numbered_list_item",
            numbered_list_item: { rich_text: [{ type: "text", text: { content: RegExp.$1 } }] },
          });
        } else if (/^```/.test(line)) {
          blocks.push({ type: "code", code: { rich_text: [{ type: "text", text: { content: "..." } }], language: "plain text" } });
        } else if (line.trim()) {
          blocks.push({
            type: "paragraph",
            paragraph: { rich_text: [{ type: "text", text: { content: line } }] },
          });
        }
      }
      return blocks;
    },
  };
})();
