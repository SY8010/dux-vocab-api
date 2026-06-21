import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Animated,
  LayoutAnimation,
  Platform,
  UIManager,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import { WordEntry } from "@/context/VocabContext";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface WordCardProps {
  word: WordEntry;
  onUpdate: (id: string, changes: Partial<WordEntry>) => void;
}

export function WordCard({ word, onUpdate }: WordCardProps) {
  const colors = useColors();
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editWord, setEditWord] = useState(word.word);
  const [editWordKo, setEditWordKo] = useState(word.word_ko);
  const [editDefKo, setEditDefKo] = useState(word.definition_ko);

  const isLowConfidence = word.confidence === "low";

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((e) => !e);
    if (!expanded) Haptics.selectionAsync();
  };

  const startEdit = () => {
    setEditing(true);
    setEditWord(word.word);
    setEditWordKo(word.word_ko);
    setEditDefKo(word.definition_ko);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const saveEdit = () => {
    onUpdate(word.id, {
      word: editWord.trim(),
      word_ko: editWordKo.trim(),
      definition_ko: editDefKo.trim(),
      confidence: "medium",
    });
    setEditing(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const cancelEdit = () => {
    setEditing(false);
  };

  const cardBg = isLowConfidence
    ? colors.warning + "22"
    : colors.card;

  const borderColor = isLowConfidence ? colors.warning : colors.border;

  const posColors: Record<string, string> = {
    "N.": "#3B6FE8",
    "v.": "#22C55E",
    "adj.": "#F59E0B",
    "adv.": "#A855F7",
  };
  const posColor = posColors[word.pos] ?? colors.primary;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: cardBg,
          borderColor,
          borderRadius: colors.radius,
        },
      ]}
    >
      <TouchableOpacity
        onPress={toggle}
        activeOpacity={0.85}
        style={styles.header}
      >
        <View style={styles.headerLeft}>
          <View style={[styles.posBadge, { backgroundColor: posColor + "20" }]}>
            <Text style={[styles.posText, { color: posColor }]}>{word.pos}</Text>
          </View>
          {editing ? (
            <TextInput
              value={editWord}
              onChangeText={setEditWord}
              style={[styles.editInput, styles.wordEditInput, { color: colors.foreground, borderColor: colors.border }]}
              autoFocus
            />
          ) : (
            <Text style={[styles.wordText, { color: colors.foreground }]}>
              {word.word}
            </Text>
          )}
        </View>

        <View style={styles.headerRight}>
          {editing ? (
            <TextInput
              value={editWordKo}
              onChangeText={setEditWordKo}
              style={[styles.editInput, styles.koEditInput, { color: colors.mutedForeground, borderColor: colors.border }]}
              placeholder="뜻"
              placeholderTextColor={colors.mutedForeground + "80"}
            />
          ) : (
            <Text style={[styles.koWord, { color: colors.mutedForeground }]}>
              {word.word_ko}
            </Text>
          )}
          {isLowConfidence && !editing && (
            <Ionicons name="alert-circle" size={18} color={colors.warning} style={{ marginLeft: 4 }} />
          )}
          <Ionicons
            name={expanded ? "chevron-up" : "chevron-down"}
            size={20}
            color={colors.mutedForeground}
            style={{ marginLeft: 6 }}
          />
        </View>
      </TouchableOpacity>

      {expanded && (
        <View style={[styles.body, { borderTopColor: borderColor }]}>
          <Text style={[styles.sectionLabel, { color: colors.primary }]}>
            English Definition
          </Text>
          <Text style={[styles.defText, { color: colors.foreground }]}>
            {word.definition_en}
          </Text>

          {word.examples_en.length > 0 && (
            <View style={styles.examplesBlock}>
              {word.examples_en.map((ex, i) => (
                <Text key={i} style={[styles.exampleText, { color: colors.mutedForeground }]}>
                  • {ex}
                </Text>
              ))}
            </View>
          )}

          <View style={[styles.divider, { backgroundColor: borderColor }]} />

          <Text style={[styles.sectionLabel, { color: colors.accent }]}>
            한국어
          </Text>
          {editing ? (
            <TextInput
              value={editDefKo}
              onChangeText={setEditDefKo}
              style={[styles.editInput, styles.defEditInput, { color: colors.foreground, borderColor: colors.border }]}
              multiline
              placeholder="한국어 뜻 입력"
              placeholderTextColor={colors.mutedForeground + "80"}
            />
          ) : (
            <Text style={[styles.defText, { color: colors.foreground }]}>
              {word.definition_ko}
            </Text>
          )}

          {!editing && word.examples_ko.length > 0 && (
            <View style={styles.examplesBlock}>
              {word.examples_ko.map((ex, i) => (
                <Text key={i} style={[styles.exampleText, { color: colors.mutedForeground }]}>
                  • {ex}
                </Text>
              ))}
            </View>
          )}

          <View style={styles.actionRow}>
            {editing ? (
              <>
                <TouchableOpacity
                  onPress={saveEdit}
                  style={[styles.actionBtn, { backgroundColor: colors.success + "20" }]}
                >
                  <Ionicons name="checkmark" size={18} color={colors.success} />
                  <Text style={[styles.actionBtnText, { color: colors.success }]}>저장</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={cancelEdit}
                  style={[styles.actionBtn, { backgroundColor: colors.muted }]}
                >
                  <Ionicons name="close" size={18} color={colors.mutedForeground} />
                  <Text style={[styles.actionBtnText, { color: colors.mutedForeground }]}>취소</Text>
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity
                onPress={startEdit}
                style={[styles.actionBtn, { backgroundColor: colors.secondary }]}
              >
                <Ionicons name="pencil" size={16} color={colors.primary} />
                <Text style={[styles.actionBtnText, { color: colors.primary }]}>수정</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1.5,
    marginBottom: 10,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 10,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    maxWidth: 160,
  },
  posBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  posText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  wordText: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    flex: 1,
  },
  koWord: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    textAlign: "right",
    flexShrink: 1,
  },
  body: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderTopWidth: 1,
    paddingTop: 12,
    gap: 6,
  },
  sectionLabel: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginTop: 4,
  },
  defText: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    lineHeight: 22,
  },
  examplesBlock: {
    gap: 4,
    paddingLeft: 4,
  },
  exampleText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 19,
    fontStyle: "italic",
  },
  divider: {
    height: 1,
    marginVertical: 8,
  },
  actionRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  actionBtnText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  editInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontFamily: "Inter_400Regular",
    fontSize: 15,
  },
  wordEditInput: {
    flex: 1,
    fontSize: 17,
  },
  koEditInput: {
    width: 100,
    fontSize: 14,
  },
  defEditInput: {
    minHeight: 60,
    textAlignVertical: "top",
  },
});
