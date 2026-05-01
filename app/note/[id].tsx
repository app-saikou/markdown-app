import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
} from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import Markdown from "react-native-markdown-display";
import * as Clipboard from "expo-clipboard";
import { Ionicons } from "@expo/vector-icons";
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from "expo-speech-recognition";
import { useApp } from "../../src/contexts/AppContext";
import {
  useColors,
  AppColors,
  Typography,
  Spacing,
  Radius,
} from "../../src/constants/theme";
import { useInterstitialAd } from "../../src/hooks/useInterstitialAd";
import { EmojiPicker } from "../../src/components/EmojiPicker";
import { ContextQuestionModal } from "../../src/components/ContextQuestionModal";
import {
  structureText,
  generateContextQuestions,
  ContextQuestion,
  ContextAnswer,
} from "../../src/utils/aiMock";

type Mode = "edit" | "preview" | "original";

const AI_CHAR_LIMIT = 2_000;

// タスクリスト: react-native-markdown-display はHTMLチェックボックスを描画できないため
// テキスト前処理でUnicodeに変換する
function preprocessMarkdown(text: string): string {
  return text
    .replace(/^([ \t]*)-\s+\[x\]\s+/gim, "$1- ☑ ")
    .replace(/^([ \t]*)-\s+\[X\]\s+/gim, "$1- ☑ ")
    .replace(/^([ \t]*)-\s+\[ \]\s+/gim, "$1- ☐ ");
}

