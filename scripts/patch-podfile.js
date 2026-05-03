#!/usr/bin/env node
/**
 * Xcode 26 対応: Swift 6 strict concurrency 無効化 + ExpoModulesProvider import 修正
 *
 * 問題1: Xcode 26 は Swift 6 の strict concurrency をデフォルトで有効にするため、
 *        expo-modules-core 等の Pod がビルドエラーになる。
 * 問題2: SDK 54 の ExpoModulesProvider.swift が `import Expo` を access level なしで
 *        記述しているため、Swift 5.10+ で "ambiguous implicit access level" エラーになる。
 *
 * 解決: post_install ブロックに以下を追加する
 *   1. SWIFT_STRICT_CONCURRENCY=minimal / SWIFT_VERSION=5.0
 *   2. ExpoModulesProvider.swift の `import Expo` を `internal import Expo` に書き換え
 *
 * expo prebuild --clean 実行時（eas build 含む）に Podfile が上書きされるため
 * このスクリプトで自動的に再適用する。
 */

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../ios/Podfile');

if (!fs.existsSync(filePath)) {
  console.log('[patch-podfile] Podfile が見つかりません。スキップします。');
  process.exit(0);
}

let content = fs.readFileSync(filePath, 'utf8');

if (content.includes('SWIFT_STRICT_CONCURRENCY')) {
  console.log('[patch-podfile] すでに適用済みです。スキップします。');
  process.exit(0);
}

const searchStr =
  '    react_native_post_install(\n      installer,\n      config[:reactNativePath],\n      :mac_catalyst_enabled => false,\n      :ccache_enabled => ccache_enabled?(podfile_properties),\n    )\n  end';

const replaceStr =
  '    react_native_post_install(\n      installer,\n      config[:reactNativePath],\n      :mac_catalyst_enabled => false,\n      :ccache_enabled => ccache_enabled?(podfile_properties),\n    )\n' +
  "    # Swift 6 strict concurrency を無効化（Xcode 26対応）\n" +
  '    installer.pods_project.targets.each do |target|\n' +
  '      target.build_configurations.each do |config|\n' +
  "        config.build_settings['SWIFT_STRICT_CONCURRENCY'] = 'minimal'\n" +
  "        config.build_settings['SWIFT_VERSION'] = '5.0'\n" +
  '      end\n' +
  '    end\n' +
  "    # ExpoModulesProvider.swift の import Expo を internal に修正（Xcode 26対応）\n" +
  '    provider = File.join(installer.sandbox.root.to_s, "Target Support Files", "Pods-IdeaHatch", "ExpoModulesProvider.swift")\n' +
  '    if File.exist?(provider)\n' +
  '      src = File.read(provider)\n' +
  '      patched = src.gsub(/^import Expo$/, "internal import Expo")\n' +
  '      File.write(provider, patched) if patched != src\n' +
  '    end\n' +
  '  end';

content = content.replace(searchStr, replaceStr);

fs.writeFileSync(filePath, content, 'utf8');
console.log('[patch-podfile] Podfile に Swift 6 パッチを適用しました。');
