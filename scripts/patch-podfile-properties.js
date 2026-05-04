#!/usr/bin/env node
/**
 * EAS ビルドで React Native をソースからビルドさせるパッチ
 *
 * 問題: expo prebuild --clean が生成する Podfile.properties.json には
 *       ios.buildReactNativeFromSource が含まれない。
 *       このため EAS は RCT_USE_RN_DEP=1, RCT_USE_PREBUILT_RNCORE=1 を設定し、
 *       prebuilt の React.framework / ReactNativeDependencies.framework を使う。
 *       → node_modules の RCTTurboModule.mm へのパッチがコンパイルされない。
 *
 * 解決: ios.buildReactNativeFromSource=true を追加して Podfile の
 *       ENV['RCT_USE_RN_DEP'] と ENV['RCT_USE_PREBUILT_RNCORE'] を無効化する。
 *       これにより pod install 時に RCTTurboModule.mm がソースからコンパイルされ、
 *       patch-turbomodule.js のパッチが有効になる。
 *
 * 注意: ビルド時間が 10〜15 分程度増加する。
 *
 * 参照: ios/Podfile の18-19行目を確認
 *   ENV['RCT_USE_RN_DEP'] ||= '1' if podfile_properties['ios.buildReactNativeFromSource'] != 'true'
 *   ENV['RCT_USE_PREBUILT_RNCORE'] ||= '1' if podfile_properties['ios.buildReactNativeFromSource'] != 'true'
 */

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../ios/Podfile.properties.json');

if (!fs.existsSync(filePath)) {
  console.error('[patch-podfile-properties] Podfile.properties.json が見つかりません:', filePath);
  process.exit(1);
}

const properties = JSON.parse(fs.readFileSync(filePath, 'utf8'));

if (properties['ios.buildReactNativeFromSource'] === 'true') {
  console.log('[patch-podfile-properties] すでに ios.buildReactNativeFromSource=true です。スキップします。');
  process.exit(0);
}

properties['ios.buildReactNativeFromSource'] = 'true';

fs.writeFileSync(filePath, JSON.stringify(properties, null, 2) + '\n', 'utf8');
console.log('[patch-podfile-properties] ios.buildReactNativeFromSource=true を設定しました。');
console.log('  → RCT_USE_RN_DEP と RCT_USE_PREBUILT_RNCORE が無効化されます。');
console.log('  → React Native がソースからビルドされ、patch-turbomodule.js が有効になります。');
