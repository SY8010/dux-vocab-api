import React from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import { useVocab, WordSet } from "@/context/VocabContext";

export default function SavedScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { savedSets, deleteSet, loadSet } = useVocab();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const handleOpen = (set: WordSet) => {
    loadSet(set);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push("/words");
  };

  const handleDelete = (set: WordSet) => {
    Alert.alert("단어장 삭제", `"${set.name}"을 삭제할까요?`, [
      { text: "취소", style: "cancel" },
      {
        text: "삭제",
        style: "destructive",
        onPress: async () => {
          await deleteSet(set.id);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        },
      },
    ]);
  };

  const formatDate = (ts: number) =>
    new Date(ts).toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

  return (
    <LinearGradient
      colors={[colors.gradientTop, colors.gradientBottom]}
      style={styles.gradient}
    >
      <View style={[styles.header, { paddingTop: topPad + 8 }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.iconBtn, { backgroundColor: colors.card }]}
        >
          <MaterialIcons name="arrow-back" size={22} color={colors.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>
          저장된 단어장
        </Text>
        <View style={{ width: 44 }} />
      </View>

      {savedSets.length === 0 ? (
        <View style={styles.empty}>
          <View style={[styles.emptyIconWrap, { backgroundColor: colors.primary + "18" }]}>
            <MaterialIcons name="folder-open" size={60} color={colors.primary} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
            저장된 단어장이 없어요
          </Text>
          <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
            단어장을 촬영하고 저장해보세요!
          </Text>
          <TouchableOpacity
            onPress={() => router.replace("/camera")}
            style={[styles.emptyPill, { backgroundColor: colors.primary }]}
          >
            <MaterialIcons name="photo-camera" size={22} color="#fff" />
            <Text style={styles.emptyPillText}>촬영 시작</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={savedSets}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.list, { paddingBottom: botPad + 24 }]}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => handleOpen(item)}
              activeOpacity={0.85}
              style={[
                styles.setCard,
                {
                  backgroundColor: colors.card,
                  borderRadius: colors.radius,
                },
              ]}
            >
              <View style={[styles.folderIcon, { backgroundColor: colors.primary + "18" }]}>
                <MaterialIcons name="folder" size={30} color={colors.primary} />
              </View>

              <View style={styles.setInfo}>
                <Text style={[styles.setName, { color: colors.foreground }]} numberOfLines={1}>
                  {item.name}
                </Text>
                <View style={styles.setMeta}>
                  <MaterialIcons name="auto-stories" size={13} color={colors.mutedForeground} />
                  <Text style={[styles.setMetaText, { color: colors.mutedForeground }]}>
                    {item.words.length}개 단어
                  </Text>
                  <Text style={[styles.dot, { color: colors.border }]}>•</Text>
                  <Text style={[styles.setMetaText, { color: colors.mutedForeground }]}>
                    {formatDate(item.createdAt)}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                onPress={() => handleDelete(item)}
                style={[styles.deleteBtn, { backgroundColor: colors.destructive + "12" }]}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <MaterialIcons name="delete-outline" size={22} color={colors.destructive} />
              </TouchableOpacity>
            </TouchableOpacity>
          )}
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
  list: { padding: 16, gap: 12 },
  setCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 18,
    gap: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 3,
  },
  folderIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  setInfo: { flex: 1, gap: 4 },
  setName: { fontSize: 18, fontFamily: "Baloo2_700Bold" },
  setMeta: { flexDirection: "row", alignItems: "center", gap: 5 },
  setMetaText: { fontSize: 13, fontFamily: "Jua_400Regular" },
  dot: { fontSize: 12 },
  deleteBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    paddingHorizontal: 32,
  },
  emptyIconWrap: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: { fontSize: 22, fontFamily: "Baloo2_700Bold", textAlign: "center" },
  emptySub: { fontSize: 16, fontFamily: "Jua_400Regular", textAlign: "center", lineHeight: 24 },
  emptyPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 999,
    paddingVertical: 16,
    paddingHorizontal: 28,
    minHeight: 56,
    marginTop: 8,
    shadowColor: "#4FC3A1",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  emptyPillText: { color: "#fff", fontSize: 18, fontFamily: "Baloo2_700Bold" },
});
