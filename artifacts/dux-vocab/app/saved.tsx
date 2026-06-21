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
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
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
    Alert.alert(
      "단어장 삭제",
      `"${set.name}"을 삭제하시겠습니까?`,
      [
        { text: "취소", style: "cancel" },
        {
          text: "삭제",
          style: "destructive",
          onPress: async () => {
            await deleteSet(set.id);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          },
        },
      ]
    );
  };

  const formatDate = (ts: number) => {
    return new Date(ts).toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          {
            paddingTop: topPad + 8,
            backgroundColor: colors.background,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.headerBtn, { backgroundColor: colors.secondary }]}
        >
          <Ionicons name="arrow-back" size={22} color={colors.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>
          저장된 단어장
        </Text>
        <View style={{ width: 40 }} />
      </View>

      {savedSets.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="folder-open-outline" size={72} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
            저장된 단어장이 없습니다
          </Text>
          <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
            단어장을 촬영하고 저장해보세요
          </Text>
          <TouchableOpacity
            onPress={() => router.replace("/camera")}
            style={[
              styles.emptyBtn,
              { backgroundColor: colors.primary, borderRadius: colors.radius },
            ]}
          >
            <Ionicons name="camera" size={20} color="#fff" />
            <Text style={styles.emptyBtnText}>촬영 시작</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={savedSets}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.list,
            { paddingBottom: botPad + 24 },
          ]}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => handleOpen(item)}
              activeOpacity={0.85}
              style={[
                styles.setCard,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  borderRadius: colors.radius,
                },
              ]}
            >
              <View style={[styles.setIconWrap, { backgroundColor: colors.secondary }]}>
                <Ionicons name="folder" size={26} color={colors.primary} />
              </View>

              <View style={styles.setInfo}>
                <Text
                  style={[styles.setName, { color: colors.foreground }]}
                  numberOfLines={1}
                >
                  {item.name}
                </Text>
                <View style={styles.setMeta}>
                  <Ionicons
                    name="document-text-outline"
                    size={13}
                    color={colors.mutedForeground}
                  />
                  <Text style={[styles.setMetaText, { color: colors.mutedForeground }]}>
                    {item.words.length}개 단어
                  </Text>
                  <Text style={[styles.setMetaDot, { color: colors.mutedForeground }]}>
                    •
                  </Text>
                  <Text style={[styles.setMetaText, { color: colors.mutedForeground }]}>
                    {formatDate(item.createdAt)}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                onPress={() => handleDelete(item)}
                style={[styles.deleteBtn, { backgroundColor: colors.destructive + "15" }]}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="trash-outline" size={20} color={colors.destructive} />
              </TouchableOpacity>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    flex: 1,
    textAlign: "center",
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  list: { padding: 16, gap: 12 },
  setCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderWidth: 1.5,
    gap: 14,
  },
  setIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  setInfo: { flex: 1, gap: 4 },
  setName: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
  },
  setMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  setMetaText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  setMetaDot: {
    fontSize: 12,
    marginHorizontal: 2,
  },
  deleteBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
  },
  emptySub: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 22,
  },
  emptyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 28,
    paddingVertical: 14,
    marginTop: 8,
  },
  emptyBtnText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
});
