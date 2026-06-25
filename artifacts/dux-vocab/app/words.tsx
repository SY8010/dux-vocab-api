import React, { useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
  ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import { useVocab } from "@/context/VocabContext";
import { WordCard } from "@/components/WordCard";

export default function WordsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { currentWords, updateWord, saveCurrentSet } = useVocab();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const lowCount = currentWords.filter((w) => w.confidence === "low").length;

  const handleSave = async () => {
    if (saved || saving) return;
    setSaving(true);
    try {
      await saveCurrentSet();
      setSaved(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Alert.alert("오류", "저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const renderHeader = () => (
    <View style={styles.listHeader}>
      <View
        style={[
          styles.statsCard,
          { backgroundColor: colors.card, borderRadius: colors.radius },
        ]}
      >
        <View style={styles.stat}>
          <Text style={[styles.statNum, { color: colors.primary }]}>
            {currentWords.length}
          </Text>
          <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
            총 단어
          </Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
        <View style={styles.stat}>
          <Text
            style={[
              styles.statNum,
              { color: lowCount > 0 ? colors.warning : colors.success },
            ]}
          >
            {lowCount}
          </Text>
          <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
            확인 필요
          </Text>
        </View>
      </View>

      {lowCount > 0 && (
        <View
          style={[
            styles.warningBanner,
            {
              backgroundColor: colors.warning + "22",
              borderColor: colors.warning,
              borderRadius: 16,
            },
          ]}
        >
          <MaterialIcons name="star" size={18} color={colors.warning} />
          <Text style={[styles.warningText, { color: colors.warningForeground }]}>
            {lowCount}개의 단어를 확인해주세요!
          </Text>
        </View>
      )}
    </View>
  );

  return (
    <LinearGradient
      colors={[colors.gradientTop, colors.gradientBottom]}
      style={styles.gradient}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 8 }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.iconBtn, { backgroundColor: colors.card }]}
        >
          <MaterialIcons name="arrow-back" size={22} color={colors.primary} />
        </TouchableOpacity>

        <Text style={[styles.headerTitle, { color: colors.foreground }]}>
          단어 목록
        </Text>

        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              router.push("/test");
            }}
            disabled={currentWords.length < 3}
            style={[
              styles.headerPill,
              {
                backgroundColor: colors.secondary,
                borderColor: colors.primary,
                opacity: currentWords.length < 3 ? 0.4 : 1,
              },
            ]}
          >
            <MaterialIcons name="school" size={18} color={colors.primary} />
            <Text style={[styles.headerPillText, { color: colors.primary }]}>퀴즈</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleSave}
            disabled={saving || saved || currentWords.length === 0}
            style={[
              styles.headerPill,
              {
                backgroundColor: saved ? colors.success + "20" : colors.primary,
                borderColor: saved ? colors.success : colors.primary,
                opacity: saving || currentWords.length === 0 ? 0.5 : 1,
              },
            ]}
          >
            {saving ? (
              <ActivityIndicator color={colors.primaryForeground} size="small" />
            ) : saved ? (
              <MaterialIcons name="check" size={18} color={colors.success} />
            ) : (
              <>
                <MaterialIcons name="bookmark" size={18} color="#fff" />
                <Text style={[styles.headerPillText, { color: "#fff" }]}>저장</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {currentWords.length === 0 ? (
        <View style={styles.empty}>
          <MaterialIcons name="auto-stories" size={72} color={colors.primary + "60"} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
            단어가 없어요
          </Text>
          <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
            카메라로 단어장을 촬영해보세요
          </Text>
          <TouchableOpacity
            onPress={() => router.replace("/camera")}
            style={[styles.emptyPill, { backgroundColor: colors.primary }]}
          >
            <MaterialIcons name="photo-camera" size={22} color="#fff" />
            <Text style={styles.emptyPillText}>촬영하러 가기</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={currentWords}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <WordCard word={item} onUpdate={updateWord} />
          )}
          ListHeaderComponent={renderHeader}
          contentContainerStyle={[
            styles.list,
            { paddingBottom: botPad + 24 },
          ]}
          showsVerticalScrollIndicator={false}
        />
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: "Baloo2_700Bold",
    flex: 1,
    textAlign: "center",
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  headerActions: { flexDirection: "row", gap: 8 },
  headerPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1.5,
    minHeight: 42,
  },
  headerPillText: {
    fontSize: 15,
    fontFamily: "Baloo2_700Bold",
  },
  list: { paddingHorizontal: 16, paddingTop: 12 },
  listHeader: { gap: 12, marginBottom: 12 },
  statsCard: {
    flexDirection: "row",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  stat: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 16,
    gap: 2,
  },
  statNum: { fontSize: 30, fontFamily: "Baloo2_800ExtraBold" },
  statLabel: { fontSize: 13, fontFamily: "Jua_400Regular" },
  statDivider: { width: 1 },
  warningBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 14,
    borderWidth: 1.5,
  },
  warningText: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Jua_400Regular",
    lineHeight: 20,
  },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
    paddingHorizontal: 32,
  },
  emptyTitle: { fontSize: 24, fontFamily: "Baloo2_700Bold" },
  emptySub: { fontSize: 16, fontFamily: "Jua_400Regular", textAlign: "center" },
  emptyPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 999,
    paddingVertical: 16,
    paddingHorizontal: 28,
    minHeight: 56,
    marginTop: 8,
  },
  emptyPillText: { color: "#fff", fontSize: 18, fontFamily: "Baloo2_700Bold" },
});
