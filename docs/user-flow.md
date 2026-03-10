# ユーザー操作フロー詳細

## 画面マップ

```
HomeScreen（一覧）
├── [FAB +] → CaptureScreen（新規メモ）
│               └── [構造化する] → StructureScreen（AI構造化）
│                                   └── [保存して編集] → MarkdownEditScreen（編集）
│                                                         └── [共有・エクスポート] → PreviewScreen
└── [Ideaタップ] → MarkdownEditScreen（編集）
                    └── [共有・エクスポート] → PreviewScreen

└── [Captureタップ] → CaptureScreen（既存メモ編集）
```

---

## フロー1: 新規メモ → 構造化 → エクスポート（メインフロー）

### Step 1: HomeScreen（一覧画面）

**初期表示**
- アプリ起動時に `loadAll()` が実行され、Supabaseから captures / ideas を取得
- 読み込み中は「ちょっと待って、読み込み中...」のローディング表示
- データが空の場合、空状態を表示：
  - Ideasタブ：「💡 まだアイデアがない / 頭の中にあるアイデア、ここに投げちゃいな」
  - Capturesタブ：「📝 メモがまだない / 思いついたこと、なんでも書いてOK」

**操作**
| 操作 | 動作 |
|------|------|
| FAB（＋）タップ | 空のCaptureをSupabaseに作成 → CaptureScreen へ遷移 |
| Ideaカードタップ | MarkdownEditScreen へ遷移 |
| Captureカードタップ | CaptureScreen（既存メモ）へ遷移 |
| 検索バーに入力 | タイトル・本文をリアルタイムフィルタ |
| ステータスフィルタタップ | すべて / 下書き / 構造化済み / 出力済み で絞り込み |
| タブ切替（アイデア / メモ） | リスト表示を切り替え |

---

### Step 2: CaptureScreen（メモ入力画面）

**初期表示**
- 画面遷移から300ms後にTextInputへ自動フォーカス（キーボードが自動表示）
- 既存Captureの場合は `rawText` を読み込んで表示
- ステータスバーに「何でも書いてOK」と表示

**操作**
| 操作 | 動作 |
|------|------|
| テキスト入力 | 入力開始から500ms後に自動保存（debounce）。Supabaseの captures テーブルを更新 |
| 入力中（保存中） | ステータスバーに「保存中...」と表示 |
| 保存完了後 | 「{文字数}文字 · 自動保存済み」と表示 |
| 🎙 音声入力タップ | （MVP: ボタン表示のみ、機能は未実装） |
| 「✨ 構造化する」タップ | テキストが空の場合はアラート。入力ありの場合は最終保存 → StructureScreen へ遷移 |
| 「削除」タップ | 確認ダイアログ → 承認でCapture削除 → HomeScreen へ戻る |
| 戻るジェスチャー | HomeScreen へ戻る（自動保存済みのため内容は保持） |

**自動保存の仕様**
- debounce: 500ms（最後の入力から500ms無操作で発火）
- 空文字の場合は保存しない
- 画面アンマウント時にタイマーをクリーンアップ

---

### Step 3: StructureScreen（AI構造化画面）

**初期表示（ローディング）**
- 画面遷移直後にAI構造化が自動開始
- ローディングカードを中央に表示：
  - 🧠 アイコン
  - スピナー
  - メッセージが700msごとにローテーション：
    1. 「ちょっと待って、考え中...」
    2. 「思考を整えています...」
    3. 「いい感じになりそう...」
    4. 「もうすぐできます...」
- 処理時間: 1.5〜2.5秒（AIモックの遅延）

**生成完了後の表示**
- 「✅ 構造化できました」のラベル
- 生成されたMarkdownを `react-native-markdown-display` でプレビュー表示
- 「🔄 再生成」ボタン（別パターンを生成）

**生成されるMarkdownの構造**
```markdown
# {タイトル（入力テキストから抽出）}

## 概要
> {最初の一文}

## 詳細

### ポイント
- {箇条書き...}

### 補足・背景
- {箇条書き...}

## 次のアクション
- [ ] 詳細を詰める
- [ ] 関係者に共有する
- [ ] 実装・実行に移す

---
*AI構造化 — {日付}*
```

