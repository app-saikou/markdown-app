export type OutputLength = "short" | "medium" | "long";

export type ContextQuestion = {
  question: string;
  choices: [string, string, string];
};

export type ContextAnswer = {
  question: string;
  answer: string;
};

async function invokeAiProxy<T>(body: object): Promise<T> {
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
  const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "";

  const response = await fetch(`${supabaseUrl}/functions/v1/ai-proxy`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${anonKey}`,
    },
    body: JSON.stringify(body),
  });

  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(json?.error ?? `サーバーエラー: ${response.status}`);
  }
  if (json?.error) throw new Error(json.error);
  return json as T;
}

/**
 * メモを読んでコンテキスト質問を生成する。
 * 失敗時は空配列を返す。
 */
export async function generateContextQuestions(
  rawText: string,
): Promise<ContextQuestion[]> {
  try {
    const { result } = await invokeAiProxy<{ result: string }>({
      action: "generateContextQuestions",
      rawText,
    });

    const jsonMatch = result.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.warn("[generateContextQuestions] JSON配列が見つかりません:", result);
      return [];
    }

    const parsed = JSON.parse(jsonMatch[0]) as ContextQuestion[];
    const contentQuestions = Array.isArray(parsed)
      ? parsed.filter(
          (q) =>
            typeof q.question === "string" &&
            Array.isArray(q.choices) &&
            q.choices.length === 3,
        )
      : [];

    console.log("[generateContextQuestions] 生成された質問数:", contentQuestions.length);
    return contentQuestions;
  } catch (e) {
    console.error("[generateContextQuestions] エラー:", e);
    return [];
  }
}

/** 補完回答を含めて構造化する */
export async function structureText(
  rawText: string,
  outputLength: OutputLength = "medium",
  contextAnswers: ContextAnswer[] = [],
): Promise<string> {
  const { result } = await invokeAiProxy<{ result: string }>({
    action: "structureText",
    rawText,
    outputLength,
    contextAnswers,
  });
  return result;
}
