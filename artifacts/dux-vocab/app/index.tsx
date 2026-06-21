import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useColors();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const handleCamera = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push("/camera");
  };

  const handleSaved = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push("/saved");
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
          paddingTop: topPad + 24,
          paddingBottom: botPad + 24,
        },
      ]}
    >
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      <View style={styles.topSection}>
        <View
          style={[
            styles.iconRing,
            { backgroundColor: colors.primary + "18", borderColor: colors.primary + "40" },
          ]}
        >
          <View style={[styles.iconCircle, { backgroundColor: colors.primary }]}>
            <Ionicons name="book" size={52} color="#fff" />
          </View>
        </View>

        <Text style={[styles.title, { color: colors.foreground }]}>
          DUX Vocabulary Test
        </Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          created by RangRang's Dad
        </Text>
      </View>

      <View style={styles.buttonSection}>
        <TouchableOpacity
          style={[
            styles.primaryButton,
            { backgroundColor: colors.primary, borderRadius: colors.radius + 4 },
          ]}
          onPress={handleCamera}
          activeOpacity={0.88}
        >
          <View style={styles.btnInner}>
            <View style={[styles.btnIconWrap, { backgroundColor: "#ffffff30" }]}>
              <Ionicons name="camera" size={30} color="#fff" />
            </View>
            <View style={styles.btnTextWrap}>
              <Text style={styles.primaryButtonText}>단어장 촬영 시작</Text>
              <Text style={styles.primaryButtonSub}>
                사진을 찍어 단어를 추출합니다
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={22} color="#ffffff90" />
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.secondaryButton,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              borderRadius: colors.radius + 4,
            },
          ]}
          onPress={handleSaved}
          activeOpacity={0.88}
        >
          <View style={styles.btnInner}>
            <View style={[styles.btnIconWrap, { backgroundColor: colors.secondary }]}>
              <Ionicons name="folder-open" size={28} color={colors.primary} />
            </View>
            <View style={styles.btnTextWrap}>
              <Text style={[styles.secondaryButtonText, { color: colors.foreground }]}>
                저장된 단어장
              </Text>
              <Text style={[styles.secondaryButtonSub, { color: colors.mutedForeground }]}>
                이전에 저장된 단어장 보기
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={22} color={colors.mutedForeground} />
          </View>
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Text style={[styles.footerText, { color: colors.mutedForeground }]}>
          최대 5장의 사진을 촬영할 수 있습니다
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "space-between",
    paddingHorizontal: 28,
  },
  topSection: {
    alignItems: "center",
    paddingTop: 20,
    gap: 16,
  },
  iconRing: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  iconCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 8,
  },
  title: {
    fontSize: 30,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
  buttonSection: {
    gap: 16,
  },
  primaryButton: {
    shadowColor: "#3B6FE8",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 6,
  },
  secondaryButton: {
    borderWidth: 1.5,
  },
  btnInner: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 20,
    paddingHorizontal: 20,
    gap: 14,
  },
  btnIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  btnTextWrap: {
    flex: 1,
    gap: 3,
  },
  primaryButtonText: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
  primaryButtonSub: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "#ffffff99",
  },
  secondaryButtonText: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
  },
  secondaryButtonSub: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  footer: {
    alignItems: "center",
  },
  footerText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
});
