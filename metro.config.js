const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add tflite as an asset extension so Metro can bundle ML models
config.resolver.assetExts.push('tflite');

module.exports = config;