**操作**
| 操作 | 動作 |
|------|------|
| 「🔄 再生成」タップ | 同じ rawText で再度 `structureText()` を実行 |
| 「保存して編集 →」タップ | ideasテーブルに保存（status: structured）→ MarkdownEditScreen へ遷移（`router.replace`） |
| 「戻る」タップ | CaptureScreen へ戻る（Ideaは保存されない） |

---

### Step 4: MarkdownEditScreen（Markdown編集画面）

**初期表示**
- タイトル入力フィールド（上部）
- タグ入力フィールド（カンマ区切り）
- 編集 / プレビュー トグル（初期は「編集」モード）
- Markdownテキストエリア（等幅フォント）
- 「✓ 保存済み」ステータス表示

**操作**
| 操作 | 動作 |
|------|------|
| タイトル編集 → フォーカスを外す | Supabaseの `title` を更新 |
| タグ編集 → フォーカスを外す | カンマで分割してSupabaseの `tags[]` を更新 |
| Markdown入力 | 500ms debounceで自動保存（`markdown_content` を更新） |
| 「✏️ 編集」タップ | 編集モード（等幅フォントのTextInput） |
| 「👁 プレビュー」タップ | プレビューモード（Markdownレンダリング表示） |
| 「削除」タップ | 確認ダイアログ → 承認でIdea削除 → HomeScreen へ `router.replace('/')` |
| 「📤 共有・エクスポート」タップ | PreviewScreen へ遷移（modal） |

---

### Step 5: PreviewScreen（エクスポート画面）

**表示**
- アイデアのタイトル
- 「エクスポート形式を選んでください」のサブテキスト
- 3つのエクスポートオプション（カード形式）

**エクスポートオプション**

#### 📋 Markdownをコピー
1. `expo-clipboard` で `markdownContent` をクリップボードにコピー
2. `status` を `exported` に更新（まだの場合）
3. 「コピーしました！」のアラートを表示
4. → Cursor や他のエディタにそのまま貼り付けて利用可能

#### 📄 .mdファイルとして共有
1. `expo-file-system` でキャッシュディレクトリに `.md` ファイルを書き出し
2. `expo-sharing` でシステム共有シートを表示
3. `status` を `exported` に更新
4. → AirDrop / Files / メール等で共有可能

#### 🗒 PDFとして共有
1. `markdownToHtml()` でMarkdownをHTMLに変換
2. `expo-print` でPDFファイルを生成
3. `expo-sharing` でシステム共有シートを表示
4. `status` を `exported` に更新
5. → 企画資料としてそのまま共有可能

**各操作中の状態**
- ボタンのアイコン部分がスピナーに変化
- 他のボタンは `disabled`（多重実行防止）

---

## フロー2: 既存メモの再編集

```
HomeScreen
 └── [Captureタブ] → Captureカードタップ
      └── CaptureScreen（既存テキストが読み込まれた状態）
           ├── 編集 → 自動保存
           └── [構造化する] → StructureScreen → ...（フロー1のStep3以降と同じ）
```

---

## フロー3: 既存アイデアの直接編集

```
HomeScreen
 └── [Ideasタブ] → Ideaカードタップ
      └── MarkdownEditScreen（既存Markdownが読み込まれた状態）
           ├── 直接編集・自動保存
           └── [共有・エクスポート] → PreviewScreen
```

---

## ステータス遷移

```
captures作成
  ↓
ideas作成 → status: "structured"（構造化完了時に自動設定）
  ↓
エクスポート → status: "exported"（コピー・共有・PDF出力時に自動更新）
```

HomeScreenのフィルタで `draft / structured / exported` を絞り込み可能。
※ `draft` は将来的な直接作成フロー用（現在は `structured` から開始）

---

## エラーハンドリング

| 状況 | 表示 |
|------|------|
| Supabase接続失敗（loadAll） | 「読み込みに失敗しました」（Context内でエラーセット） |
| 構造化する（テキスト空） | 「テキストを入力してください」アラート |
| Capture削除 | 確認ダイアログ（誤操作防止） |
| Idea削除 | 確認ダイアログ（誤操作防止） |
| コピー失敗 | 「コピーに失敗しました。」アラート |
| ファイル共有失敗 | 「ファイル共有に失敗しました。」アラート |
| PDF生成失敗 | 「PDF生成に失敗しました。」アラート |
