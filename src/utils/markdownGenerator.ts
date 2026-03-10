/** PDF出力用にMarkdownをシンプルなHTMLへ変換 */
export function markdownToHtml(markdown: string): string {
  let html = markdown
    // 見出し
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    // 引用
    .replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>')
    // チェックボックス
    .replace(/^- \[ \] (.+)$/gm, '<li class="todo">☐ $1</li>')
    .replace(/^- \[x\] (.+)$/gm, '<li class="done">☑ $1</li>')
    // 箇条書き
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    // 太字・斜体
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // 水平線
    .replace(/^---$/gm, '<hr>')
    // 段落（空行区切り）
    .replace(/\n\n/g, '</p><p>');

  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Hiragino Sans', sans-serif; padding: 32px; max-width: 720px; margin: 0 auto; color: #111827; line-height: 1.7; }
    h1 { font-size: 24px; border-bottom: 2px solid #3B82F6; padding-bottom: 8px; margin-bottom: 24px; }
    h2 { font-size: 18px; margin-top: 32px; color: #1D4ED8; }
    h3 { font-size: 15px; margin-top: 20px; }
    blockquote { border-left: 4px solid #3B82F6; padding-left: 16px; color: #6B7280; font-style: italic; }
    li { margin: 4px 0; }
    hr { border: none; border-top: 1px solid #E5E7EB; margin: 24px 0; }
  </style>
</head>
<body>
  <p>${html}</p>
</body>
</html>`;
}
