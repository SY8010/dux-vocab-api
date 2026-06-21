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
import { MaterialIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useColors();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const handleGallery = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push("/gallery");
  };

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

      {/* Logo / Title */}
      <View style={styles.topSection}>
        <View
          style={[
            styles.iconRing,
            {
              backgroundColor: colors.primary + "18",
              borderColor: colors.primary + "40",
            },
          ]}
        >
          <View style={[styles.iconCircle, { backgroundColor: colors.primary }]}>
            <MaterialIcons name="menu-book" size={52} color="#fff" />
          </View>
        </View>

        <Text style={[styles.title, { color: colors.foreground }]}>
          DUX Vocabulary Test
        </Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          created by RangRang's Dad
        </Text>
      </View>

      {/* Add a vocabulary set */}
      <View style={styles.addSection}>
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
          단어장 추가
        </Text>

        {/* Primary — gallery */}
        <TouchableOpacity
          style={[
            styles.primaryButton,
            { backgroundColor: colors.primary, borderRadius: colors.radius + 4 },
          ]}
          onPress={handleGallery}
          activeOpacity={0.88}
        >
          <View style={styles.btnInner}>
            <View style={[styles.btnIconWrap, { backgroundColor: "#ffffff30" }]}>
              <MaterialIcons name="photo-library" size={28} color="#fff" />
            </View>
            <View style={styles.btnTextWrap}>
              <Text style={styles.primaryButtonText}>사진 올리기</Text>
              <Text style={styles.primaryButtonSub}>
                갤러리에서 1–5장 선택
              </Text>
            </View>
            <MaterialIcons name="chevron-right" size={22} color="#ffffff90" />
          </View>
        </TouchableOpacity>

        {/* Secondary — camera */}
        <TouchableOpacity
          style={[
            styles.secondaryButton,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              borderRadius: colors.radius + 4,
            },
          ]}
          onPress={handleCamera}
          activeOpacity={0.88}
        >
          <View style={styles.btnInner}>
            <View style={[styles.btnIconWrap, { backgroundColor: colors.secondary }]}>
              <MaterialIcons name="photo-camera" size={26} color={colors.primary} />
            </View>
            <View style={styles.btnTextWrap}>
              <Text style={[styles.secondaryButtonText, { color: colors.foreground }]}>
                직접 찍기
              </Text>
              <Text style={[styles.secondaryButtonSub, { color: colors.mutedForeground }]}>
                카메라로 단어장 촬영
              </Text>
            </View>
            <MaterialIcons name="chevron-right" size={22} color={colors.mutedForeground} />
          </View>
        </TouchableOpacity>
      </View>

      {/* Saved sets */}
      <TouchableOpacity
        style={[
          styles.savedButton,
          {
            backgroundColor: colors.muted,
            borderRadius: colors.radius + 4,
          },
        ]}
        onPress={handleSaved}
        activeOpacity={0.88}
      >
        <MaterialIcons name="folder-open" size={22} color={colors.primary} />
        <Text style={[styles.savedButtonText, { color: colors.foreground }]}>
          저장된 단어장
        </Text>
        <MaterialIcons name="chevron-right" size={18} color={colors.mutedForeground} style={{ marginLeft: "auto" }} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: "space-between",
  },
  topSection: {
    alignItems: "center",
    paddingTop: 12,
    gap: 14,
  },
  iconRing: {
    width: 130,
    height: 130,
    borderRadius: 65,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  iconCircle: {
    width: 104,
    height: 104,
    borderRadius: 52,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 8,
  },
  title: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
  addSection: {
    gap: 12,
  },
  sectionLabel: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    paddingLeft: 4,
    marginBottom: 2,
  },
  primaryButton: {
    shadowColor: "#3B6FE8",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 14,
    elevation: 6,
  },
  secondaryButton: {
    borderWidth: 1.5,
  },
  btnInner: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 18,
    paddingHorizontal: 18,
    gap: 14,
  },
  btnIconWrap: {
    width: 50,
    height: 50,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  btnTextWrap: {
    flex: 1,
    gap: 3,
  },
  primaryButtonText: {
    fontSize: 19,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
  primaryButtonSub: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "#ffffff99",
  },
  secondaryButtonText: {
    fontSize: 19,
    fontFamily: "Inter_700Bold",
  },
  secondaryButtonSub: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  savedButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 16,
    paddingHorizontal: 18,
  },
  savedButtonText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
});
