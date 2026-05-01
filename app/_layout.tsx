import { useEffect, useState } from 'react';
import { Platform, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { requestTrackingPermissionsAsync } from 'expo-tracking-transparency';
import MobileAds from 'react-native-google-mobile-ads';
import { AppProvider } from '../src/contexts/AppContext';
import { useApp } from '../src/contexts/AppContext';
import { ThemeProvider, useColors } from '../src/constants/theme';
import { getSession, configureGoogleSignIn } from '../src/lib/supabaseClient';

const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '';

// ThemeProvider でラップしてから Stack を描画するコンポーネント
function ThemedStack() {
  const colors = useColors();
  return (
    <>
      <StatusBar style="auto" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.textPrimary,
          headerShadowVisible: false,
          headerTitleStyle: { fontWeight: '600' },
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="note/[id]" options={{ title: '編集', headerBackTitle: 'ノート' }} />
        <Stack.Screen name="preview/[id]" options={{ headerShown: false, presentation: 'transparentModal', animation: 'slide_from_bottom', contentStyle: { backgroundColor: 'transparent' } }} />
      </Stack>
    </>
  );
}

// AppContext から colorScheme を取得して ThemeProvider に渡す
function InnerLayout() {
  const { state, loadAll } = useApp();
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    configureGoogleSignIn(GOOGLE_WEB_CLIENT_ID);
    getSession().then((session) => {
      if (session) {
        loadAll();
      } else {
        router.replace('/login');
      }
      setAuthChecked(true);
    });
  }, []);

  if (!authChecked) return null;

  return (
    <ThemeProvider scheme={state.colorScheme}>
      <ThemedStack />
    </ThemeProvider>
  );
}

async function initializeAds() {
  // iOS: ATT ダイアログを表示してトラッキング許可を求める
  // 拒否されても広告は表示される（requestNonPersonalizedAdsOnly: true で対応済み）
  if (Platform.OS === 'ios') {
    await requestTrackingPermissionsAsync();
  }

  // AdMob SDK を初期化
  await MobileAds().initialize();
}

export default function RootLayout() {
  useEffect(() => {
    initializeAds().catch(() => {
      // 初期化エラーは無視して続行（広告なしでアプリは動作する）
    });
  }, []);

  return (
    <GestureHandlerRootView style={StyleSheet.absoluteFill}>
      <AppProvider>
        <InnerLayout />
      </AppProvider>
    </GestureHandlerRootView>
  );
}
