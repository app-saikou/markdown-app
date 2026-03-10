const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// SVG サポート
const { transformer, resolver } = config;
config.transformer = {
  ...transformer,
  babelTransformerPath: require.resolve('react-native-svg-transformer'),
};
config.resolver = {
  ...resolver,
  assetExts: resolver.assetExts.filter((ext) => ext !== 'svg'),
  sourceExts: [...resolver.sourceExts, 'svg'],
  // react-native-markdown-display → markdown-it → punycode (Node標準) の問題をポリフィルで解決
  extraNodeModules: {
    punycode: require.resolve('punycode/'),
  },
};

module.exports = config;
