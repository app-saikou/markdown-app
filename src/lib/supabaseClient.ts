import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import * as AppleAuthentication from 'expo-apple-authentication';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

const IOS_CLIENT_ID = '420933603880-839f2s8oteoi6hr8bdoruvpojm8r7nap.apps.googleusercontent.com';

/** Google Sign-In を初期化する（アプリ起動時に呼ぶ） */
export function configureGoogleSignIn(webClientId: string) {
  GoogleSignin.configure({ webClientId, iosClientId: IOS_CLIENT_ID });
}

/** 匿名サインイン */
export async function signInAnonymously(): Promise<void> {
  const { error } = await supabase.auth.signInAnonymously();
  if (error) throw error;
}

/** Googleサインイン（匿名ユーザーのデータを引き継ぐ） */
export async function signInWithGoogle(): Promise<void> {
  // 連携前の匿名ユーザーIDを記録
  const { data: { session: prevSession } } = await supabase.auth.getSession();
  const prevUserId = prevSession?.user?.is_anonymous ? prevSession.user.id : null;

  await GoogleSignin.hasPlayServices();
  const { data: googleData } = await GoogleSignin.signIn();
  const idToken = googleData?.idToken;
  if (!idToken) throw new Error('Google IDトークンが取得できませんでした。');

  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: 'google',
    token: idToken,
  });
  if (error) throw error;

  // 匿名ユーザーのデータを新しいユーザーIDに移行
  const newUserId = data.user?.id;
  if (prevUserId && newUserId && prevUserId !== newUserId) {
    await supabase.rpc('migrate_user_data', {
      old_user_id: prevUserId,
      new_user_id: newUserId,
    });
  }
}

/** Apple Sign-In（匿名ユーザーのデータを引き継ぐ） */
export async function signInWithApple(): Promise<void> {
  const { data: { session: prevSession } } = await supabase.auth.getSession();
  const prevUserId = prevSession?.user?.is_anonymous ? prevSession.user.id : null;

  const credential = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
  });

  if (!credential.identityToken) throw new Error('Apple IDトークンが取得できませんでした。');

  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: 'apple',
    token: credential.identityToken,
  });
  if (error) throw error;

  const newUserId = data.user?.id;
  if (prevUserId && newUserId && prevUserId !== newUserId) {
    await supabase.rpc('migrate_user_data', {
      old_user_id: prevUserId,
      new_user_id: newUserId,
    });
  }
}

/** サインアウト */
export async function signOut(): Promise<void> {
  await GoogleSignin.signOut().catch(() => {});
  await supabase.auth.signOut();
}

/** アカウント削除（全データ + 認証情報） */
export async function deleteAccount(): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('セッションがありません。再ログインしてください。');

  const res = await fetch(`${supabaseUrl}/functions/v1/delete-account`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
      'apikey': supabaseAnonKey,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error ?? `サーバーエラー: ${res.status}`);
  }

  await GoogleSignin.signOut().catch(() => {});
  await supabase.auth.signOut();
}

/** 現在のログインプロバイダーを取得 */
export type AuthProvider = 'google' | 'apple' | 'anonymous';

export async function getProvider(): Promise<AuthProvider> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session || session.user.is_anonymous) return 'anonymous';
  const provider = session.user.app_metadata?.provider;
  if (provider === 'apple') return 'apple';
  return 'google';
}

/** 現在のセッションを取得 */
export async function getSession() {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}
