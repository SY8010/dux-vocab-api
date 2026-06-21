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
import { Ionicons } from "@expo/vector-icons";
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

// ─── helpers ─────────────────────────────────────────────────────────────────

function speakOne(text: string, onDone?: () => void) {
  Speech.stop();
  Speech.speak(text, {
    language: "en-US",
    rate: 0.9,
    onDone,
    onError: onDone, // keep sequence moving on error
  });
}

function pause(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── SpeakButton ─────────────────────────────────────────────────────────────

interface SpeakBtnProps {
  text: string;
  size?: number;
  color: string;
  bg?: string;
}

function SpeakBtn({ text, size = 22, color, bg }: SpeakBtnProps) {
  return (
    <TouchableOpacity
      onPress={() => speakOne(text)}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      style={[
        styles.speakBtn,
        bg ? { backgroundColor: bg, borderRadius: 10 } : undefined,
      ]}
      activeOpacity={0.7}
    >
      <Ionicons name="volume-high" size={size} color={color} />
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

  // ── expand / collapse ──────────────────────────────────────────────────────
  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((e) => !e);
    if (!expanded) Haptics.selectionAsync();
  };

  // ── edit helpers ──────────────────────────────────────────────────────────
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

  // ── 전체 듣기 (listen all) ─────────────────────────────────────────────────
  const stopAll = () => {
    cancelRef.current = true;
    Speech.stop();
    setIsPlayingAll(false);
  };

  const playAll = async () => {
    if (isPlayingAll) {
      stopAll();
      return;
    }
    cancelRef.current = false;
    setIsPlayingAll(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const steps: string[] = [
      word.word,
      word.definition_en,
      ...word.examples_en,
    ];

    for (let i = 0; i < steps.length; i++) {
      if (cancelRef.current) break;
      await new Promise<void>((resolve) => {
        speakOne(steps[i], resolve);
      });
      if (cancelRef.current) break;
      if (i < steps.length - 1) {
        await pause(i === 0 ? 350 : 200);
      }
    }

    if (!cancelRef.current) setIsPlayingAll(false);
  };

  // ── colors ────────────────────────────────────────────────────────────────
  const cardBg = isLowConfidence ? colors.warning + "22" : colors.card;
  const borderColor = isLowConfidence ? colors.warning : colors.border;

  const posColors: Record<string, string> = {
    "N.": "#3B6FE8",
    "v.": "#22C55E",
    "adj.": "#F59E0B",
    "adv.": "#A855F7",
  };
  const posColor = posColors[word.pos] ?? colors.primary;

  // ─────────────────────────────────────────────────────────────────────────
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
      {/* ── Collapsed header ── */}
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
              style={[
                styles.editInput,
                styles.wordEditInput,
                { color: colors.foreground, borderColor: colors.border },
              ]}
              autoFocus
            />
          ) : (
            <Text style={[styles.wordText, { color: colors.foreground }]}>
              {word.word}
            </Text>
          )}

          {/* 🔊 word-level speak button */}
          {!editing && (
            <SpeakBtn
              text={word.word}
              size={22}
              color={colors.primary}
              bg={colors.secondary}
            />
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
                { color: colors.mutedForeground, borderColor: colors.border },
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
            <Ionicons
              name="alert-circle"
              size={18}
              color={colors.warning}
              style={{ marginLeft: 4 }}
            />
          )}
          {/* Pencil always visible — stops propagation so it doesn't also toggle expand */}
          {!editing && (
            <TouchableOpacity
              onPress={(e) => {
                e.stopPropagation();
                if (!expanded) {
                  LayoutAnimation.configureNext(
                    LayoutAnimation.Presets.easeInEaseOut
                  );
                  setExpanded(true);
                }
                startEdit();
              }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={styles.headerEditBtn}
              activeOpacity={0.7}
            >
              <Ionicons name="pencil" size={16} color={colors.mutedForeground} />
            </TouchableOpacity>
          )}
          <Ionicons
            name={expanded ? "chevron-up" : "chevron-down"}
            size={20}
            color={colors.mutedForeground}
            style={{ marginLeft: 6 }}
          />
        </View>
      </TouchableOpacity>

      {/* ── Expanded body ── */}
      {expanded && (
        <View style={[styles.body, { borderTopColor: borderColor }]}>

          {/* English definition */}
          <Text style={[styles.sectionLabel, { color: colors.primary }]}>
            English Definition
          </Text>
          <View style={styles.lineWithPlay}>
            <Text
              style={[styles.defText, { color: colors.foreground, flex: 1 }]}
            >
              {word.definition_en}
            </Text>
            <SpeakBtn
              text={word.definition_en}
              size={20}
              color={colors.primary}
              bg={colors.secondary}
            />
          </View>

          {/* English examples */}
          {word.examples_en.length > 0 && (
            <View style={styles.examplesBlock}>
              {word.examples_en.map((ex, i) => (
                <View key={i} style={styles.exampleRow}>
                  <Text
                    style={[
                      styles.exampleText,
                      { color: colors.mutedForeground, flex: 1 },
                    ]}
                  >
                    • {ex}
                  </Text>
                  <SpeakBtn
                    text={ex}
                    size={18}
                    color={colors.mutedForeground}
                  />
                </View>
              ))}
            </View>
          )}

          <View style={[styles.divider, { backgroundColor: borderColor }]} />

          {/* Korean section */}
          <Text style={[styles.sectionLabel, { color: colors.accent }]}>
            한국어
          </Text>
          {editing ? (
            <TextInput
              value={editDefKo}
              onChangeText={setEditDefKo}
              style={[
                styles.editInput,
                styles.defEditInput,
                { color: colors.foreground, borderColor: colors.border },
              ]}
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
                <Text
                  key={i}
                  style={[styles.exampleText, { color: colors.mutedForeground }]}
                >
                  • {ex}
                </Text>
              ))}
            </View>
          )}

          {/* ── Action row ── */}
          <View style={styles.actionRow}>
            {/* 전체 듣기 */}
            <TouchableOpacity
              onPress={playAll}
              style={[
                styles.listenAllBtn,
                {
                  backgroundColor: isPlayingAll
                    ? colors.accent + "20"
                    : colors.primary + "15",
                  borderRadius: 12,
                  borderColor: isPlayingAll ? colors.accent : colors.primary,
                },
              ]}
              activeOpacity={0.8}
            >
              <Ionicons
                name={isPlayingAll ? "stop-circle" : "play-circle"}
                size={22}
                color={isPlayingAll ? colors.accent : colors.primary}
              />
              <Text
                style={[
                  styles.listenAllText,
                  { color: isPlayingAll ? colors.accent : colors.primary },
                ]}
              >
                {isPlayingAll ? "멈추기" : "전체 듣기"}
              </Text>
            </TouchableOpacity>

            {/* Edit / Save / Cancel */}
            {editing ? (
              <>
                <TouchableOpacity
                  onPress={saveEdit}
                  style={[
                    styles.actionBtn,
                    { backgroundColor: colors.success + "20" },
                  ]}
                >
                  <Ionicons name="checkmark" size={18} color={colors.success} />
                  <Text
                    style={[styles.actionBtnText, { color: colors.success }]}
                  >
                    저장
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={cancelEdit}
                  style={[
                    styles.actionBtn,
                    { backgroundColor: colors.muted },
                  ]}
                >
                  <Ionicons
                    name="close"
                    size={18}
                    color={colors.mutedForeground}
                  />
                  <Text
                    style={[
                      styles.actionBtnText,
                      { color: colors.mutedForeground },
                    ]}
                  >
                    취소
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity
                onPress={startEdit}
                style={[
                  styles.actionBtn,
                  { backgroundColor: colors.secondary },
                ]}
              >
                <Ionicons name="pencil" size={16} color={colors.primary} />
                <Text
                  style={[styles.actionBtnText, { color: colors.primary }]}
                >
                  수정
                </Text>
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
    marginBottom: 10,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 8,
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
    flexShrink: 1,
  },
  koWord: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    textAlign: "right",
    flexShrink: 1,
  },
  // ── Expanded body ──
  body: {
    paddingHorizontal: 14,
    paddingBottom: 14,
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
  lineWithPlay: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  examplesBlock: {
    gap: 6,
    paddingLeft: 4,
  },
  exampleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  exampleText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 19,
    fontStyle: "italic",
    flexShrink: 1,
  },
  divider: {
    height: 1,
    marginVertical: 6,
  },
  // ── Action row ──
  actionRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
    flexWrap: "wrap",
    alignItems: "center",
  },
  listenAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1.5,
  },
  listenAllText: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  actionBtnText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  // ── Speak button ──
  speakBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  // ── Header edit button ──
  headerEditBtn: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 4,
  },
  // ── Edit inputs ──
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
