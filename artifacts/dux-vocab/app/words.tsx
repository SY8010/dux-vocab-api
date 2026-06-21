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
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import { useVocab, WordEntry } from "@/context/VocabContext";
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
          styles.statsRow,
          { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius },
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
              borderRadius: colors.radius,
            },
          ]}
        >
          <MaterialIcons name="error" size={18} color={colors.warning} />
          <Text style={[styles.warningText, { color: colors.warningForeground }]}>
            {lowCount}개의 단어는 확인이 필요합니다. 노란색 카드를 탭하여 수정하세요.
          </Text>
        </View>
      )}
    </View>
  );

  return (
    <View
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      {/* Header */}
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
          <MaterialIcons name="arrow-back" size={22} color={colors.primary} />
        </TouchableOpacity>

        <Text style={[styles.headerTitle, { color: colors.foreground }]}>
          단어 목록
        </Text>

        <TouchableOpacity
          onPress={handleSave}
          disabled={saving || saved || currentWords.length === 0}
          style={[
            styles.headerBtn,
            styles.saveBtn,
            {
              backgroundColor: saved ? colors.success + "20" : colors.primary,
              opacity: saving || currentWords.length === 0 ? 0.5 : 1,
            },
          ]}
        >
          {saving ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : saved ? (
            <MaterialIcons name="check" size={20} color={colors.success} />
          ) : (
            <>
              <MaterialIcons name="bookmark" size={18} color="#fff" />
              <Text style={styles.saveBtnText}>저장</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {currentWords.length === 0 ? (
        <View style={styles.empty}>
          <MaterialIcons name="description" size={64} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
            단어가 없습니다
          </Text>
          <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
            카메라로 단어장을 촬영해주세요
          </Text>
          <TouchableOpacity
            onPress={() => router.replace("/camera")}
            style={[styles.emptyBtn, { backgroundColor: colors.primary, borderRadius: colors.radius }]}
          >
            <MaterialIcons name="photo-camera" size={20} color="#fff" />
            <Text style={styles.emptyBtnText}>촬영하러 가기</Text>
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
          scrollEnabled={!!currentWords.length}
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
    gap: 12,
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
  saveBtn: {
    width: "auto",
    paddingHorizontal: 14,
    flexDirection: "row",
    gap: 5,
  },
  saveBtnText: {
    color: "#fff",
    fontFamily: "Inter_700Bold",
    fontSize: 15,
  },
  list: { paddingHorizontal: 16, paddingTop: 16 },
  listHeader: { gap: 12, marginBottom: 12 },
  statsRow: {
    flexDirection: "row",
    borderWidth: 1,
    overflow: "hidden",
  },
  stat: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 14,
    gap: 2,
  },
  statNum: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
  },
  statLabel: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  statDivider: { width: 1 },
  warningBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 12,
    borderWidth: 1,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 19,
  },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
  },
  emptySub: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
  emptyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 14,
    marginTop: 8,
  },
  emptyBtnText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
});
