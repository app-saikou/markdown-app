import React, { useMemo, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Pressable,
} from 'react-native';
import { useColors, AppColors, Typography, Spacing, Radius } from '../constants/theme';

const EMOJI_LIST = [
  '💡', '🚀', '🎯', '📝', '🔥', '⭐', '💎', '🌟',
  '🎨', '🛠', '📊', '🔍', '💬', '🤔', '✅', '❌',
  '📌', '🗂', '📚', '💻', '🌱', '🏆', '🎵', '🧠',
  '💪', '🌈', '❤️', '⚡', '🎉', '🔑', '🌍', '🦋',
];

type Props = {
  visible: boolean;
  onSelect: (emoji: string) => void;
  onClose: () => void;
};

export function EmojiPicker({ visible, onSelect, onClose }: Props) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [search, setSearch] = useState('');

  const filtered = useMemo(
    () => (search ? EMOJI_LIST.filter((e) => e.includes(search)) : EMOJI_LIST),
    [search]
  );

  const handleSelect = (emoji: string) => {
    onSelect(emoji);
    setSearch('');
    onClose();
  };

  const handleClear = () => {
    onSelect('');
    setSearch('');
    onClose();
  };

  const handleClose = () => {
    setSearch('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <Pressable style={styles.backdrop} onPress={handleClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.handle} />
          <Text style={styles.title}>絵文字を選択</Text>

          <TextInput
            style={styles.searchInput}
            placeholder="検索..."
            placeholderTextColor={colors.textTertiary}
            value={search}
            onChangeText={setSearch}
            autoCorrect={false}
          />

          <FlatList
            data={filtered}
            numColumns={8}
            keyExtractor={(item) => item}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.emojiBtn}
                onPress={() => handleSelect(item)}
              >
                <Text style={styles.emojiText}>{item}</Text>
              </TouchableOpacity>
            )}
            style={styles.grid}
            contentContainerStyle={styles.gridContent}
            ListEmptyComponent={
              <Text style={styles.emptyText}>絵文字が見つかりません</Text>
            }
          />

          <TouchableOpacity style={styles.clearBtn} onPress={handleClear}>
            <Text style={styles.clearBtnText}>絵文字なし</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const makeStyles = (colors: AppColors) => StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
    paddingBottom: Spacing['2xl'],
    maxHeight: '60%',
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: colors.border,
    borderRadius: Radius.full,
    alignSelf: 'center',
    marginTop: Spacing.sm,
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: Typography.lg,
    fontWeight: '600',
    color: colors.textPrimary,
    paddingHorizontal: Spacing.base,
    marginBottom: Spacing.sm,
  },
  searchInput: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginHorizontal: Spacing.base,
    marginBottom: Spacing.sm,
    fontSize: Typography.base,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  grid: {
    flexGrow: 0,
  },
  gridContent: {
    paddingHorizontal: Spacing.sm,
  },
  emojiBtn: {
    flex: 1,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    margin: 2,
    borderRadius: Radius.sm,
  },
  emojiText: {
    fontSize: 28,
  },
  emptyText: {
    textAlign: 'center',
    color: colors.textTertiary,
    fontSize: Typography.sm,
    paddingVertical: Spacing.xl,
  },
  clearBtn: {
    marginHorizontal: Spacing.base,
    marginTop: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  clearBtnText: {
    fontSize: Typography.base,
    color: colors.textSecondary,
  },
});
