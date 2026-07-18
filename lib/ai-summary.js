/**
 * AI Summary - Generate summaries for clipped content using user's AI API
 * Supports DeepSeek, OpenAI compatible APIs
 */
const AISummary = (() => {
  // Default system prompt for summarization
  const DEFAULT_SYSTEM = `你是一个专业的文章摘要助手。请为以下内容生成简洁、准确的摘要。

要求：
1. 提取文章的核心主题和要点
2. 保留关键信息和重要细节
3. 使用简洁的语言
4. 如果是AI对话，记录关键问答内容
5. 输出格式：先用一段话总结核心内容，然后列出3-5个关键要点

请用中文输出。`;

  // Prompt variations for different content types
  const PROMPTS = {
    ai_chat: `这是AI对话记录，请提取：
1. 对话的核心主题/问题
2. AI给出的关键回答或解决方案
3. 重要的技术细节或代码片段
4. 对话中达成的结论

格式：
## 核心主题
[一句话概括]

## 关键内容
- [要点1]
- [要点2]
- ...

## 技术要点（如有）
[如有代码或技术细节]`,
    
    article: `这是一篇技术文章或博客，请提取：
1. 文章的主题和解决的问题
2. 核心观点和方法
3. 重要的代码示例或配置
4. 适用场景和注意事项

格式：
## 文章概要
[核心主题]

## 核心要点
- [要点1]
- [要点2]
- ...

## 代码/配置要点（如有）
[关键代码片段]`,
    
    default: `请为以下内容生成摘要：
1. 核心主题
2. 关键要点（3-5条）
3. 重要细节

保持简洁，用中文输出。`
  };

  /**
   * Determine content type from clip metadata
   */
  function getContentType(meta) {
    const kind = meta?.clipKind || "";
    if (/deepseek|qwen|doubao|chat|ai-chat/i.test(kind)) return "ai_chat";
    if (/article|post|blog|csdn|juejin|segmentfault|github/i.test(kind)) return "article";
    return "default";
  }

  /**
   * Get the appropriate system prompt based on content type
   */
  function getSystemPrompt(contentType) {
    return PROMPTS[contentType] || PROMPTS.default;
  }

  /**
   * Call AI API to generate summary
   * @param {string} markdown - The markdown content to summarize
   * @param {object} options - API options
   * @returns {Promise<{success: boolean, summary?: string, error?: string}>}
   */
  async function generateSummary(markdown, options = {}) {
    const {
      apiBase = "https://api.deepseek.com",
      apiKey,
      model = "deepseek-chat",
      contentType = "default"
    } = options;

    if (!apiKey) {
      return { success: false, error: "请先配置 AI API Key" };
    }

    if (!markdown || markdown.length < 50) {
      return { success: false, error: "内容太短，无需摘要" };
    }

    // Truncate long content to avoid token limits (keep first 8000 chars)
    const truncatedContent = markdown.length > 8000 
      ? markdown.slice(0, 8000) + "\n\n[内容已截断]..."
      : markdown;

    const systemPrompt = getSystemPrompt(contentType);

    try {
      const response = await fetch(`${apiBase.replace(/\/$/, "")}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: `请为以下内容生成摘要：\n\n${truncatedContent}` }
          ],
          temperature: 0.3,
          max_tokens: 1000
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `API 错误: ${response.status}`);
      }

      const data = await response.json();
      const summary = data.choices?.[0]?.message?.content?.trim();

      if (!summary) {
        return { success: false, error: "AI 未返回有效摘要" };
      }

      return { success: true, summary };
    } catch (error) {
      console.error("AI Summary Error:", error);
      return { 
        success: false, 
        error: error.message || "调用 AI 失败，请检查 API 配置" 
      };
    }
  }

  /**
   * Generate summary with fallback to simpler prompt
   */
  async function generateSummaryWithFallback(markdown, options = {}) {
    // Try with specific prompt first
    const contentType = getContentType(options.meta);
    let result = await generateSummary(markdown, { ...options, contentType });
    
    // If failed, try with default prompt
    if (!result.success && options.apiKey) {
      result = await generateSummary(markdown, { ...options, contentType: "default" });
    }
    
    return result;
  }

  return {
    generateSummary,
    generateSummaryWithFallback,
    getContentType,
    DEFAULT_SYSTEM,
    PROMPTS
  };
})();
