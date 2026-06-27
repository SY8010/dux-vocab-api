const isReplit = !!process.env.EXPO_PUBLIC_REPL_ID;

/** @type {import('expo/config').ExpoConfig} */
const config = {
  name: "DUX Vocabulary Test",
  slug: "dux-vocab",
  version: "1.0.0",
  orientation: "default",
  icon: "./assets/images/icon.png",
  scheme: "dux-vocab",
  userInterfaceStyle: "automatic",
  newArchEnabled: true,
  splash: {
    image: "./assets/images/icon.png",
    resizeMode: "contain",
    backgroundColor: "#F5F7FF",
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.dux.vocabularytest",
  },
  android: {
    adaptiveIcon: {
      foregroundImage: "./assets/images/icon.png",
      backgroundColor: "#F5F7FF",
    },
    package: "com.dux.vocabularytest",
    permissions: [
      "android.permission.CAMERA",
      "android.permission.RECORD_AUDIO",
    ],
  },
  web: {
    favicon: "./assets/images/icon.png",
  },
  plugins: [
    isReplit
      ? ["expo-router", { origin: "https://replit.com/" }]
      : "expo-router",
    "expo-font",
    "expo-web-browser",
    [
      "expo-camera",
      {
        cameraPermission:
          "단어장을 촬영하기 위해 카메라 접근이 필요합니다.",
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    eas: {
      projectId: "37edd3aa-ec59-4246-80a2-a0f59f4149d4",
    },
  },
};

module.exports = config;
