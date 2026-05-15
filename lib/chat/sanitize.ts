import sanitizeHtml from 'sanitize-html';

const SANITIZE_OPTS: sanitizeHtml.IOptions = {
  allowedTags: [],
  allowedAttributes: {},
  allowedIframeHostnames: [],
};

export function sanitizeChatMessageText(input: string): string {
  const trimmed = (input ?? '').trim();
  if (!trimmed) return '';
  return sanitizeHtml(trimmed, SANITIZE_OPTS);
}
