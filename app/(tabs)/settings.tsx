import React, { useMemo, useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path } from 'react-native-svg';

function GoogleLogoNeutral({ size = 24 }: { size?: number; style?: object }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <Path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <Path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <Path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </Svg>
  );
}
import { useApp } from '../../src/contexts/AppContext';
import {
  signInWithGoogle,
  signInWithApple,
  signOut,
  deleteAccount,
  getSession,
  getProvider,
  type AuthProvider,
} from '../../src/lib/supabaseClient';
import { useColors, AppColors, Typography, Spacing, Radius } from '../../src/constants/theme';
import type { ColorScheme } from '../../src/types';

type ThemeOption = {
  value: ColorScheme;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
};

const THEME_OPTIONS: ThemeOption[] = [
  { value: 'light', label: 'ライト', icon: 'sunny-outline' },
  { value: 'dark', label: 'ダーク', icon: 'moon-outline' },
  { value: 'system', label: 'システム', icon: 'phone-portrait-outline' },
];

export default function SettingsScreen() {
  const { state, setColorScheme, loadAll } = useApp();
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  const [provider, setProvider] = useState<AuthProvider>('anonymous');

  useEffect(() => {
    getSession().then((session) => {
      setUserEmail(session?.user?.email ?? null);
      setUserAvatar(session?.user?.user_metadata?.avatar_url ?? null);
    });
    getProvider().then(setProvider);
  }, [state.isAnonymous]);

  const handleGoogleLink = async () => {
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
      await loadAll();
      Alert.alert('完了', 'Googleアカウントと連携しました。');
    } catch (e) {
      Alert.alert('エラー', e instanceof Error ? e.message : '連携に失敗しました。');
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleAppleLink = async () => {
    setAppleLoading(true);
    try {
      await signInWithApple();
      await loadAll();
      await getProvider().then(setProvider);
      Alert.alert('完了', 'Appleアカウントと連携しました。');
    } catch (e: unknown) {
      if (e instanceof Error && (e as { code?: string }).code === 'ERR_CANCELED') return;
      Alert.alert('エラー', e instanceof Error ? e.message : '連携に失敗しました。');
    } finally {
      setAppleLoading(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert('サインアウト', 'サインアウトしますか？', [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: 'サインアウト',
        style: 'destructive',
        onPress: async () => {
          await signOut();
          router.replace('/login');
        },
      },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'アカウントを削除',
      'すべてのノートとアカウント情報が完全に削除されます。この操作は取り消せません。',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '削除する',
          style: 'destructive',
          onPress: async () => {
            setDeleteLoading(true);
            try {
              await deleteAccount();
              router.replace('/login');
            } catch (e) {
              Alert.alert('エラー', e instanceof Error ? e.message : '削除に失敗しました。');
            } finally {
              setDeleteLoading(false);
            }
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Text style={styles.largeTitle}>設定</Text>
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* アカウント */}
        <Text style={styles.sectionLabel}>アカウント</Text>
        <View style={styles.group}>
          {provider === 'anonymous' ? (
            <>
              <TouchableOpacity
                style={styles.row}
                onPress={handleGoogleLink}
                disabled={googleLoading || appleLoading}
              >
                <View style={styles.rowIcon}><GoogleLogoNeutral size={24} /></View>
                <View style={styles.rowContent}>
                  <Text style={styles.rowLabel}>Googleアカウントと連携する</Text>
                  <Text style={styles.rowSubLabel}>ゲストで使用中</Text>
                </View>
                {googleLoading
                  ? <ActivityIndicator size="small" color={colors.textTertiary} />
                  : <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
                }
              </TouchableOpacity>
              {Platform.OS === 'ios' && (
                <>
                  <View style={styles.separator} />
                  <TouchableOpacity
                    style={styles.row}
                    onPress={handleAppleLink}
                    disabled={googleLoading || appleLoading}
                  >
                    <Ionicons name="logo-apple" size={24} color={colors.textPrimary} style={styles.rowIcon} />
                    <View style={styles.rowContent}>
                      <Text style={styles.rowLabel}>Appleアカウントと連携する</Text>
                      <Text style={styles.rowSubLabel}>ゲストで使用中</Text>
                    </View>
                    {appleLoading
                      ? <ActivityIndicator size="small" color={colors.textTertiary} />
                      : <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
                    }
                  </TouchableOpacity>
                </>
              )}
            </>
          ) : provider === 'google' ? (
            <View style={styles.row}>
              {userAvatar ? (
                <Image source={{ uri: userAvatar }} style={styles.avatar} />
              ) : (
                <View style={styles.rowIcon}><GoogleLogoNeutral size={24} /></View>
              )}
              <View style={styles.rowContent}>
                <Text style={styles.rowLabel}>{userEmail ?? 'Googleアカウント'}</Text>
                <Text style={styles.rowSubLabel}>Googleでログイン中</Text>
              </View>
              <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
            </View>
          ) : (
            <View style={styles.row}>
              <Ionicons name="logo-apple" size={24} color={colors.textPrimary} style={styles.rowIcon} />
              <View style={styles.rowContent}>
                <Text style={styles.rowLabel}>
                  {userEmail?.includes('privaterelay.appleid.com')
                    ? 'メールアドレス非公開'
                    : (userEmail ?? 'Appleアカウント')}
                </Text>
                <Text style={styles.rowSubLabel}>Appleでログイン中</Text>
              </View>
              <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
            </View>
          )}
        </View>

        {/* 外観 */}
        <Text style={styles.sectionLabel}>外観</Text>
        <View style={styles.group}>
          {THEME_OPTIONS.map((option, index) => {
            const isActive = state.colorScheme === option.value;
            const isLast = index === THEME_OPTIONS.length - 1;
            return (
              <View key={option.value}>
                <TouchableOpacity
                  style={styles.row}
                  onPress={() => setColorScheme(option.value)}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: isActive }}
                >
                  <Ionicons
                    name={option.icon}
                    size={20}
                    color={colors.textTertiary}
                    style={styles.rowIcon}
                  />
                  <Text style={styles.rowLabel}>{option.label}</Text>
                  {isActive && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>使用中</Text>
                    </View>
                  )}
                </TouchableOpacity>
                {!isLast && <View style={styles.separator} />}
              </View>
            );
          })}
        </View>

        {/* 法的情報 */}
        <Text style={styles.sectionLabel}>法的情報</Text>
        <View style={styles.group}>
          <TouchableOpacity
            style={styles.row}
            onPress={() => Linking.openURL('https://app-saikou.netlify.app/apps/ideahatch?lang=ja#privacy')}
          >
            <Ionicons name="shield-checkmark-outline" size={20} color={colors.textTertiary} style={styles.rowIcon} />
            <Text style={styles.rowLabel}>プライバシーポリシー</Text>
            <Ionicons name="open-outline" size={16} color={colors.textTertiary} />
          </TouchableOpacity>
        </View>

        {/* サインアウト・アカウント削除（独立グループ） */}
        <View style={[styles.group, styles.groupDanger]}>
          <TouchableOpacity style={styles.row} onPress={handleSignOut}>
            <Ionicons name="log-out-outline" size={20} color={colors.textTertiary} style={styles.rowIcon} />
            <Text style={styles.rowLabel}>サインアウト</Text>
          </TouchableOpacity>
          <View style={styles.separator} />
          <TouchableOpacity style={styles.row} onPress={handleDeleteAccount} disabled={deleteLoading}>
            <Ionicons name="trash-outline" size={20} color="#EF4444" style={styles.rowIcon} />
            {deleteLoading
              ? <ActivityIndicator size="small" color="#EF4444" />
              : <Text style={[styles.rowLabel, styles.rowLabelDanger]}>アカウントを削除</Text>
            }
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (colors: AppColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  largeTitle: {
    fontSize: Typography['3xl'],
    fontWeight: '700',
    color: colors.textPrimary,
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.base,
    letterSpacing: -0.5,
  },
  sectionLabel: {
    fontSize: Typography.sm,
    fontWeight: '500',
    color: colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: Spacing.base,
    marginTop: Spacing.lg,
    marginBottom: Spacing.xs,
  },
  group: {
    backgroundColor: colors.surface,
    borderRadius: Radius.lg,
    marginHorizontal: Spacing.base,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  groupDanger: {
    marginTop: Spacing.lg,
  },
  badge: {
    backgroundColor: `${colors.primary}18`,
    borderRadius: Radius.full,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  badgeText: {
    fontSize: Typography.xs,
    color: colors.primary,
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    minHeight: 52,
  },
  rowActive: {
    backgroundColor: `${colors.primary}08`,
  },
  rowContent: {
    flex: 1,
    gap: 2,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: Spacing.md,
  },
  rowIcon: {
    width: 28,
    marginRight: Spacing.md,
  },
  rowLabel: {
    flex: 1,
    fontSize: Typography.base,
    color: colors.textPrimary,
  },
  rowSubLabel: {
    fontSize: Typography.sm,
    color: colors.textTertiary,
  },
  rowLabelDanger: {
    color: '#EF4444',
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginLeft: Spacing.base + 28 + Spacing.md,
  },
});
