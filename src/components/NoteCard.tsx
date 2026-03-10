import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors, AppColors, Typography, Spacing, Radius } from '../constants/theme';
import type { Note } from '../types';

type Props = {
  note: Note;
  onPress: () => void;
  onToggleFavorite?: (id: string, isFavorite: boolean) => void;
};

export function NoteCard({ note, onPress, onToggleFavorite }: Props) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const title = note.title ?? '無題';
  const preview = note.content
    .replace(/^#+\s/gm, '')
    .replace(/^[-*]\s/gm, '')
    .replace(/\*\*/g, '')
    .replace(/`/g, '')
    .trim()
    .slice(0, 80);
  const date = new Date(note.updatedAt).toLocaleDateString('ja-JP', {
    month: 'short',
    day: 'numeric',
  });

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.6}
      accessibilityLabel={title}
      accessibilityRole="button"
    >
      <View style={styles.inner}>
        <View style={styles.topRow}>
          {note.emoji ? (
            <Text style={styles.emoji}>{note.emoji}</Text>
          ) : null}
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
          {onToggleFavorite && (
            <TouchableOpacity
              onPress={() => onToggleFavorite(note.id, !note.isFavorite)}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              style={styles.favoriteBtn}
              accessibilityLabel={note.isFavorite ? 'お気に入り解除' : 'お気に入りに追加'}
            >
              <Ionicons
                name={note.isFavorite ? 'heart' : 'heart-outline'}
                size={16}
                color={note.isFavorite ? colors.error : colors.textTertiary}
              />
            </TouchableOpacity>
          )}
        </View>

        {preview ? (
          <Text style={styles.preview} numberOfLines={2}>{preview}</Text>
        ) : null}

        <View style={styles.footer}>
          <View style={styles.tags}>
            {note.tags.slice(0, 3).map((tag) => (
              <Text key={tag} style={styles.tag}>#{tag}</Text>
            ))}
          </View>
          <Text style={styles.date}>{date}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const makeStyles = (colors: AppColors) => StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: Radius.lg,
    marginHorizontal: Spacing.base,
    marginBottom: Spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  inner: {
    padding: Spacing.base,
    gap: Spacing.xs,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  emoji: {
    fontSize: 16,
  },
  title: {
    flex: 1,
    fontSize: Typography.lg,
    fontWeight: '600',
    color: colors.textPrimary,
    letterSpacing: -0.3,
  },
  favoriteBtn: {
    padding: 4,
  },
  preview: {
    fontSize: Typography.sm,
    color: colors.textSecondary,
    lineHeight: Typography.sm * Typography.lineHeightBase,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  tags: {
    flexDirection: 'row',
    gap: Spacing.xs,
    flex: 1,
  },
  tag: {
    fontSize: Typography.xs,
    color: colors.primary,
    fontWeight: '500',
  },
  date: {
    fontSize: Typography.xs,
    color: colors.textTertiary,
  },
});
