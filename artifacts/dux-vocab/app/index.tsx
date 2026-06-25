import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
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

  return (
    <LinearGradient
      colors={[colors.gradientTop, colors.gradientBottom]}
      style={styles.gradient}
    >
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      <View
        style={[
          styles.container,
          { paddingTop: topPad + 20, paddingBottom: botPad + 24 },
        ]}
      >
        {/* ── Decorative motif row ── */}
        <View style={styles.motifRow}>
          <View style={[styles.motifIcon, { backgroundColor: colors.accent + "25" }]}>
            <MaterialIcons name="mail-outline" size={20} color={colors.skyBlue} />
          </View>
          <View style={[styles.motifIcon, { backgroundColor: colors.primary + "20" }]}>
            <MaterialIcons name="eco" size={20} color={colors.primary} />
          </View>
          <View style={[styles.motifIcon, { backgroundColor: colors.sunshine + "30" }]}>
            <MaterialIcons name="star" size={20} color={colors.sunshine} />
          </View>
          <View style={[styles.motifIcon, { backgroundColor: colors.softGreen + "40" }]}>
            <MaterialIcons name="local-florist" size={20} color={colors.softGreen} />
          </View>
          <View style={[styles.motifIcon, { backgroundColor: colors.accent + "25" }]}>
            <MaterialIcons name="wb-sunny" size={20} color={colors.skyBlue} />
          </View>
        </View>

        {/* ── Title area ── */}
        <View style={styles.titleArea}>
          <View style={[styles.logoCircle, { backgroundColor: colors.primary }]}>
            <MaterialIcons name="menu-book" size={48} color="#fff" />
          </View>
          <Text style={[styles.title, { color: colors.foreground }]}>
            DUX Vocabulary Test
          </Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            created by RangRang's Dad
          </Text>
        </View>

        {/* ── Action buttons ── */}
        <View style={styles.actions}>
          {/* Primary — camera */}
          <TouchableOpacity
            style={[styles.pillPrimary, { backgroundColor: colors.primary }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              router.push("/camera");
            }}
            activeOpacity={0.85}
          >
            <MaterialIcons name="photo-camera" size={26} color="#fff" />
            <Text style={styles.pillPrimaryText}>단어장 촬영 시작</Text>
          </TouchableOpacity>

          {/* Secondary — gallery */}
          <TouchableOpacity
            style={[
              styles.pillSecondary,
              { backgroundColor: colors.card, borderColor: colors.skyBlue },
            ]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push("/gallery");
            }}
            activeOpacity={0.85}
          >
            <MaterialIcons name="photo-library" size={24} color={colors.skyBlue} />
            <Text style={[styles.pillSecondaryText, { color: colors.skyBlue }]}>
              사진으로 추가
            </Text>
          </TouchableOpacity>

          {/* Tertiary — saved sets */}
          <TouchableOpacity
            style={[
              styles.pillSecondary,
              { backgroundColor: colors.card, borderColor: colors.primary },
            ]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push("/saved");
            }}
            activeOpacity={0.85}
          >
            <MaterialIcons name="folder-open" size={24} color={colors.primary} />
            <Text style={[styles.pillSecondaryText, { color: colors.primary }]}>
              저장된 단어장
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── Bottom decoration ── */}
        <View style={styles.bottomRow}>
          <MaterialIcons name="eco" size={14} color={colors.softGreen} />
          <Text style={[styles.bottomHint, { color: colors.mutedForeground }]}>
            사진을 찍거나 갤러리에서 골라 단어를 배워요
          </Text>
          <MaterialIcons name="eco" size={14} color={colors.softGreen} />
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  container: {
    flex: 1,
    paddingHorizontal: 28,
    justifyContent: "space-between",
  },

  motifRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
  },
  motifIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },

  titleArea: {
    alignItems: "center",
    gap: 14,
  },
  logoCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#4FC3A1",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 10,
  },
  title: {
    fontSize: 28,
    fontFamily: "Baloo2_800ExtraBold",
    textAlign: "center",
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: "Jua_400Regular",
    textAlign: "center",
  },

  actions: { gap: 14 },

  pillPrimary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    borderRadius: 999,
    paddingVertical: 18,
    paddingHorizontal: 32,
    minHeight: 60,
    shadowColor: "#4FC3A1",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  pillPrimaryText: {
    color: "#fff",
    fontSize: 20,
    fontFamily: "Baloo2_700Bold",
  },

  pillSecondary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    borderRadius: 999,
    paddingVertical: 16,
    paddingHorizontal: 32,
    minHeight: 56,
    borderWidth: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  pillSecondaryText: {
    fontSize: 18,
    fontFamily: "Baloo2_700Bold",
  },

  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  bottomHint: {
    fontSize: 13,
    fontFamily: "Jua_400Regular",
    textAlign: "center",
  },
});
