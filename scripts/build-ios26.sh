#!/bin/bash
# iOS 26 シミュレーター向けクリーンビルドスクリプト
# 使い方: bash scripts/build-ios26.sh

set -e
DEVICE_ID="93BB4D1D-F021-4743-BF9B-D84B0FC4EE60"
BUNDLE_ID="com.y.konishi.ideahatch"
PORT=8081
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_DIR"
echo "=== IdeaHatch iOS 26 クリーンビルド ==="

# 1. Metro プロセス停止
echo "[1/7] Metro プロセス停止..."
lsof -ti:8081 | xargs kill -9 2>/dev/null || true
lsof -ti:8082 | xargs kill -9 2>/dev/null || true

# 2. DerivedData クリア
echo "[2/7] DerivedData クリア..."
rm -rf ~/Library/Developer/Xcode/DerivedData/IdeaHatch-*

# 3. npm install（差分更新）
# rm -rf node_modules は一括インストール時に部分的な破損が起きやすいため使わない
# npm install を2回実行して不完全パッケージを確実に修復する
echo "[3/7] npm install..."
npm install
echo "  → npm install 2回目（念のため）..."
npm install

# 4. pod install（arm64 ネイティブで実行）
echo "[4/7] pod install（arm64）..."
env /usr/bin/arch -arm64 /bin/bash --login -c "cd '$PROJECT_DIR/ios' && pod install"

# 5. パッチ確認
echo "[5/7] パッチ確認..."
if grep -q "disableSDKCrashReporting" ios/IdeaHatch/AppDelegate.swift; then
  echo "  → AdMob パッチ適用済み"
else
  echo "  → AdMob パッチ未適用。適用します..."
  node scripts/patch-admob.js
fi
if grep -q "SWIFT_STRICT_CONCURRENCY" ios/Podfile; then
  echo "  → Podfile Swift 6 パッチ適用済み"
else
  echo "  → Podfile Swift 6 パッチ未適用。適用します..."
  node scripts/patch-podfile.js
fi

# 6. シミュレーターからアプリ削除
echo "[6/7] シミュレーターからアプリ削除..."
xcrun simctl uninstall "$DEVICE_ID" "$BUNDLE_ID" 2>/dev/null || true

# 7. ビルド実行（Codegen ファイル未生成で1回目が失敗することがある → 自動リトライ）
echo "[7/7] ビルド実行..."
if npx expo run:ios --device "$DEVICE_ID" --port "$PORT"; then
  echo "=== ビルド成功 ==="
else
  echo "  → 1回目失敗。Codegen ファイル生成待ちの可能性があるため再実行..."
  npx expo run:ios --device "$DEVICE_ID" --port "$PORT"
  echo "=== ビルド成功（2回目）==="
fi
