export type FeedbackInput = {
  name: string;
  message: string;
  rating: number;
  role?: string;
  company?: string;
  project?: string;
};

export type FeedbackResult =
  | { status: 'ok' }
  | { status: 'invalid' }
  | { status: 'unauthorized' }
  | { status: 'rate-limited' }
  | { status: 'unavailable' }
  | { status: 'not-configured' };

const TIMEOUT_MS = 10_000;

function readResult(payload: unknown): FeedbackResult {
  if (!payload || typeof payload !== 'object') return { status: 'unavailable' };
  const result = (payload as { result?: unknown }).result;
  if (!result || typeof result !== 'object') return { status: 'unavailable' };
  const value = result as { isError?: unknown; structuredContent?: unknown };
  if (value.isError === true) return { status: 'invalid' };
  if (!value.structuredContent || typeof value.structuredContent !== 'object') return { status: 'unavailable' };
  const content = value.structuredContent as { id?: unknown; status?: unknown };
  return typeof content.id === 'string' && content.status === 'pending'
    ? { status: 'ok' }
    : { status: 'unavailable' };
}

export async function submitPortfolioFeedback(
  input: FeedbackInput,
  options: { fetchImpl?: typeof fetch; timeoutMs?: number } = {},
): Promise<FeedbackResult> {
  const url = process.env.PORTFOLIO_MCP_URL;
  const key = process.env.PORTFOLIO_MCP_API_KEY;
  if (!url || !key) return { status: 'not-configured' };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? TIMEOUT_MS);
  try {
    const fetchImpl = options.fetchImpl ?? fetch;
    const response = await fetchImpl(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        Accept: 'application/json, text/event-stream',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: crypto.randomUUID(),
        method: 'tools/call',
        params: { name: 'submit_feedback', arguments: input },
      }),
      signal: controller.signal,
      cache: 'no-store',
    });
    if (response.status === 401) return { status: 'unauthorized' };
    if (response.status === 429) return { status: 'rate-limited' };
    if (!response.ok) return { status: 'unavailable' };
    try {
      return readResult(await response.json());
    } catch {
      return { status: 'unavailable' };
    }
  } catch {
    return { status: 'unavailable' };
  } finally {
    clearTimeout(timer);
  }
}
