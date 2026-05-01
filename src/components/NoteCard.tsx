import React, { useRef, useMemo } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Swipeable } from "react-native-gesture-handler";
import { Ionicons } from "@expo/vector-icons";
import { useColors, AppColors, Typography, Spacing } from "../constants/theme";
import type { Note } from "../types";

type Props = {
  note: Note;
  onPress: () => void;
  onToggleFavorite?: (id: string, isFavorite: boolean) => void;
  onDelete?: (id: string) => void;
  showSeparator?: boolean;
};

export function NoteCard({
  note,
  onPress,
  onToggleFavorite,
  onDelete,
  showSeparator = true,
}: Props) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const swipeRef = useRef<Swipeable>(null);

  const title = note.title ?? "無題";
  const preview = note.content
    .replace(/^#+\s/gm, "")
    .replace(/^[-*]\s/gm, "")
    .replace(/\*\*/g, "")
    .replace(/`/g, "")
    .trim()
    .slice(0, 120);
  const d = new Date(note.updatedAt);
  const datetime =
    d.toLocaleDateString("ja-JP", { month: "short", day: "numeric" }) +
    " " +
    d.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" });

  // 右スワイプ（左から）→ ブックマーク
  const renderLeftActions = () => (
    <View style={styles.bookmarkAction}>
      <Ionicons
        name={note.isFavorite ? "bookmark" : "bookmark-outline"}
        size={22}
        color="#FFFFFF"
      />
      <Text style={styles.actionLabel}>
        {note.isFavorite ? "解除" : "ブックマーク"}
      </Text>
    </View>
  );

  // 左スワイプ（右から）→ 削除
  const renderRightActions = () => (
    <View style={styles.deleteAction}>
      <Ionicons name="trash-outline" size={22} color="#FFFFFF" />
      <Text style={styles.actionLabel}>削除</Text>
    </View>
  );

  const handleSwipeOpen = (direction: "left" | "right") => {
    swipeRef.current?.close();
    if (direction === "left") {
      // 左アクションが開いた = 右スワイプ = ブックマーク
      onToggleFavorite?.(note.id, !note.isFavorite);
    } else {
      // 右アクションが開いた = 左スワイプ = 削除
      onDelete?.(note.id);
    }
  };

  return (
    <Swipeable
      ref={swipeRef}
      renderLeftActions={renderLeftActions}
      renderRightActions={renderRightActions}
      leftThreshold={80}
      rightThreshold={80}
      overshootLeft={false}
      overshootRight={false}
      onSwipeableOpen={handleSwipeOpen}
    >
      <TouchableOpacity
        style={styles.row}
        onPress={onPress}
        activeOpacity={0.5}
        accessibilityLabel={title}
        accessibilityRole="button"
      >
        <View style={styles.inner}>
          {/* 絵文字カラム */}
          <View style={styles.emojiCol}>
            {note.emoji ? <Text style={styles.emoji}>{note.emoji}</Text> : null}
          </View>

          {/* コンテンツカラム */}
          <View style={styles.content}>
            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>

            {/* プレビュー（常に1行分スペース確保） */}
            <Text style={styles.preview} numberOfLines={1}>
              {preview || ""}
            </Text>

            {/* タグ（常に1行分スペース確保） */}
            <View style={styles.tags}>
              {note.tags.slice(0, 4).map((tag) => (
                <Text key={tag} style={styles.tagText}>
                  #{tag}
                </Text>
              ))}
            </View>
          </View>

          {/* 右カラム：日時＋ブックマーク */}
          <TouchableOpacity
            style={styles.rightCol}
            onPress={() => onToggleFavorite?.(note.id, !note.isFavorite)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.date}>{datetime}</Text>
            <Ionicons
              name={note.isFavorite ? "bookmark" : "bookmark-outline"}
              size={18}
              color={note.isFavorite ? colors.primary : colors.textTertiary}
            />
          </TouchableOpacity>
        </View>

        {/* セパレーター */}
        {showSeparator && <View style={styles.separator} />}
      </TouchableOpacity>
    </Swipeable>
  );
}

const makeStyles = (colors: AppColors) =>
  StyleSheet.create({
    row: {
      backgroundColor: colors.surface,
    },
    inner: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: Spacing.base,
      paddingVertical: Spacing.md,
      gap: Spacing.sm,
    },
    emojiCol: {
      width: 30,
      alignItems: "center",
      alignSelf: "flex-start",
      paddingTop: 4,
    },
    emoji: {
      fontSize: 26,
    },
    content: {
      flex: 1,
      gap: 3,
    },
    titleRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: Spacing.xs,
    },
    title: {
      flex: 1,
      fontSize: Typography.base,
      fontWeight: "600",
      color: colors.textPrimary,
      letterSpacing: -0.2,
    },
    date: {
      fontSize: Typography.xs,
      color: colors.textTertiary,
      flexShrink: 0,
      textAlign: "right",
    },
    rightCol: {
      alignSelf: "flex-start",
      alignItems: "flex-end",
      gap: Spacing.lg,
      paddingLeft: Spacing.xs,
    },
    preview: {
      fontSize: Typography.sm,
      color: colors.textSecondary,
      lineHeight: Typography.sm * 1.4,
    },
    tags: {
      flexDirection: "row",
      gap: Spacing.sm,
      flexWrap: "wrap",
      minHeight: Typography.xs * 1.4,
    },
    tagText: {
      fontSize: Typography.xs,
      color: colors.textTertiary,
    },
    separator: {
      position: "absolute",
      bottom: 0,
      left: Spacing.base,
      right: 0,
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.border,
    },
    deleteAction: {
      backgroundColor: "#DC2626",
      alignItems: "center",
      justifyContent: "center",
      width: 80,
      gap: 4,
    },
    bookmarkAction: {
      backgroundColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
      width: 80,
      gap: 4,
    },
    actionLabel: {
      fontSize: Typography.xs,
      color: "#FFFFFF",
      fontWeight: "600",
    },
  });
