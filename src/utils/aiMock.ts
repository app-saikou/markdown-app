export type OutputLength = "short" | "medium" | "long";

export type ContextQuestion = {
  question: string;
  choices: [string, string, string];
};

export type ContextAnswer = {
  question: string;
  answer: string;
};

const OUTPUT_LENGTH_INSTRUCTION: Record<OutputLength, string> = {
  short: "出力は簡潔にまとめ、箇条書き中心で短く仕上げてください。",
  medium: "適度な詳しさでまとめてください。",
  long: "詳細に展開し、背景・補足・アクションも含めて丁寧に仕上げてください。",
};

const UNIFIED_PROMPT = (outputLength: OutputLength) =>
  `
あなたは優れた編集者です。
ユーザーのメモと補足回答を元に、「これはすごい」と感動させるMarkdown文書を作成してください。

## 絶対に守るルール（情報の忠実性）
- 事実・意見・情報はメモと補足回答の内容のみを使う
- **メモに書かれていない外部の事実・知識・情報は追加しない**
- ユーザーの意図を歪めない
- 【禁止】メモにない新しい主張・機能・ターゲット像・業界知識を追加すること
- 【許可】メモの内容を深く解釈して、より鋭い言葉・構造・切り口で表現すること（これは編集の仕事）

## 積極的にやること（編集の質）【これが腕の見せ所】
- メモに散らばった情報の「核心」を見抜き、最初に前面に出す
- 書かれていないが文脈から明らかな論理・つながりを**積極的に言語化する**（これは情報追加ではなく編集）
- 読み手が「なるほど」と感じる順序・構造に組み直す
- 曖昧な表現をメモの文脈から解釈して、より明確・力強い言葉に変換する（例：「押し上げる」→「昇華させる」）
- キャッチーなタイトル・締めの一文・引用ブロックなどで読み手の心に刺さる表現にする
- 最も価値ある情報を強調し、読み手の記憶に残る見せ方にする

## 出力ルール
- 見出し・箇条書き・強調・表などMarkdownを効果的に使う
- タイトルは内容の本質を端的に表す日本語で（キャッチーでいい）
- ${OUTPUT_LENGTH_INSTRUCTION[outputLength]}
- Markdownのみ出力（前置き・後書き・コードブロック不要）
`.trim();

const CONTEXT_QUESTION_PROMPT = `
あなたは優秀な編集者です。
ユーザーのメモを読み、「この情報があれば自分はもっと価値の高いアウトプットを出せる」という視点で、**自分自身のために**必要な情報を特定してください。

## 考え方
- メモを読んで、情報が欠けていることで出力の質が下がりそうな箇所を見つける
- 「知っていればアウトプットが劇的に変わる」情報だけを聞く
- 「知らなくても大して変わらない」情報は聞かない
- 選択肢は、メモの文脈から実際にあり得る具体的な値にする（汎用的な選択肢はNG）

## 悪い質問の例（やってはいけない）
- 「誰に向けた内容ですか？」→ 汎用的すぎる
- 「目的は何ですか？」→ メモの内容を見れば推測できる

## 良い質問の例（こういう質問にする）
- メモに「予算の話が出た」とある → 「予算の結論は？」選択肢: 削減確定 / 増額検討 / 継続協議
- メモに「機能Aと機能Bを比較」とある → 「比較の目的は？」選択肢: 採用判断 / コスト最適化 / 仕様確定

## 出力形式（JSONのみ・他の説明は不要）
[
  {
    "question": "質問文（メモの具体的な内容に基づく・20文字以内）",
    "choices": ["メモの文脈に沿った選択肢1", "選択肢2", "選択肢3"]
  }
]

## 制約
- 質問は必ず1〜2個生成する（空配列は禁止）
- メモが短くても、出力の方向性を決める1問は必ず作る
- 各選択肢は10文字以内
- 「仕上がり方向」の質問は不要（別途聞く）
- JSONのみ出力
`.trim();

async function callClaude(
  systemPrompt: string,
  userContent: string,
): Promise<string> {
  const apiKey = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("Anthropic APIキーが設定されていません。");

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5",
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: "user", content: userContent }],
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      (error as any)?.error?.message ?? `APIエラー: ${response.status}`,
    );
  }

  const data = (await response.json()) as {
    content: Array<{ type: string; text: string }>;
  };

  const text = data.content.find((b) => b.type === "text")?.text?.trim();
  if (!text) throw new Error("レスポンスが空でした。");
  return text;
}

/**
 * メモを読んでコンテキスト質問を生成する。
 * 先頭に仕上がり方向の固定質問を必ず付ける。
 * 失敗時は固定質問のみ返す。
 */
export async function generateContextQuestions(
  rawText: string,
): Promise<ContextQuestion[]> {
  try {
    const result = await callClaude(CONTEXT_QUESTION_PROMPT, rawText);
    const cleaned = result
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/, "")
      .trim();
    const parsed = JSON.parse(cleaned) as ContextQuestion[];
    const contentQuestions = Array.isArray(parsed)
      ? parsed.filter(
          (q) =>
            typeof q.question === "string" &&
            Array.isArray(q.choices) &&
            q.choices.length === 3,
        )
      : [];
    return contentQuestions;
  } catch {
    return [];
  }
}

/** 補完回答を含めて構造化する */
export async function structureText(
  rawText: string,
  outputLength: OutputLength = "medium",
  contextAnswers: ContextAnswer[] = [],
): Promise<string> {
  let systemPrompt = UNIFIED_PROMPT(outputLength);

  if (contextAnswers.length > 0) {
    const contextBlock = contextAnswers
      .map((a) => `- ${a.question}: ${a.answer}`)
      .join("\n");
    systemPrompt += `\n\n補足情報：\n${contextBlock}`;
  }

  return callClaude(systemPrompt, rawText);
}