export default function NoteEditScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state, updateNote, toggleFavorite } = useApp();
  const [mode, setMode] = useState<Mode>("edit");
  const [content, setContent] = useState("");
  const [rawText, setRawText] = useState("");
  const [title, setTitle] = useState("");
  const [emoji, setEmoji] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [structuringPhase, setStructuringPhase] = useState<"idle" | "generating" | "structuring">("idle");
  const [hasAiBackup, setHasAiBackup] = useState(false);
  const [contextQuestions, setContextQuestions] = useState<ContextQuestion[]>([]);
  const [showContextModal, setShowContextModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [copied, setCopied] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState("");
  const lastStructureTimeRef = useRef<number>(0);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { checkAndShowIfNeeded } = useInterstitialAd();
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const markdownStyles = useMemo(() => makeMarkdownStyles(colors), [colors]);

  const titleRef = useRef(title);
  const contentRef = useRef(content);
  const rawTextRef = useRef(rawText);
  const modeRef = useRef(mode);
  const editSelectionRef = useRef<{ start: number; end: number } | null>(null);
  const rawSelectionRef = useRef<{ start: number; end: number } | null>(null);
  const titleSelectionRef = useRef<{ start: number; end: number } | null>(null);
  const focusedFieldRef = useRef<"title" | "content" | "raw">("content");
  useEffect(() => {
    titleRef.current = title;
  }, [title]);
  useEffect(() => {
    contentRef.current = content;
  }, [content]);
  useEffect(() => {
    rawTextRef.current = rawText;
  }, [rawText]);
  useEffect(() => {
    modeRef.current = mode;
    // モード切替時に音声入力のターゲットフィールドを同期
    if (mode === "original") focusedFieldRef.current = "raw";
    else if (mode === "edit") focusedFieldRef.current = "content";
  }, [mode]);

  const note = state.notes.find((n) => n.id === id);

  useEffect(() => {
    if (note) {
      setContent(note.content);
      setRawText(note.rawText ?? "");
      setTitle(note.title ?? "");
      setEmoji(note.emoji ?? "");
      setTags(note.tags ?? []);
      setHasAiBackup(!!note.rawText);
    }
  }, [id]);

  useEffect(() => {
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  const showToast = useCallback((message: string) => {
    setToastMessage(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastMessage(null), 2500);
  }, []);

  // 全文コピー（表示中のモードに応じてコピー内容を切り替え）
  const handleCopyAll = useCallback(async () => {
    const body = mode === "original" ? rawTextRef.current : contentRef.current;
    const text = titleRef.current ? `# ${titleRef.current}\n\n${body}` : body;
    await Clipboard.setStringAsync(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [mode]);

  // 元テキスト編集 (debounce 500ms)
  const handleRawTextChange = useCallback(
    (text: string) => {
      setRawText(text);
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      debounceTimer.current = setTimeout(async () => {
        setIsSaving(true);
        try {
          await updateNote(id, { rawText: text });
        } finally {
          setIsSaving(false);
        }
      }, 500);
    },
    [id, updateNote],
  );

  // 自動保存 (debounce 500ms)
  const handleContentChange = useCallback(
    (text: string) => {
      setContent(text);
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      debounceTimer.current = setTimeout(async () => {
        setIsSaving(true);
        try {
          await updateNote(id, { content: text });
        } finally {
          setIsSaving(false);
        }
      }, 500);
    },
    [id, updateNote],
  );

  // タイトル・絵文字の保存
  const handleMetaSave = useCallback(async () => {
    await updateNote(id, { title: title || null, emoji });
  }, [id, title, emoji, updateNote]);

  // タグ追加（Space / Return / カンマで確定）
  const handleTagInputChange = useCallback(
    (text: string) => {
      if (text.endsWith(" ") || text.endsWith(",") || text.endsWith("\n")) {
        const newTag = text.trim().replace(/,$/, "");
        if (tags.length >= 10) {
          showToast("タグは最大10個までです");
          setTagInput("");
          return;
        }
        if (newTag.length > 30) {
          showToast("タグは30文字以内で入力してください");
          setTagInput(newTag.slice(0, 30));
          return;
        }
        if (newTag && !tags.includes(newTag)) {
          const updated = [...tags, newTag];
          setTags(updated);
          updateNote(id, { tags: updated });
        }
        setTagInput("");
      } else {
        setTagInput(text.slice(0, 30));
      }
    },
    [id, tags, updateNote, showToast],
  );

  const handleTagSubmit = useCallback(() => {
    const newTag = tagInput.trim();
    if (tags.length >= 10) {
      showToast("タグは最大10個までです");
      setTagInput("");
      return;
    }
    if (newTag.length > 30) {
      showToast("タグは30文字以内で入力してください");
      return;
    }
    if (newTag && !tags.includes(newTag)) {
      const updated = [...tags, newTag];
      setTags(updated);
      updateNote(id, { tags: updated });
    }
    setTagInput("");
  }, [id, tagInput, tags, updateNote, showToast]);

  const handleTagRemove = useCallback(
    (tag: string) => {
      const updated = tags.filter((t) => t !== tag);
      setTags(updated);
      updateNote(id, { tags: updated });
    },
    [id, tags, updateNote],
  );

  // 絵文字選択
  const handleEmojiSelect = useCallback(
    async (selected: string) => {
      setEmoji(selected);
      await updateNote(id, { emoji: selected, title: title || null });
    },
    [id, title, updateNote],
  );

  // 音声認識イベント
  useSpeechRecognitionEvent("result", (event) => {
    const result = event.results[0];
    if (!result) return;
    const transcript = result.transcript ?? "";
    if (event.isFinal) {
      // 確定テキスト → フォーカス中フィールドのカーソル位置に挿入（未設定なら末尾に追記）
      setInterimTranscript("");
      const field = focusedFieldRef.current;
      if (field === "title") {
        const base = titleRef.current;
        const sel = titleSelectionRef.current;
        const updated = sel
          ? base.slice(0, sel.start) + transcript + base.slice(sel.end)
          : base + transcript;
        setTitle(updated);
        updateNote(id, { title: updated || null });
      } else if (field === "raw") {
        const base = rawTextRef.current;
        const sel = rawSelectionRef.current;
        const updated = sel
          ? base.slice(0, sel.start) + transcript + base.slice(sel.end)
          : (base ? base + "\n" + transcript : transcript);
        handleRawTextChange(updated);
      } else {
        const base = contentRef.current;
        const sel = editSelectionRef.current;
        const updated = sel
          ? base.slice(0, sel.start) + transcript + base.slice(sel.end)
          : (base ? base + "\n" + transcript : transcript);
        handleContentChange(updated);
      }
    } else {
      // 暫定テキスト → 別途表示（contentは変えない）
      setInterimTranscript(transcript);
    }
  });
  useSpeechRecognitionEvent("end", () => {
    setIsRecording(false);
    setInterimTranscript("");
  });
  useSpeechRecognitionEvent("error", () => {
    setIsRecording(false);
    setInterimTranscript("");
  });

  const handleVoiceToggle = useCallback(async () => {
    if (isRecording) {
      ExpoSpeechRecognitionModule.stop();
      return;
    }
    const { granted } =
      await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!granted) {
      Alert.alert(
        "マイクの許可が必要です",
        "設定からマイクへのアクセスを許可してください。",
      );
      return;
    }
    setIsRecording(true);
    ExpoSpeechRecognitionModule.start({
      lang: "ja-JP",
      interimResults: true,
      continuous: true,
    });
  }, [isRecording, handleContentChange]);

  // AI実行
  const runAI = useCallback(
    async (contextAnswers: ContextAnswer[] = []) => {
      // rawText が未設定の場合は content を元テキストとして使い、初回のみ rawText に保存
      const isFirstTime = !rawTextRef.current.trim();
      const source = isFirstTime ? contentRef.current : rawTextRef.current;
      if (!source.trim()) {
        Alert.alert("内容がありません", "テキストを入力してから実行してください。");
        return;
      }
      setStructuringPhase("structuring");
      try {
        const result = await structureText(source, "medium", contextAnswers);
        setContent(result);
        setMode("preview");
        if (isFirstTime) {
          // rawText は初回のみ保存。以降は構造化ボタンを何度押しても rawText は変わらない
          setRawText(source);
          setHasAiBackup(true);
          await updateNote(id, { content: result, rawText: source, status: "structured" });
        } else {
          await updateNote(id, { content: result, status: "structured" });
        }
        await checkAndShowIfNeeded();
      } catch (e) {
        const msg = e instanceof Error ? e.message : "AI処理に失敗しました。";
        Alert.alert("エラー", msg);
      } finally {
        setStructuringPhase("idle");
      }
    },
    [id, updateNote],
  );

  // 質問生成 → モーダル表示
  const handleStructure = useCallback(async () => {
    if (!contentRef.current.trim()) {
      Alert.alert("内容がありません", "テキストを入力してから実行してください。");
      return;
    }
    // レート制限: 30秒に1回
    const now = Date.now();
    const elapsed = now - lastStructureTimeRef.current;
    if (elapsed < 30_000 && lastStructureTimeRef.current !== 0) {
      const remaining = Math.ceil((30_000 - elapsed) / 1000);
      Alert.alert("少し待ってください", `あと${remaining}秒後に再度実行できます。`);
      return;
    }
    // 文字数制限
    const source = rawTextRef.current.trim() || contentRef.current;
    if (source.length > AI_CHAR_LIMIT) {
      Alert.alert("テキストが長すぎます", `${AI_CHAR_LIMIT}文字以内にしてください（現在${source.length}文字）。`);
      return;
    }
    lastStructureTimeRef.current = now;
    setStructuringPhase("generating");
    try {
      const questions = await generateContextQuestions(source);
      setStructuringPhase("idle");
      if (questions.length === 0) {
        await runAI([]);
        return;
      }
      setContextQuestions(questions);
      setShowContextModal(true);
    } catch {
      setStructuringPhase("idle");
      showToast("質問を取得できませんでした。そのまま構造化します");
      await runAI([]);
    }
  }, [runAI, showToast]);

  const handleContextConfirm = useCallback(
    async (answers: ContextAnswer[]) => {
      setShowContextModal(false);
      await runAI(answers);
    },
    [runAI],
  );

  const handleContextSkip = useCallback(async () => {
    setShowContextModal(false);
    await runAI([]);
  }, [runAI]);

  const handleContextClose = useCallback(() => {
    setShowContextModal(false);
  }, []);



  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <Stack.Screen
        options={{
          title: "",
          headerRight: () => (
            <View style={{ flexDirection: "row", gap: 20 }}>
              <TouchableOpacity
                onPress={() => note && toggleFavorite(note.id, !note.isFavorite)}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                accessibilityLabel="ブックマーク"
              >
                <Ionicons
                  name={note?.isFavorite ? "bookmark" : "bookmark-outline"}
                  size={22}
                  color={note?.isFavorite ? colors.primary : colors.textSecondary}
                />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleCopyAll}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                accessibilityLabel="全文をコピー"
              >
                <Ionicons
                  name={copied ? "checkmark-circle" : "copy-outline"}
                  size={22}
                  color={copied ? colors.success : colors.textSecondary}
                />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => router.push(`/preview/${id}`)}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                accessibilityLabel="共有"
              >
                <Ionicons
                  name="share-outline"
                  size={22}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
            </View>
          ),
        }}
      />

      <SafeAreaView style={styles.container} edges={["bottom"]}>
        {/* メタ情報 */}
        <View style={styles.metaSection}>
          <View style={styles.titleRow}>
            <TouchableOpacity
              style={styles.emojiBtn}
              onPress={() => setShowEmojiPicker(true)}
              accessibilityLabel="絵文字を選択"
            >
              {emoji ? (
                <Text style={styles.emojiDisplay}>{emoji}</Text>
              ) : (
                <Ionicons
                  name="happy-outline"
                  size={24}
                  color={colors.textTertiary}
                />
              )}
            </TouchableOpacity>
            <TextInput
              style={styles.titleInput}
              placeholder="タイトル"
              placeholderTextColor={colors.textTertiary}
              value={title}
              maxLength={100}
              onChangeText={setTitle}
              onFocus={() => { focusedFieldRef.current = "title"; }}
              onBlur={() => { focusedFieldRef.current = "content"; handleMetaSave(); }}
              onSelectionChange={(e) => { titleSelectionRef.current = e.nativeEvent.selection; }}
              returnKeyType="done"
            />
            {title.length >= 80 && (
              <Text style={[styles.charCount, title.length >= 95 && styles.charCountWarn]}>
                {title.length}/100
              </Text>
            )}
          </View>
          <View style={styles.tagsRow}>
            {tags.map((tag) => (
              <TouchableOpacity
                key={tag}
                style={styles.tagChip}
                onPress={() => handleTagRemove(tag)}
              >
                <Text style={styles.tagChipText}>#{tag}</Text>
                <Text style={styles.tagChipRemove}>×</Text>
              </TouchableOpacity>
            ))}
            {tags.length < 10 && (
              <TextInput
                style={styles.tagInput}
                placeholder={tags.length >= 8 ? `タグを追加 (あと${10 - tags.length}個)` : "タグを追加"}
                placeholderTextColor={colors.textTertiary}
                value={tagInput}
                onChangeText={handleTagInputChange}
                onSubmitEditing={handleTagSubmit}
                returnKeyType="done"
                blurOnSubmit={false}
              />
            )}
            {tagInput.length >= 20 && (
              <Text style={[styles.charCount, tagInput.length >= 28 && styles.charCountWarn]}>
                {tagInput.length}/30
              </Text>
            )}
          </View>
        </View>

        {/* モード切替 */}
        <View style={styles.toolbar}>
          {hasAiBackup && (
            <TouchableOpacity
              style={[
                styles.modeBtn,
                mode === "original" && styles.modeBtnActive,
              ]}
              onPress={() => setMode("original")}
            >
              <Text
                style={[
                  styles.modeBtnText,
                  mode === "original" && styles.modeBtnTextActive,
                ]}
              >
                元のテキスト
              </Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.modeBtn, mode === "edit" && styles.modeBtnActive]}
            onPress={() => setMode("edit")}
          >
            <Text
              style={[
                styles.modeBtnText,
                mode === "edit" && styles.modeBtnTextActive,
              ]}
            >
              編集
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeBtn, mode === "preview" && styles.modeBtnActive]}
            onPress={() => setMode("preview")}
          >
            <Text
              style={[
                styles.modeBtnText,
                mode === "preview" && styles.modeBtnTextActive,
              ]}
            >
              プレビュー
            </Text>
          </TouchableOpacity>
          {isSaving && (
            <ActivityIndicator
              size="small"
              color={colors.textTertiary}
              style={{ marginLeft: 8 }}
            />
          )}
        </View>

        {/* エディタ / プレビュー */}
        {mode === "edit" ? (
          <View style={{ flex: 1 }}>
            <TextInput
              style={styles.editor}
              multiline
              value={content}
              onChangeText={handleContentChange}
              onFocus={() => { focusedFieldRef.current = "content"; }}
              onSelectionChange={(e) => { editSelectionRef.current = e.nativeEvent.selection; }}
              textAlignVertical="top"
              scrollEnabled
              placeholder="ここに書く"
              placeholderTextColor={colors.textTertiary}
              autoCorrect={false}
            />
            {isRecording && interimTranscript !== "" && (
              <View style={styles.interimBanner} pointerEvents="none">
                <Text style={styles.interimText}>{interimTranscript}</Text>
              </View>
            )}
            <TouchableOpacity
              style={[styles.micBtn, isRecording && styles.micBtnActive]}
              onPress={handleVoiceToggle}
              accessibilityLabel={isRecording ? "録音を停止" : "音声入力を開始"}
            >
              <Ionicons
                name={isRecording ? "stop-circle" : "mic"}
                size={24}
                color={isRecording ? "#FFFFFF" : colors.textSecondary}
              />
            </TouchableOpacity>
          </View>
        ) : mode === "preview" ? (
          <ScrollView
            style={styles.preview}
            contentContainerStyle={styles.previewContent}
          >
            <Markdown style={markdownStyles}>
              {preprocessMarkdown(content)}
            </Markdown>
          </ScrollView>
        ) : (
          <View style={{ flex: 1 }}>
            <TextInput
              style={styles.editor}
              multiline
              value={rawText}
              onChangeText={handleRawTextChange}
              onFocus={() => { focusedFieldRef.current = "raw"; }}
              onSelectionChange={(e) => { rawSelectionRef.current = e.nativeEvent.selection; }}
              textAlignVertical="top"
              scrollEnabled
              placeholder="元のテキスト"
              placeholderTextColor={colors.textTertiary}
              autoCorrect={false}
            />
            {isRecording && interimTranscript !== "" && (
              <View style={styles.interimBanner} pointerEvents="none">
                <Text style={styles.interimText}>{interimTranscript}</Text>
              </View>
            )}
            <TouchableOpacity
              style={[styles.micBtn, isRecording && styles.micBtnActive]}
              onPress={handleVoiceToggle}
              accessibilityLabel={isRecording ? "録音を停止" : "音声入力を開始"}
            >
              <Ionicons
                name={isRecording ? "stop-circle" : "mic"}
                size={24}
                color={isRecording ? "#FFFFFF" : colors.textSecondary}
              />
            </TouchableOpacity>
          </View>
        )}

        {/* フッター */}
        <View style={styles.footer}>
          {(() => {
            // AIソースのタブを表示中のときだけカウンターを出す
            const isAiSourceTab = rawText.trim() ? mode === "original" : mode === "edit";
            if (!isAiSourceTab) return null;
            const len = (rawText.trim() || content).length;
            if (len < AI_CHAR_LIMIT * 0.6) return null;
            const isOver = len > AI_CHAR_LIMIT;
            const isWarn = len > AI_CHAR_LIMIT * 0.9;
            return (
              <Text style={[
                styles.aiCharCount,
                isWarn && styles.aiCharCountWarn,
                isOver && styles.aiCharCountOver,
              ]}>
                {len.toLocaleString()} / {AI_CHAR_LIMIT.toLocaleString()}文字
              </Text>
            );
          })()}
          <TouchableOpacity
            style={[
              styles.structureBtn,
              (structuringPhase !== "idle" || (rawText.trim() || content).length > AI_CHAR_LIMIT) && styles.btnDisabled,
            ]}
            onPress={handleStructure}
            disabled={structuringPhase !== "idle" || (rawText.trim() || content).length > AI_CHAR_LIMIT}
            activeOpacity={0.8}
          >
            {structuringPhase === "structuring" ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.structureBtnText}>
                {structuringPhase === "generating" ? "質問を考えています..." : "✦  構造化する"}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* トースト通知 */}
      {toastMessage && (
        <View style={styles.toast} pointerEvents="none">
          <Text style={styles.toastText}>{toastMessage}</Text>
        </View>
      )}

      <EmojiPicker
        visible={showEmojiPicker}
        onSelect={handleEmojiSelect}
        onClose={() => setShowEmojiPicker(false)}
      />

      <ContextQuestionModal
        visible={showContextModal}
        questions={contextQuestions}
        memoText={rawText || content}
        onConfirm={handleContextConfirm}
        onSkip={handleContextSkip}
        onClose={handleContextClose}
      />
    </KeyboardAvoidingView>
  );
}

