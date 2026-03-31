/**
 * 获取 DashScope API Key。
 * 优先使用 DASHSCOPE_API_KEY，同时兼容历史变量名 QWEN_API_KEY。
 *
 * 本项目支持“禁用外部大模型”模式：
 * - 设置 DISABLE_DASHSCOPE=1 或 DISABLE_DASHSCOPE=true
 * - 所有 qwen-* 能力将自动回落到本地规则/Mock 数据
 */
export function getDashscopeApiKey(): string | null {
  const disabled = String(process.env.DISABLE_DASHSCOPE ?? "").trim().toLowerCase();
  if (disabled === "1" || disabled === "true") return null;

  const apiKey = process.env.DASHSCOPE_API_KEY ?? process.env.QWEN_API_KEY;
  const normalized = String(apiKey ?? "").trim();
  return normalized || null;
}
