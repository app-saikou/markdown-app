import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { BannerAd, BannerAdSize, TestIds } from 'react-native-google-mobile-ads';
import { useApp } from '../../src/contexts/AppContext';
import { NoteCard } from '../../src/components/NoteCard';
import { useColors, AppColors, Typography, Spacing, Radius } from '../../src/constants/theme';
import type { NoteStatus } from '../../src/types';

const BANNER_UNIT_ID = __DEV__
  ? TestIds.BANNER
  : (process.env.EXPO_PUBLIC_ADMOB_BANNER_IOS ?? TestIds.BANNER);

type FilterValue = NoteStatus | 'all' | 'favorite';

const STATUS_FILTERS: Array<{ label: string; value: FilterValue }> = [
  { label: 'すべて', value: 'all' },
  { label: 'お気に入り', value: 'favorite' },
  { label: '下書き', value: 'draft' },
  { label: '構造化済み', value: 'structured' },
  { label: '出力済み', value: 'exported' },
];

export default function NotesScreen() {
  const { state, loadAll, createNote, toggleFavorite } = useApp();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<FilterValue>('all');
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // 全ノートから重複なしのタグ一覧を収集
  const allTags = useMemo(() => {
    const set = new Set<string>();
    state.notes.forEach((n) => n.tags.forEach((t) => set.add(t)));
    return Array.from(set).sort();
  }, [state.notes]);

  const filteredNotes = useMemo(() => {
    return state.notes.filter((note) => {
      const matchFilter =
        filter === 'all' ||
        (filter === 'favorite' ? note.isFavorite : note.status === filter);
      const q = query.toLowerCase();
      const matchQuery =
        !query ||
        (note.title ?? '').toLowerCase().includes(q) ||
        note.content.toLowerCase().includes(q) ||
        note.tags.some((t) => t.toLowerCase().includes(q));
      const matchTag = !tagFilter || note.tags.includes(tagFilter);
      return matchFilter && matchQuery && matchTag;
    });
  }, [state.notes, filter, query, tagFilter]);

  const handleNewNote = async () => {
    const note = await createNote('');
    router.push(`/note/${note.id}`);
  };

  if (state.loading && state.notes.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* ヘッダー */}
      <View style={styles.header}>
        <Text style={styles.largeTitle}>ノート</Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={handleNewNote}
          accessibilityLabel="新しいノートを作成"
        >
          <Ionicons name="add" size={28} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* 検索バー */}
      <View style={styles.searchBar}>
        <Ionicons name="search" size={16} color={colors.textTertiary} />
        <TextInput
          style={styles.searchInput}
          placeholder="検索"
          placeholderTextColor={colors.textTertiary}
          value={query}
          onChangeText={setQuery}
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close-circle" size={16} color={colors.textTertiary} />
          </TouchableOpacity>
        )}
      </View>

      {/* ステータスフィルタ */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterContent}
        style={styles.filterScroll}
      >
        {STATUS_FILTERS.map((f) => (
          <TouchableOpacity
            key={f.value}
            style={[styles.filter, filter === f.value && styles.filterActive]}
            onPress={() => setFilter(f.value)}
            accessibilityRole="button"
            accessibilityState={{ selected: filter === f.value }}
          >
            <Text style={[styles.filterText, filter === f.value && styles.filterTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* タグ絞り込み */}
      {allTags.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterContent}
          style={[styles.filterScroll, { marginBottom: Spacing.xs }]}
        >
          {allTags.map((tag) => (
            <TouchableOpacity
              key={tag}
              style={[styles.tagFilter, tagFilter === tag && styles.tagFilterActive]}
              onPress={() => setTagFilter(tagFilter === tag ? null : tag)}
              accessibilityRole="button"
              accessibilityState={{ selected: tagFilter === tag }}
            >
              <Text style={[styles.tagFilterText, tagFilter === tag && styles.tagFilterTextActive]}>
                #{tag}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* リスト */}
      <FlatList
        data={filteredNotes}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <NoteCard
            note={item}
            onPress={() => router.push(`/note/${item.id}`)}
            onToggleFavorite={toggleFavorite}
          />
        )}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="document-text-outline" size={48} color={colors.textTertiary} />
            <Text style={styles.emptyTitle}>ノートがありません</Text>
            <Text style={styles.emptyDesc}>右上の＋から追加できます</Text>
          </View>
        }
      />

      {/* バナー広告 */}
      <BannerAd
        unitId={BANNER_UNIT_ID}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        requestOptions={{ requestNonPersonalizedAdsOnly: true }}
      />
    </SafeAreaView>
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
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xs,
  },
  largeTitle: {
    fontSize: Typography['3xl'],
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  addBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: Radius.md,
    marginHorizontal: Spacing.base,
    marginBottom: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
  },
  searchInput: {
    flex: 1,
    fontSize: Typography.base,
    color: colors.textPrimary,
  },
  filterScroll: {
    marginBottom: Spacing.sm,
    flexGrow: 0,
  },
  filterContent: {
    paddingHorizontal: Spacing.base,
    gap: Spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
  },
  filter: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: Radius.full,
    backgroundColor: colors.surface,
    minHeight: 32,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
  },
  filterActive: {
    backgroundColor: colors.primary,
  },
  filterText: {
    fontSize: Typography.sm,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  filterTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  list: {
    paddingTop: Spacing.xs,
    paddingBottom: 40,
  },
  empty: {
    alignItems: 'center',
    paddingTop: Spacing['3xl'],
    gap: Spacing.sm,
  },
  emptyTitle: {
    fontSize: Typography.lg,
    fontWeight: '600',
    color: colors.textPrimary,
    marginTop: Spacing.sm,
  },
  emptyDesc: {
    fontSize: Typography.sm,
    color: colors.textTertiary,
  },
  tagFilter: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 28,
    justifyContent: 'center',
  },
  tagFilterActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  tagFilterText: {
    fontSize: Typography.xs,
    color: colors.textTertiary,
    fontWeight: '500',
  },
  tagFilterTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
});
