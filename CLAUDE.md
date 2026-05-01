# IdeaHatch

## 概要

雑なメモ → きれいなMarkdown文書 への変換ツール。
React Native × Expo SDK 55 + expo-router + Supabase。

## コマンド

- `npm run ios` — iOSシミュレータで起動
- `npm run android` — Android起動
- `npm run typecheck` — TypeScript型チェック

## ディレクトリ構成

```
app/                    # expo-router 画面
  _layout.tsx           # Root layout (AppProvider, Stack設定)
  index.tsx             # HomeScreen (一覧・検索・フィルタ)
  capture/[id].tsx      # CaptureScreen (テキスト入力・自動保存)
  idea/structure/[captureId].tsx  # StructureScreen (AIモック・プレビュー)
  idea/[id].tsx         # MarkdownEditScreen (直接編集・プレビュートグル)
  preview/[id].tsx      # PreviewScreen (コピー・MD共有・PDF共有)
src/
  types/index.ts        # Capture / Idea 型定義
  constants/theme.ts    # カラー・タイポグラフィ・スペーシング定数
  contexts/AppContext.tsx  # グローバル状態管理 (useReducer)
  lib/
    supabaseClient.ts   # Supabaseクライアント
    repository.ts       # Supabase CRUD操作の抽象化
  components/
    CaptureCard.tsx     # キャプチャ一覧カード
    IdeaCard.tsx        # アイデア一覧カード
  utils/
    aiMock.ts           # AIモック (structureText関数)
    markdownGenerator.ts # MD→HTML変換 (PDF用)
supabase/
  schema.sql            # DBスキーマ (captures / ideas テーブル)
```

## 環境変数 (.env)

```
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
```

## AI統合時の差し替えポイント

`src/utils/aiMock.ts` の `structureText(rawText: string): Promise<string>` を
実際のAPI呼び出しに差し替えるだけで対応可能。

## 注意事項

- expo-router では `app/` ディレクトリがルーティングの基点
- `@/*` は `src/*` へのパスエイリアス (tsconfig.json)
- Supabase操作は常にtry-catchでエラーハンドリング

## App Store 申請

@docs/appstore-guide.md