const makeStyles = (colors: AppColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.surface,
    },
    metaSection: {
      paddingHorizontal: Spacing.base,
      paddingTop: Spacing.md,
      paddingBottom: Spacing.sm,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
      gap: Spacing.sm,
    },
    titleRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: Spacing.sm,
    },
    emojiBtn: {
      width: 36,
      height: 36,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: Radius.sm,
      backgroundColor: colors.surfaceSecondary,
    },
    emojiDisplay: {
      fontSize: 20,
    },
    titleInput: {
      flex: 1,
      fontSize: Typography["2xl"],
      fontWeight: "700",
      color: colors.textPrimary,
      letterSpacing: -0.5,
    },
    tagsRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      alignItems: "center",
      gap: Spacing.xs,
      minHeight: 32,
    },
    tagChip: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.primaryLight,
      borderRadius: Radius.full,
      paddingHorizontal: Spacing.sm,
      paddingVertical: 4,
      gap: 3,
      minHeight: 28,
    },
    tagChipText: {
      fontSize: Typography.sm,
      color: colors.primary,
      fontWeight: "500",
    },
    tagChipRemove: {
      fontSize: Typography.sm,
      color: colors.primary,
      opacity: 0.5,
    },
    tagInput: {
      fontSize: Typography.sm,
      color: colors.textSecondary,
      minWidth: 80,
      flex: 1,
    },
    charCount: {
      fontSize: Typography.xs,
      color: colors.textTertiary,
    },
    charCountWarn: {
      color: colors.warning,
    },
    toolbar: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: Spacing.base,
      paddingVertical: Spacing.xs,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
      gap: Spacing.xl,
    },
    modeBtn: {
      paddingVertical: Spacing.sm,
      minHeight: 36,
      justifyContent: "center",
    },
    modeBtnActive: {
      borderBottomWidth: 2,
      borderBottomColor: colors.primary,
    },
    modeBtnText: {
      fontSize: Typography.sm,
      color: colors.textTertiary,
      fontWeight: "500",
    },
    modeBtnTextActive: {
      color: colors.primary,
      fontWeight: "600",
    },
    editor: {
      flex: 1,
      padding: Spacing.base,
      fontSize: Typography.base,
      color: colors.textPrimary,
      lineHeight: Typography.base * Typography.lineHeightRelaxed,
    },
    preview: {
      flex: 1,
    },
    previewContent: {
      padding: Spacing.base,
      paddingBottom: Spacing["2xl"],
    },
    footer: {
      paddingHorizontal: Spacing.base,
      paddingVertical: Spacing.sm,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
      gap: Spacing.xs,
    },
    aiCharCount: {
      fontSize: Typography.xs,
      color: colors.textTertiary,
      textAlign: "right",
    },
    aiCharCountWarn: {
      color: colors.warning,
    },
    aiCharCountOver: {
      color: colors.error,
      fontWeight: "600",
    },
    structureBtn: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: Spacing.md,
      borderRadius: Radius.lg,
      backgroundColor: colors.accent,
      minHeight: 50,
    },
    btnDisabled: {
      opacity: 0.5,
    },
    structureBtnText: {
      fontSize: Typography.base,
      fontWeight: "600",
      color: "#FFFFFF",
    },
    interimBanner: {
      position: "absolute",
      bottom: 72,
      left: Spacing.base,
      right: 72,
      backgroundColor: colors.surfaceSecondary,
      borderRadius: Radius.md,
      paddingVertical: Spacing.sm,
      paddingHorizontal: Spacing.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
    interimText: {
      fontSize: Typography.sm,
      color: colors.textTertiary,
      fontStyle: "italic",
    },
    micBtn: {
      position: "absolute",
      bottom: Spacing.base,
      right: Spacing.base,
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: colors.surface,
      alignItems: "center",
      justifyContent: "center",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.12,
      shadowRadius: 6,
      elevation: 4,
    },
    micBtnActive: {
      backgroundColor: colors.error,
    },
    toast: {
      position: "absolute",
      bottom: 100,
      left: Spacing.xl,
      right: Spacing.xl,
      backgroundColor: "rgba(0,0,0,0.75)",
      borderRadius: Radius.md,
      paddingVertical: Spacing.sm,
      paddingHorizontal: Spacing.base,
      alignItems: "center",
    },
    toastText: {
      fontSize: Typography.sm,
      color: "#FFFFFF",
      textAlign: "center",
    },
  });

const makeMarkdownStyles = (colors: AppColors) => ({
  body: {
    fontSize: Typography.base,
    color: colors.textPrimary,
    lineHeight: Typography.base * Typography.lineHeightRelaxed,
  },
  heading1: {
    fontSize: Typography["2xl"],
    fontWeight: "700" as const,
    color: colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  heading2: {
    fontSize: Typography.xl,
    fontWeight: "600" as const,
    color: colors.textPrimary,
    marginTop: Spacing.base,
    marginBottom: Spacing.xs,
  },
  heading3: {
    fontSize: Typography.lg,
    fontWeight: "600" as const,
    color: colors.textPrimary,
    marginTop: Spacing.sm,
  },
  em: {
    fontStyle: "italic" as const,
    color: colors.textSecondary,
  },
  blockquote: {
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
    paddingLeft: Spacing.md,
    color: colors.textSecondary,
    fontStyle: "italic" as const,
  },
  hr: {
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    marginVertical: Spacing.base,
  },
});
