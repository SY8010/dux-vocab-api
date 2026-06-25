import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  LayoutAnimation,
  Platform,
  UIManager,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Speech from "expo-speech";
import { useColors } from "@/hooks/useColors";
import { WordEntry } from "@/context/VocabContext";

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ─── helpers ──────────────────────────────────────────────────────────────────

function speakOne(text: string, onDone?: () => void) {
  Speech.stop();
  Speech.speak(text, {
    language: "en-US",
    pitch: 1.0,
    rate: 0.8,
    onDone,
    onError: onDone,
  });
}

function pause(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── SpeakButton ──────────────────────────────────────────────────────────────

interface SpeakBtnProps {
  text: string;
  size?: number;
  color: string;
  bg?: string;
}

function SpeakBtn({ text, size = 20, color, bg }: SpeakBtnProps) {
  return (
    <TouchableOpacity
      onPress={() => speakOne(text)}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      style={[
        styles.speakBtn,
        bg ? { backgroundColor: bg, borderRadius: 20 } : undefined,
      ]}
      activeOpacity={0.7}
    >
      <MaterialIcons name="volume-up" size={size} color={color} />
    </TouchableOpacity>
  );
}

// ─── WordCard ─────────────────────────────────────────────────────────────────

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
  const [isPlayingAll, setIsPlayingAll] = useState(false);
  const cancelRef = useRef(false);

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

  const cancelEdit = () => setEditing(false);

  const stopAll = () => {
    cancelRef.current = true;
    Speech.stop();
    setIsPlayingAll(false);
  };

  const playAll = async () => {
    if (isPlayingAll) { stopAll(); return; }
    cancelRef.current = false;
    setIsPlayingAll(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const steps = [word.word, word.definition_en, ...word.examples_en];
    for (let i = 0; i < steps.length; i++) {
      if (cancelRef.current) break;
      await new Promise<void>((resolve) => speakOne(steps[i], resolve));
      if (cancelRef.current) break;
      if (i < steps.length - 1) await pause(i === 0 ? 350 : 200);
    }
    if (!cancelRef.current) setIsPlayingAll(false);
  };

  // POS colors in new palette
  const posColors: Record<string, string> = {
    "N.":   "#4FC3A1",
    "v.":   "#7FC4E8",
    "adj.": "#FFCB5B",
    "adv.": "#A9DCC0",
  };
  const posColor = posColors[word.pos] ?? colors.primary;

  const cardBorderColor = isLowConfidence ? colors.warning : colors.border;
  const cardBg = isLowConfidence ? colors.warning + "12" : colors.card;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: cardBg,
          borderColor: cardBorderColor,
          borderRadius: colors.radius,
        },
      ]}
    >
      {/* ── Collapsed header ── */}
      <TouchableOpacity onPress={toggle} activeOpacity={0.85} style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={[styles.posBadge, { backgroundColor: posColor + "22" }]}>
            <Text style={[styles.posText, { color: posColor }]}>{word.pos}</Text>
          </View>

          {editing ? (
            <TextInput
              value={editWord}
              onChangeText={setEditWord}
              style={[
                styles.editInput,
                styles.wordEditInput,
                { color: colors.foreground, borderColor: colors.border, borderRadius: 12 },
              ]}
              autoFocus
            />
          ) : (
            <Text style={[styles.wordText, { color: colors.foreground }]}>{word.word}</Text>
          )}

          {!editing && (
            <SpeakBtn text={word.word} size={20} color={colors.primary} bg={colors.secondary} />
          )}
        </View>

        <View style={styles.headerRight}>
          {editing ? (
            <TextInput
              value={editWordKo}
              onChangeText={setEditWordKo}
              style={[
                styles.editInput,
                styles.koEditInput,
                { color: colors.mutedForeground, borderColor: colors.border, borderRadius: 10 },
              ]}
              placeholder="뜻"
              placeholderTextColor={colors.mutedForeground + "80"}
            />
          ) : (
            <Text style={[styles.koWord, { color: colors.mutedForeground }]}>
              {word.word_ko}
            </Text>
          )}

          {isLowConfidence && !editing && (
            <MaterialIcons name="star" size={16} color={colors.warning} style={{ marginLeft: 4 }} />
          )}
          {!editing && (
            <TouchableOpacity
              onPress={(e) => {
                e.stopPropagation();
                if (!expanded) {
                  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                  setExpanded(true);
                }
                startEdit();
              }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={[styles.editBtn, { backgroundColor: colors.secondary }]}
              activeOpacity={0.7}
            >
              <MaterialIcons name="edit" size={15} color={colors.primary} />
            </TouchableOpacity>
          )}
          <MaterialIcons
            name={expanded ? "expand-less" : "expand-more"}
            size={24}
            color={colors.mutedForeground}
            style={{ marginLeft: 4 }}
          />
        </View>
      </TouchableOpacity>

      {/* ── Expanded body ── */}
      {expanded && (
        <View style={[styles.body, { borderTopColor: cardBorderColor }]}>
          <Text style={[styles.sectionLabel, { color: colors.primary }]}>
            English Definition
          </Text>
          <View style={styles.lineWithPlay}>
            <Text style={[styles.defText, { color: colors.foreground, flex: 1 }]}>
              {word.definition_en}
            </Text>
            <SpeakBtn text={word.definition_en} size={20} color={colors.primary} bg={colors.secondary} />
          </View>

          {word.examples_en.length > 0 && (
            <View style={styles.examplesBlock}>
              {word.examples_en.map((ex, i) => (
                <View key={i} style={styles.exampleRow}>
                  <Text style={[styles.exampleText, { color: colors.mutedForeground, flex: 1 }]}>
                    • {ex}
                  </Text>
                  <SpeakBtn text={ex} size={18} color={colors.mutedForeground} />
                </View>
              ))}
            </View>
          )}

          <View style={[styles.divider, { backgroundColor: cardBorderColor }]} />

          <Text style={[styles.sectionLabel, { color: colors.skyBlue }]}>한국어</Text>

          {editing ? (
            <TextInput
              value={editDefKo}
              onChangeText={setEditDefKo}
              style={[
                styles.editInput,
                styles.defEditInput,
                { color: colors.foreground, borderColor: colors.border, borderRadius: 12 },
              ]}
              multiline
              placeholder="한국어 뜻 입력"
              placeholderTextColor={colors.mutedForeground + "80"}
            />
          ) : (
            <Text style={[styles.defText, { color: colors.foreground }]}>{word.definition_ko}</Text>
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

          {/* Action row */}
          <View style={styles.actionRow}>
            <TouchableOpacity
              onPress={playAll}
              style={[
                styles.listenAllBtn,
                {
                  backgroundColor: isPlayingAll ? colors.accent + "20" : colors.primary + "12",
                  borderColor: isPlayingAll ? colors.accent : colors.primary,
                  borderRadius: 999,
                },
              ]}
              activeOpacity={0.8}
            >
              <MaterialIcons
                name={isPlayingAll ? "stop" : "play-arrow"}
                size={22}
                color={isPlayingAll ? colors.accent : colors.primary}
              />
              <Text style={[styles.listenAllText, { color: isPlayingAll ? colors.accent : colors.primary }]}>
                {isPlayingAll ? "멈추기" : "전체 듣기"}
              </Text>
            </TouchableOpacity>

            {editing ? (
              <>
                <TouchableOpacity
                  onPress={saveEdit}
                  style={[styles.actionBtn, { backgroundColor: colors.success + "20", borderRadius: 999 }]}
                >
                  <MaterialIcons name="check" size={20} color={colors.success} />
                  <Text style={[styles.actionBtnText, { color: colors.success }]}>저장</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={cancelEdit}
                  style={[styles.actionBtn, { backgroundColor: colors.muted, borderRadius: 999 }]}
                >
                  <MaterialIcons name="close" size={20} color={colors.mutedForeground} />
                  <Text style={[styles.actionBtnText, { color: colors.mutedForeground }]}>취소</Text>
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity
                onPress={startEdit}
                style={[styles.actionBtn, { backgroundColor: colors.secondary, borderRadius: 999 }]}
              >
                <MaterialIcons name="edit" size={18} color={colors.primary} />
                <Text style={[styles.actionBtnText, { color: colors.primary }]}>수정</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}
    </View>
  );
}

// ─── styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    borderWidth: 1.5,
    marginBottom: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 3,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", flex: 1, gap: 10 },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 4, maxWidth: 160 },
  posBadge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  posText: { fontSize: 12, fontFamily: "Baloo2_600SemiBold" },
  wordText: { fontSize: 20, fontFamily: "Baloo2_700Bold", flexShrink: 1 },
  koWord: { fontSize: 15, fontFamily: "Jua_400Regular", textAlign: "right", flexShrink: 1 },
  editBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 4,
  },
  body: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderTopWidth: 1,
    paddingTop: 14,
    gap: 8,
  },
  sectionLabel: {
    fontSize: 11,
    fontFamily: "Baloo2_700Bold",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginTop: 4,
  },
  defText: { fontSize: 16, fontFamily: "Baloo2_400Regular", lineHeight: 24 },
  lineWithPlay: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  examplesBlock: { gap: 6, paddingLeft: 4 },
  exampleRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  exampleText: {
    fontSize: 14,
    fontFamily: "Baloo2_400Regular",
    lineHeight: 20,
    fontStyle: "italic",
    flexShrink: 1,
  },
  divider: { height: 1, marginVertical: 6 },
  actionRow: { flexDirection: "row", gap: 8, marginTop: 8, flexWrap: "wrap", alignItems: "center" },
  listenAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1.5,
  },
  listenAllText: { fontSize: 15, fontFamily: "Baloo2_700Bold" },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  actionBtnText: { fontSize: 14, fontFamily: "Baloo2_600SemiBold" },
  speakBtn: { width: 38, height: 38, alignItems: "center", justifyContent: "center" },
  editInput: {
    borderWidth: 1.5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontFamily: "Baloo2_400Regular",
    fontSize: 15,
  },
  wordEditInput: { flex: 1, fontSize: 18 },
  koEditInput: { width: 100, fontSize: 14 },
  defEditInput: { minHeight: 64, textAlignVertical: "top" },
});
