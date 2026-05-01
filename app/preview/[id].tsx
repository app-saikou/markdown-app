import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import * as FileSystem from 'expo-file-system/legacy';
import { useApp } from '../../src/contexts/AppContext';
import { markdownToHtml } from '../../src/utils/markdownGenerator';
import { useColors, AppColors, Typography, Spacing, Radius } from '../../src/constants/theme';

type ActionKey = 'copy' | 'share-md' | 'share-pdf';

export default function PreviewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state, updateNote } = useApp();
  const [loading, setLoading] = useState<ActionKey | null>(null);
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const insets = useSafeAreaInsets();

  const note = state.notes.find((n) => n.id === id);

  const markExported = async () => {
    if (note && note.status !== 'exported') {
      await updateNote(id, { status: 'exported' });
    }
  };

  const handleCopyMarkdown = async () => {
    if (!note) return;
    setLoading('copy');
    try {
      await Clipboard.setStringAsync(note.content);
      await markExported();
      Alert.alert('コピーしました', 'Markdownをクリップボードにコピーしました。');
    } catch {
      Alert.alert('エラー', 'コピーに失敗しました。');
    } finally {
      setLoading(null);
    }
  };

  const handleShareMarkdown = async () => {
    if (!note) return;
    setLoading('share-md');
    try {
      const filename = `${note.title ?? 'note'}-${Date.now()}.md`.replace(/[^a-zA-Z0-9._\-ぁ-ん一-龥]/g, '_');
      const fileUri = `${FileSystem.cacheDirectory}${filename}`;
      await FileSystem.writeAsStringAsync(fileUri, note.content, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      await Sharing.shareAsync(fileUri, {
        mimeType: 'text/markdown',
        dialogTitle: 'Markdownファイルを共有',
      });
      await markExported();
    } catch {
      Alert.alert('エラー', 'ファイル共有に失敗しました。');
    } finally {
      setLoading(null);
    }
  };

  const handleSharePDF = async () => {
    if (!note) return;
    setLoading('share-pdf');
    try {
      const html = markdownToHtml(note.content);
      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: 'PDFを共有',
      });
      await markExported();
    } catch {
      Alert.alert('エラー', 'PDF生成に失敗しました。');
    } finally {
      setLoading(null);
    }
  };

  return (
    <View style={styles.overlay}>
      {/* 背景タップで閉じる */}
      <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => router.back()} />

      {/* ボトムシート */}
      <View style={[styles.sheet, { paddingBottom: insets.bottom + Spacing.base }]}>
        {/* ドラッグインジケーター */}
        <View style={styles.handle} />

        {/* タイトル */}
        <Text style={styles.sheetTitle}>共有</Text>

        {/* アクションリスト */}
        <View style={styles.listGroup}>
          <ActionRow
            icon="copy-outline"
            title="Markdownをコピー"
            desc="エディタやCursorへそのまま貼り付け"
            actionKey="copy"
            loading={loading}
            onPress={handleCopyMarkdown}
            showChevron={false}
            colors={colors}
          />
          <View style={styles.separator} />
          <ActionRow
            icon="document-outline"
            title=".mdファイルとして共有"
            desc="Markdownファイルを任意のアプリへ送信"
            actionKey="share-md"
            loading={loading}
            onPress={handleShareMarkdown}
            showChevron
            colors={colors}
          />
          <View style={styles.separator} />
          <ActionRow
            icon="document-text-outline"
            title="PDFとして共有"
            desc="企画資料としてそのまま共有できる体裁で出力"
            actionKey="share-pdf"
            loading={loading}
            onPress={handleSharePDF}
            showChevron
            colors={colors}
          />
        </View>

        {/* 閉じるボタン */}
        <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Text style={styles.closeBtnText}>閉じる</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

type ActionRowProps = {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  desc: string;
  actionKey: ActionKey;
  loading: ActionKey | null;
  onPress: () => void;
  showChevron: boolean;
  colors: AppColors;
};

function ActionRow({ icon, title, desc, actionKey, loading, onPress, showChevron, colors }: ActionRowProps) {
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const isLoading = loading === actionKey;
  const isDisabled = loading !== null && !isLoading;

  return (
    <TouchableOpacity
      style={[styles.row, isDisabled && styles.rowDisabled]}
      onPress={onPress}
      disabled={isLoading || isDisabled}
      activeOpacity={0.5}
    >
      <View style={styles.iconWrap}>
        {isLoading
          ? <ActivityIndicator size="small" color={colors.primary} />
          : <Ionicons name={icon} size={20} color={colors.textSecondary} />
        }
      </View>
      <View style={styles.rowText}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowDesc}>{desc}</Text>
      </View>
      {showChevron && (
        <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
      )}
    </TouchableOpacity>
  );
}

const makeStyles = (colors: AppColors) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: Spacing.sm,
    paddingHorizontal: Spacing.base,
    gap: Spacing.base,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginBottom: Spacing.xs,
  },
  sheetTitle: {
    fontSize: Typography.base,
    fontWeight: '600',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  listGroup: {
    backgroundColor: colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginLeft: Spacing.base + 20 + Spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
    backgroundColor: colors.surface,
  },
  rowDisabled: {
    opacity: 0.4,
  },
  iconWrap: {
    width: 20,
    alignItems: 'center',
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  rowTitle: {
    fontSize: Typography.base,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  rowDesc: {
    fontSize: Typography.sm,
    color: colors.textSecondary,
  },
  closeBtn: {
    backgroundColor: colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    paddingVertical: Spacing.base,
  },
  closeBtnText: {
    fontSize: Typography.base,
    fontWeight: '500',
    color: colors.textPrimary,
  },
});
