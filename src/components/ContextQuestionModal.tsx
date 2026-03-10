import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  useColors,
  AppColors,
  Typography,
  Spacing,
  Radius,
} from "../constants/theme";
import type { ContextQuestion, ContextAnswer } from "../utils/aiMock";

type Props = {
  visible: boolean;
  questions: ContextQuestion[];
  memoText?: string;
  onConfirm: (answers: ContextAnswer[]) => void;
  onSkip: () => void;
  onClose: () => void;
};

export function ContextQuestionModal({
  visible,
  questions,
  memoText,
  onConfirm,
  onSkip,
  onClose,
}: Props) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  // 各質問の選択状態 ('choice-0' | 'choice-1' | 'choice-2' | 'custom' | '')
  const [selections, setSelections] = useState<string[]>(() =>
    questions.map(() => ""),
  );
  const [customInputs, setCustomInputs] = useState<string[]>(() =>
    questions.map(() => ""),
  );

  // questionsが変わったらリセット
  React.useEffect(() => {
    setSelections(questions.map(() => ""));
    setCustomInputs(questions.map(() => ""));
  }, [questions]);

  const handleChoiceSelect = (qi: number, choiceKey: string) => {
    setSelections((prev) => {
      const next = [...prev];
      next[qi] = next[qi] === choiceKey ? "" : choiceKey;
      return next;
    });
  };

  const handleCustomFocus = (qi: number) => {
    setSelections((prev) => {
      const next = [...prev];
      next[qi] = "custom";
      return next;
    });
  };

  const handleCustomChange = (qi: number, text: string) => {
    setCustomInputs((prev) => {
      const next = [...prev];
      next[qi] = text;
      return next;
    });
    if (text) {
      setSelections((prev) => {
        const next = [...prev];
        next[qi] = "custom";
        return next;
      });
    }
  };

  const buildAnswers = (): ContextAnswer[] => {
    return questions
      .map((q, i) => {
        const sel = selections[i];
        if (!sel) return null;
        let answer = "";
        if (sel === "custom") {
          answer = customInputs[i].trim();
        } else {
          const idx = parseInt(sel.replace("choice-", ""), 10);
          answer = q.choices[idx] ?? "";
        }
        if (!answer) return null;
        return { question: q.question, answer };
      })
      .filter((a): a is ContextAnswer => a !== null);
  };

  const accentColor = colors.primary;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View
          style={[styles.container, { backgroundColor: colors.background }]}
        >
          {/* ヘッダー */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={onClose}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              accessibilityLabel="閉じる"
            >
              <Ionicons name="close" size={22} color={colors.textTertiary} />
            </TouchableOpacity>
            <View style={styles.headerCenter}>
              <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
                もう少し教えてください
              </Text>
              <Text style={[styles.headerSub, { color: colors.textTertiary }]}>
                回答するとAIの精度が上がります（任意）
              </Text>
            </View>
          </View>

          {/* 元のメモ（固定表示） */}
          {memoText ? (
            <View style={[styles.memoPreview, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
              <Text style={[styles.memoPreviewLabel, { color: colors.textTertiary }]}>元のメモ</Text>
              <ScrollView style={styles.memoScroll} nestedScrollEnabled>
                <Text style={[styles.memoPreviewText, { color: colors.textSecondary }]}>
                  {memoText}
                </Text>
              </ScrollView>
            </View>
          ) : null}

          {/* 質問リスト */}
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {questions.map((q, qi) => (
              <View
                key={qi}
                style={[
                  styles.questionCard,
                  { backgroundColor: colors.surface },
                ]}
              >
                <Text
                  style={[styles.questionText, { color: colors.textPrimary }]}
                >
                  {q.question}
                </Text>
                <View style={styles.choicesGrid}>
                  {q.choices.map((choice, ci) => {
                    const key = `choice-${ci}`;
                    const isSelected = selections[qi] === key;
                    return (
                      <TouchableOpacity
                        key={ci}
                        style={[
                          styles.choiceBtn,
                          {
                            borderColor: colors.border,
                            backgroundColor: colors.background,
                          },
                          isSelected && {
                            borderColor: accentColor,
                            backgroundColor: accentColor + "15",
                          },
                        ]}
                        onPress={() => handleChoiceSelect(qi, key)}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.choiceBtnText,
                            {
                              color: isSelected
                                ? accentColor
                                : colors.textSecondary,
                            },
                            isSelected && { fontWeight: "600" },
                          ]}
                          numberOfLines={2}
                        >
                          {choice}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                  {/* 自由入力スロット */}
                  <TextInput
                    style={[
                      styles.customInput,
                      {
                        borderColor:
                          selections[qi] === "custom"
                            ? accentColor
                            : colors.border,
                        backgroundColor: colors.background,
                        color: colors.textPrimary,
                      },
                      selections[qi] === "custom" && {
                        backgroundColor: accentColor + "10",
                      },
                    ]}
                    placeholder="その他（自由入力）"
                    placeholderTextColor={colors.textTertiary}
                    value={customInputs[qi]}
                    onFocus={() => handleCustomFocus(qi)}
                    onChangeText={(text) => handleCustomChange(qi, text)}
                    returnKeyType="done"
                  />
                </View>
              </View>
            ))}
          </ScrollView>

          {/* フッターボタン */}
          <View
            style={[
              styles.footer,
              {
                borderTopColor: colors.border,
                backgroundColor: colors.surface,
              },
            ]}
          >
            <TouchableOpacity
              style={styles.skipBtn}
              onPress={onSkip}
              activeOpacity={0.7}
            >
              <Text
                style={[styles.skipBtnText, { color: colors.textTertiary }]}
              >
                スキップ（すぐに構造化）
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.confirmBtn, { backgroundColor: accentColor }]}
              onPress={() => onConfirm(buildAnswers())}
              activeOpacity={0.8}
            >
              <Text style={styles.confirmBtnText}>この内容で構造化</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const makeStyles = (colors: AppColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    header: {
      flexDirection: "row",
      alignItems: "flex-start",
      paddingHorizontal: Spacing.base,
      paddingTop: Spacing.lg,
      paddingBottom: Spacing.md,
      gap: Spacing.sm,
    },
    closeBtn: {
      width: 32,
      height: 32,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 2,
    },
    headerCenter: {
      flex: 1,
      gap: 2,
    },
    headerTitle: {
      fontSize: Typography.lg,
      fontWeight: "700",
    },
    headerSub: {
      fontSize: Typography.xs,
    },
    modeBadgeWrap: {
      alignItems: "flex-end",
      marginTop: 2,
    },
    modeBadge: {
      paddingHorizontal: Spacing.sm,
      paddingVertical: 3,
      borderRadius: Radius.full,
    },
    modeBadgeText: {
      fontSize: Typography.xs,
      fontWeight: "600",
    },
    scroll: {
      flex: 1,
    },
    scrollContent: {
      padding: Spacing.base,
      gap: Spacing.md,
      paddingBottom: Spacing["2xl"],
    },
    memoPreview: {
      borderRadius: 0,
      borderBottomWidth: 1,
      paddingHorizontal: Spacing.base,
      paddingTop: Spacing.sm,
      paddingBottom: Spacing.sm,
      gap: Spacing.xs,
      maxHeight: 160,
    },
    memoScroll: {
      flexGrow: 0,
    },
    memoPreviewLabel: {
      fontSize: Typography.xs,
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    memoPreviewText: {
      fontSize: Typography.sm,
      lineHeight: Typography.sm * 1.5,
    },
    questionCard: {
      borderRadius: Radius.lg,
      padding: Spacing.base,
      gap: Spacing.md,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 2,
    },
    questionText: {
      fontSize: Typography.base,
      fontWeight: "600",
      lineHeight: Typography.base * 1.4,
    },
    choicesGrid: {
      flexDirection: "column",
      gap: Spacing.sm,
    },
    choiceBtn: {
      borderWidth: 1.5,
      borderRadius: Radius.md,
      paddingHorizontal: Spacing.md,
      height: 48,
      justifyContent: "center",
      alignItems: "flex-start",
    },
    choiceBtnText: {
      fontSize: Typography.base,
      textAlign: "left",
    },
    customInput: {
      borderWidth: 1.5,
      borderRadius: Radius.md,
      paddingHorizontal: Spacing.md,
      paddingVertical: 13,
      fontSize: Typography.base,
    },
    footer: {
      borderTopWidth: StyleSheet.hairlineWidth,
      padding: Spacing.base,
      gap: Spacing.sm,
    },
    skipBtn: {
      alignItems: "center",
      paddingVertical: Spacing.xs,
    },
    skipBtnText: {
      fontSize: Typography.sm,
      textDecorationLine: "underline",
    },
    confirmBtn: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: Spacing.md,
      borderRadius: Radius.md,
      minHeight: 50,
    },
    confirmBtnText: {
      fontSize: Typography.base,
      fontWeight: "700",
      color: "#FFFFFF",
    },
  });
