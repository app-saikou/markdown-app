import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import { Ionicons } from "@expo/vector-icons";
import { useApp } from "../src/contexts/AppContext";
import { signInAnonymously, signInWithGoogle, signInWithApple } from "../src/lib/supabaseClient";
import {
  useColors,
  AppColors,
  Typography,
  Spacing,
  Radius,
} from "../src/constants/theme";

function GoogleIcon({ size = 20 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <Path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <Path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <Path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
      <Path fill="none" d="M0 0h48v48H0z"/>
    </Svg>
  );
}

// ヒーローエリアのアイコン（ペン＋ドキュメントのイメージ）
function HeroIcon({ color }: { color: string }) {
  return (
    <Svg width={64} height={64} viewBox="0 0 64 64" fill="none">
      <Path
        d="M16 8h24l12 12v36H16V8z"
        fill="none"
        stroke={color}
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <Path
        d="M40 8v12h12"
        fill="none"
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M24 28h16M24 36h16M24 44h10"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <Path
        d="M44 42l4-4 4 4-8 8H40v-4l4-4z"
        fill={color}
        opacity={0.8}
      />
    </Svg>
  );
}

export default function LoginScreen() {
  const { loadAll } = useApp();
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [loading, setLoading] = useState<"google" | "apple" | "guest" | null>(null);

  const handleGoogle = async () => {
    setLoading("google");
    try {
      await signInWithGoogle();
      await loadAll();
      router.replace("/(tabs)");
    } catch (e) {
      Alert.alert(
        "エラー",
        e instanceof Error ? e.message : "Googleサインインに失敗しました。",
      );
    } finally {
      setLoading(null);
    }
  };

  const handleApple = async () => {
    setLoading("apple");
    try {
      await signInWithApple();
      await loadAll();
      router.replace("/(tabs)");
    } catch (e: unknown) {
      // ERR_CANCELED はユーザーがキャンセルしただけなので無視
      if (e instanceof Error && (e as { code?: string }).code === 'ERR_CANCELED') return;
      Alert.alert(
        "エラー",
        e instanceof Error ? e.message : "Appleサインインに失敗しました。",
      );
    } finally {
      setLoading(null);
    }
  };

  const handleGuest = async () => {
    setLoading("guest");
    try {
      await signInAnonymously();
      await loadAll();
      router.replace("/(tabs)");
    } catch (e) {
      Alert.alert(
        "エラー",
        e instanceof Error ? e.message : "サインインに失敗しました。",
      );
    } finally {
      setLoading(null);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.inner}>
        <View style={styles.hero}>
          <HeroIcon color={colors.textSecondary} />
          <View style={styles.heroText}>
            <Text style={styles.appName}>IdeaHatch</Text>
            <Text style={styles.tagline}>雑なメモを、伝わる文書に。</Text>
          </View>
        </View>

        <View style={styles.buttons}>
          <TouchableOpacity
            style={styles.googleBtn}
            onPress={handleGoogle}
            disabled={loading !== null}
            activeOpacity={0.8}
          >
            <>
              <View style={styles.googleBtnIcon}>
                {loading === "google" ? (
                  <ActivityIndicator color="#1F1F1F" size="small" />
                ) : (
                  <GoogleIcon size={20} />
                )}
              </View>
              <Text style={styles.googleBtnText}>Googleでログイン</Text>
            </>
          </TouchableOpacity>

          {Platform.OS === "ios" && (
            <TouchableOpacity
              style={styles.appleBtn}
              onPress={handleApple}
              disabled={loading !== null}
              activeOpacity={0.8}
            >
              {loading === "apple" ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name="logo-apple" size={20} color="#fff" style={styles.appleBtnIcon} />
                  <Text style={styles.appleBtnText}>Appleでログイン</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.guestBtn}
            onPress={handleGuest}
            disabled={loading !== null}
            activeOpacity={0.7}
          >
            {loading === "guest" ? (
              <ActivityIndicator color={colors.textTertiary} size="small" />
            ) : (
              <Text style={styles.guestBtnText}>ゲストで使用</Text>
            )}
          </TouchableOpacity>

          <Text style={styles.note}>
            ゲストの場合、端末を変えるとデータが引き継がれません。
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const makeStyles = (colors: AppColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    inner: {
      flex: 1,
      paddingHorizontal: Spacing.xl,
      justifyContent: "space-between",
      paddingBottom: Spacing["2xl"],
    },
    hero: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      gap: Spacing.lg,
    },
    heroText: {
      alignItems: "center",
      gap: Spacing.sm,
    },
    appName: {
      fontSize: 40,
      fontWeight: "700",
      color: colors.textPrimary,
      letterSpacing: -1,
    },
    tagline: {
      fontSize: Typography.lg,
      color: colors.textTertiary,
      fontWeight: "400",
    },
    buttons: {
      gap: Spacing.md,
    },
    googleBtn: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.surface,
      borderRadius: Radius.full,
      height: 52,
      borderWidth: 1.5,
      borderColor: "#747775",
      paddingLeft: 20,
      paddingRight: 24,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.08,
      shadowRadius: 4,
    },
    googleBtnIcon: {
      width: 20,
      height: 20,
      justifyContent: "center",
      alignItems: "center",
    },
    googleBtnText: {
      flex: 1,
      textAlign: "center",
      fontSize: Typography.base,
      fontWeight: "600",
      color: colors.textPrimary,
      marginLeft: 12,
      marginRight: 20,
    },
    appleBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#000",
      borderRadius: Radius.full,
      height: 52,
    },
    appleBtnIcon: {
      marginRight: 8,
    },
    appleBtnText: {
      fontSize: Typography.base,
      fontWeight: "600",
      color: "#fff",
    },
    guestBtn: {
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.surfaceSecondary,
      borderRadius: Radius.full,
      height: 52,
      borderWidth: 1,
      borderColor: colors.border,
    },
    guestBtnText: {
      fontSize: Typography.base,
      fontWeight: "500",
      color: colors.textSecondary,
    },
    note: {
      fontSize: Typography.xs,
      color: colors.textTertiary,
      textAlign: "center",
      lineHeight: Typography.xs * 1.6,
    },
  });
