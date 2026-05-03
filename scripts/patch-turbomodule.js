#!/usr/bin/env node
// iOS 26 対応: performVoidMethodInvocation の NSException 再スローを抑止する
// react-native 0.83.x の RCTTurboModule.mm は PR #56265 で @throw exception に変更されたが、
// dispatch queue ブロック内から再スローすると std::terminate → SIGABRT になる。
// void メソッドは戻り値なしなのでログだけして呑み込む。
// ※ buildReactNativeFromSource: true が必須（prebuilt バイナリにはパッチが効かないため）
const fs = require('fs');
const path = require('path');

const targetFile = path.join(
  __dirname,
  '../node_modules/react-native/ReactCommon/react/nativemodule/core/platform/ios/ReactCommon/RCTTurboModule.mm'
);

const original =
  '    } @catch (NSException *exception) {\n' +
  '      // Void methods are always async, re-throw instead of converting to\n' +
  '      // JSError, same as the async branch in performMethodInvocation.\n' +
  '      @throw exception;\n' +
  '    } @finally {';

// RCTLogError は内部で例外ハンドラーを呼ぶ場合があり @catch 内で使うと
// 二重例外 → @finally が rethrow → SIGABRT になる。NSLog を使う。
const patched =
  '    } @catch (NSException *exception) {\n' +
  '      // iOS 26: Re-throwing NSException from a dispatch block causes\n' +
  '      // std::terminate (SIGABRT). Swallow with NSLog only (not RCTLogError,\n' +
  '      // which can re-throw internally via RCTFatal).\n' +
  '      NSLog(@"[RCTTurboModule] Swallowed NSException in async void method: %@ %@",\n' +
  '            exception.name, exception.reason);\n' +
  '    } @finally {';

if (!fs.existsSync(targetFile)) {
  console.error('ERROR: RCTTurboModule.mm not found at:', targetFile);
  process.exit(1);
}

let content = fs.readFileSync(targetFile, 'utf8');

if (content.includes('NSLog(@"[RCTTurboModule] Swallowed NSException')) {
  console.log('  → RCTTurboModule.mm は既にパッチ済み');
  process.exit(0);
}

if (!content.includes(original)) {
  console.warn('  ⚠ RCTTurboModule.mm: 置換対象が見つかりません（バージョン変更？）スキップ');
  process.exit(0);
}

content = content.replace(original, patched);
fs.writeFileSync(targetFile, content, 'utf8');
console.log('  ✓ RCTTurboModule.mm パッチ適用: performVoidMethodInvocation の NSException を swallow');
