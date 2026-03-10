import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import * as FileSystem from 'expo-file-system/legacy';
import { useApp } from '../../src/contexts/AppContext';
import { markdownToHtml } from '../../src/utils/markdownGenerator';
import { useColors, AppColors, Typography, Spacing, Radius } from '../../src/constants/theme';

export default function PreviewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state, updateNote } = useApp();
  const [loading, setLoading] = useState<string | null>(null);
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const note = state.notes.find((n) => n.id === id);

  if (!note) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>ノートが見つかりません</Text>
      </View>
    );
  }

  const markExported = async () => {
    if (note.status !== 'exported') {
      await updateNote(id, { status: 'exported' });
    }
  };

  // ① Markdownをコピー
  const handleCopyMarkdown = async () => {
    setLoading('copy');
    try {
      await Clipboard.setStringAsync(note.content);
      await markExported();
      Alert.alert('コピーしました！', 'Markdownをクリップボードにコピーしました。');
    } catch {
      Alert.alert('エラー', 'コピーに失敗しました。');
    } finally {
      setLoading(null);
    }
  };

  // ② .mdファイルとして共有
  const handleShareMarkdown = async () => {
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

  // ③ PDFとして共有
  const handleSharePDF = async () => {
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
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* ヘッダー */}
        <View style={styles.header}>
          <Text style={styles.title} numberOfLines={2}>
            {note.title ?? 'ノート'}
          </Text>
          <Text style={styles.subtitle}>エクスポート形式を選んでください</Text>
        </View>

        {/* オプション一覧 */}
        <View style={styles.options}>
          <ExportOption
            emoji=""
            title="Markdownをコピー"
            desc="クリップボードにコピー。エディタやCursorへそのまま貼り付けられます"
            loading={loading === 'copy'}
            disabled={loading !== null && loading !== 'copy'}
            onPress={handleCopyMarkdown}
            color={colors.primary}
            colors={colors}
          />

          <ExportOption
            emoji=""
            title=".mdファイルとして共有"
            desc="Markdownファイルを任意のアプリへ送信"
            loading={loading === 'share-md'}
            disabled={loading !== null && loading !== 'share-md'}
            onPress={handleShareMarkdown}
            color="#6366F1"
            colors={colors}
          />

          <ExportOption
            emoji=""
            title="PDFとして共有"
            desc="そのまま企画資料として共有できる体裁で出力"
            loading={loading === 'share-pdf'}
            disabled={loading !== null && loading !== 'share-pdf'}
            onPress={handleSharePDF}
            color="#10B981"
            colors={colors}
          />
        </View>

        {/* 閉じるボタン */}
        <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
          <Text style={styles.closeBtnText}>閉じる</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

type ExportOptionProps = {
  emoji: string;
  title: string;
  desc: string;
  loading: boolean;
  disabled?: boolean;
  onPress: () => void;
  color: string;
  colors: AppColors;
};

function ExportOption({ emoji, title, desc, loading, disabled, onPress, color, colors }: ExportOptionProps) {
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <TouchableOpacity
      style={[styles.option, disabled && styles.optionDisabled]}
      onPress={onPress}
      disabled={loading || !!disabled}
      activeOpacity={0.7}
    >
      {loading && (
        <View style={[styles.optionIcon, { backgroundColor: color + '18' }]}>
          <ActivityIndicator color={color} size="small" />
        </View>
      )}
      <View style={styles.optionText}>
        <Text style={[styles.optionTitle, { color }]}>{title}</Text>
        <Text style={styles.optionDesc}>{desc}</Text>
      </View>
      <Text style={[styles.optionArrow, { color }]}>›</Text>
    </TouchableOpacity>
  );
}

const makeStyles = (colors: AppColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    color: colors.textSecondary,
  },
  content: {
    padding: Spacing.base,
    gap: Spacing.xl,
  },
  header: {
    paddingTop: Spacing.base,
    gap: Spacing.xs,
  },
  title: {
    fontSize: Typography['2xl'],
    fontWeight: '700',
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: Typography.sm,
    color: colors.textSecondary,
  },
  options: {
    gap: Spacing.sm,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.base,
    gap: Spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  optionDisabled: {
    opacity: 0.4,
  },
  optionIcon: {
    width: 48,
    height: 48,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionEmoji: {
    fontSize: 22,
  },
  optionText: {
    flex: 1,
    gap: 2,
  },
  optionTitle: {
    fontSize: Typography.base,
    fontWeight: '600',
  },
  optionDesc: {
    fontSize: Typography.sm,
    color: colors.textSecondary,
    lineHeight: Typography.sm * Typography.lineHeightBase,
  },
  optionArrow: {
    fontSize: 22,
    fontWeight: '300',
  },
  closeBtn: {
    alignItems: 'center',
    paddingVertical: Spacing.base,
  },
  closeBtnText: {
    fontSize: Typography.base,
    color: colors.textSecondary,
  },
});
