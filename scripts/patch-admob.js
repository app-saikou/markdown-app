#!/usr/bin/env node
/**
 * iOS 26 対応: AdMob と HermesVM のシグナルハンドラ競合を防ぐパッチ
 *
 * 問題: AdMob はフレームワークロード時にシグナルハンドラを登録する。
 *       Hermes 実行中にそのシグナルが発火すると競合してクラッシュする。
 *       JS側の MobileAds().initialize() では防げない（タイミングが遅い）。
 *
 * 解決: AppDelegate.swift の React Native 起動前に disableSDKCrashReporting() を呼ぶ。
 *
 * expo prebuild 実行時（eas build 含む）に AppDelegate.swift が上書きされるため
 * このスクリプトで自動的に再適用する。
 *
 * 参照: invertase/react-native-google-mobile-ads#803, facebook/react-native#54859
 */

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../ios/IdeaHatch/AppDelegate.swift');

if (!fs.existsSync(filePath)) {
  console.log('[patch-admob] AppDelegate.swift が見つかりません。スキップします。');
  process.exit(0);
}

let content = fs.readFileSync(filePath, 'utf8');

// すでに適用済みならスキップ
if (content.includes('disableSDKCrashReporting')) {
  console.log('[patch-admob] すでに適用済みです。スキップします。');
  process.exit(0);
}

// import GoogleMobileAds を追加
if (!content.includes('import GoogleMobileAds')) {
  content = content.replace(
    'internal import Expo',
    'internal import Expo\nimport GoogleMobileAds'
  );
}

// disableSDKCrashReporting() を didFinishLaunching の先頭に追加
content = content.replace(
  '    let delegate = ReactNativeDelegate()',
  '    // iOS 26: AdMob のシグナルハンドラと Hermes の競合を防ぐ（必須）\n    // JS側の MobileAds().initialize() では防げない。フレームワークロード時に\n    // シグナルハンドラが登録されるため、React Native 起動前に無効化が必要。\n    MobileAds.shared.disableSDKCrashReporting()\n\n    let delegate = ReactNativeDelegate()'
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('[patch-admob] AppDelegate.swift にパッチを適用しました。');
