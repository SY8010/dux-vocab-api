import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Animated,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as Speech from "expo-speech";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { useVocab, WordEntry } from "@/context/VocabContext";
import { useColors } from "@/hooks/useColors";

// ─── constants ────────────────────────────────────────────────────────────────

const SESSION_MIN = 5;
const SESSION_MAX = 7;

const PRAISE = [
  "정답! 멋져요!",
  "완벽해요!",
  "최고예요!",
  "훌륭해요!",
  "잘했어요!",
  "대단해요!",
];

// ─── utilities ────────────────────────────────────────────────────────────────

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_x, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildHint(word: string, level: 1 | 2): string {
  return Array.from(word)
    .map((c, i) => {
      if (c === " ") return "   ";
      if (level === 1) return "_";
      return i === 0 ? c.toUpperCase() : "_";
    })
    .join(" ");
}

type Phase = "question" | "retry" | "correct" | "wrong" | "summary";

// ─── component ────────────────────────────────────────────────────────────────

export default function TestScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { currentWords } = useVocab();

  const [sessionWords, setSessionWords] = useState<WordEntry[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("question");
  const [userInput, setUserInput] = useState("");
  const [hintLevel, setHintLevel] = useState<0 | 1 | 2>(0);
  const [hasRetried, setHasRetried] = useState(false);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  const [missedWords, setMissedWords] = useState<WordEntry[]>([]);
  const [praiseMsg, setPraiseMsg] = useState("");

  const inputRef = useRef<TextInput>(null);
  const starScale = useRef(new Animated.Value(0)).current;
  const starOpacity = useRef(new Animated.Value(0)).current;
  const shakeX = useRef(new Animated.Value(0)).current;

  // ── animations ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase === "correct") {
      starScale.setValue(0);
      starOpacity.setValue(0);
      Animated.parallel([
        Animated.spring(starScale, {
          toValue: 1,
          friction: 3,
          tension: 200,
          useNativeDriver: true,
        }),
        Animated.timing(starOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
    if (phase === "wrong") {
      shakeX.setValue(0);
      Animated.sequence([
        Animated.timing(shakeX, { toValue: 14, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeX, { toValue: -14, duration: 80, useNativeDriver: true }),
        Animated.timing(shakeX, { toValue: 10, duration: 70, useNativeDriver: true }),
        Animated.timing(shakeX, { toValue: -8, duration: 70, useNativeDriver: true }),
        Animated.timing(shakeX, { toValue: 0, duration: 50, useNativeDriver: true }),
      ]).start();
    }
  }, [phase]);

  // ── session init ────────────────────────────────────────────────────────────
  const startSession = useCallback((words: WordEntry[]) => {
    const count = Math.min(
      words.length,
      SESSION_MIN + Math.floor(Math.random() * (SESSION_MAX - SESSION_MIN + 1))
    );
    const picked = shuffle(words).slice(0, count);
    setSessionWords(picked);
    setCurrentIndex(0);
    setPhase("question");
    setUserInput("");
    setHintLevel(0);
    setHasRetried(false);
    setScore(0);
    setStreak(0);
    setMaxStreak(0);
    setMissedWords([]);
  }, []);

  useEffect(() => {
    if (currentWords.length > 0) startSession(currentWords);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── auto TTS ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase === "question" && sessionWords.length > 0 && currentIndex < sessionWords.length) {
      const word = sessionWords[currentIndex];
      const timer = setTimeout(() => {
        Speech.stop();
        Speech.speak(word.definition_en, { language: "en-US", pitch: 1.0, rate: 0.8 });
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [currentIndex, phase, sessionWords]);

  const currentWord = sessionWords[currentIndex] ?? null;
  const totalWords = sessionWords.length;

  const replay = () => {
    if (!currentWord) return;
    Speech.stop();
    Speech.speak(currentWord.definition_en, { language: "en-US", pitch: 1.0, rate: 0.8 });
  };

  const showHint = () => {
    if (hintLevel >= 2) return;
    setHintLevel((h) => (h + 1) as 0 | 1 | 2);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const submit = () => {
    if (!currentWord || !userInput.trim()) return;
    const answer = userInput.trim().toLowerCase();
    const target = currentWord.word.trim().toLowerCase();

    if (answer === target) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const newStreak = streak + 1;
      setScore((s) => s + 1);
      setStreak(newStreak);
      setMaxStreak((ms) => Math.max(ms, newStreak));
      setPraiseMsg(PRAISE[Math.floor(Math.random() * PRAISE.length)]);
      setPhase("correct");
      Speech.stop();
    } else if (!hasRetried && levenshtein(answer, target) <= 1) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setHasRetried(true);
      setUserInput("");
      setPhase("retry");
      Speech.stop();
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setStreak(0);
      setMissedWords((prev) => [...prev, currentWord]);
      setPhase("wrong");
      Speech.stop();
    }
  };

  const advance = () => {
    const next = currentIndex + 1;
    if (next >= totalWords) {
      setPhase("summary");
      Speech.stop();
    } else {
      setCurrentIndex(next);
      setPhase("question");
      setUserInput("");
      setHintLevel(0);
      setHasRetried(false);
      setTimeout(() => inputRef.current?.focus(), 350);
    }
  };

  // ── guards ──────────────────────────────────────────────────────────────────
  if (currentWords.length === 0) {
    return (
      <LinearGradient colors={[colors.gradientTop, colors.gradientBottom]} style={styles.gradient}>
        <View style={[styles.centered, { paddingTop: insets.top }]}>
          <MaterialIcons name="school" size={72} color={colors.primary + "80"} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>단어가 없어요</Text>
          <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
            먼저 단어장을 불러오세요
          </Text>
          <TouchableOpacity
            onPress={() => router.back()}
            style={[styles.pill, { backgroundColor: colors.primary }]}
          >
            <Text style={styles.pillText}>돌아가기</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    );
  }

  if (sessionWords.length === 0) {
    return (
      <LinearGradient colors={[colors.gradientTop, colors.gradientBottom]} style={styles.gradient}>
        <View style={styles.centered}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      </LinearGradient>
    );
  }

  // ── SUMMARY ──────────────────────────────────────────────────────────────────
  if (phase === "summary") {
    const isGood = totalWords > 0 && score / totalWords >= 0.8;
    return (
      <LinearGradient colors={[colors.gradientTop, colors.gradientBottom]} style={styles.gradient}>
        <ScrollView
          contentContainerStyle={[
            styles.summaryScroll,
            { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 40 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.summaryIconWrap, { backgroundColor: isGood ? colors.sunshine + "30" : colors.primary + "20" }]}>
            <MaterialIcons
              name={isGood ? "emoji-events" : "school"}
              size={70}
              color={isGood ? colors.sunshine : colors.primary}
            />
          </View>

          <Text style={[styles.summaryTitle, { color: colors.foreground }]}>
            퀴즈 완료!
          </Text>
          <Text style={[styles.summaryScore, { color: colors.primary }]}>
            {totalWords}개 중 {score}개 정답
          </Text>

          {maxStreak > 1 && (
            <View style={[styles.streakRow, { backgroundColor: colors.sunshine + "28", borderRadius: 999 }]}>
              <MaterialIcons name="local-fire-department" size={20} color={colors.sunshine} />
              <Text style={[styles.streakLabel, { color: colors.warningForeground }]}>
                최고 연속 정답 {maxStreak}개
              </Text>
            </View>
          )}

          {missedWords.length > 0 && (
            <View style={[styles.missedBox, { backgroundColor: colors.card, borderRadius: colors.radius }]}>
              <Text style={[styles.missedLabel, { color: colors.mutedForeground }]}>
                틀린 단어
              </Text>
              {missedWords.map((w) => (
                <View key={w.id} style={styles.missedRow}>
                  <MaterialIcons name="eco" size={14} color={colors.softGreen} />
                  <Text style={[styles.missedWord, { color: colors.foreground }]}>
                    {w.word}
                  </Text>
                  <Text style={[styles.missedKo, { color: colors.mutedForeground }]}>
                    {w.word_ko}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {missedWords.length > 0 && (
            <TouchableOpacity
              onPress={() => startSession(missedWords)}
              style={[styles.pill, { backgroundColor: colors.primary }]}
            >
              <MaterialIcons name="refresh" size={22} color="#fff" />
              <Text style={styles.pillText}>틀린 단어 다시</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            onPress={() => { Speech.stop(); router.back(); }}
            style={[styles.pillOutline, { borderColor: colors.primary }]}
          >
            <MaterialIcons name="arrow-back" size={22} color={colors.primary} />
            <Text style={[styles.pillOutlineText, { color: colors.primary }]}>단어 목록으로</Text>
          </TouchableOpacity>
        </ScrollView>
      </LinearGradient>
    );
  }

  // ── QUESTION / RETRY / CORRECT / WRONG ───────────────────────────────────────
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  return (
    <LinearGradient colors={[colors.gradientTop, colors.gradientBottom]} style={styles.gradient}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        {/* ── Header ── */}
        <View style={[styles.header, { paddingTop: topPad + 8 }]}>
          <TouchableOpacity
            onPress={() => { Speech.stop(); router.back(); }}
            style={[styles.iconBtn, { backgroundColor: colors.card }]}
          >
            <MaterialIcons name="close" size={22} color={colors.primary} />
          </TouchableOpacity>

          <View style={styles.progressWrap}>
            <View style={styles.progressTopRow}>
              <Text style={[styles.progressLabel, { color: colors.mutedForeground }]}>진행</Text>
              <Text style={[styles.progressNum, { color: colors.foreground }]}>
                {currentIndex + 1} / {totalWords}
              </Text>
            </View>
            <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
              <View
                style={[
                  styles.progressFill,
                  {
                    backgroundColor: colors.primary,
                    width: `${((currentIndex + 1) / totalWords) * 100}%` as any,
                  },
                ]}
              />
            </View>
          </View>

          <View style={[styles.streakBadge, { backgroundColor: streak > 0 ? colors.sunshine + "28" : colors.card }]}>
            <MaterialIcons
              name="local-fire-department"
              size={20}
              color={streak > 0 ? colors.sunshine : colors.border}
            />
            <Text style={[styles.streakNum, { color: streak > 0 ? colors.warningForeground : colors.mutedForeground }]}>
              {streak}
            </Text>
          </View>
        </View>

        {/* ── Body ── */}
        <ScrollView
          contentContainerStyle={[styles.body, { paddingBottom: botPad + 24 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Score chip */}
          <View style={styles.scoreRow}>
            <View style={[styles.scoreChip, { backgroundColor: colors.primary + "18" }]}>
              <MaterialIcons name="star" size={16} color={colors.sunshine} />
              <Text style={[styles.scoreText, { color: colors.primary }]}>점수 {score}</Text>
            </View>
          </View>

          {/* Definition card */}
          <View style={[styles.defCard, { backgroundColor: colors.card, borderRadius: colors.radius }]}>
            <Text style={[styles.defPrompt, { color: colors.mutedForeground }]}>
              뜻을 보고 영어 단어를 입력하세요
            </Text>
            <Text style={[styles.defText, { color: colors.foreground }]}>
              {currentWord?.definition_en}
            </Text>
            <View style={styles.defFooter}>
              <View style={[styles.posBadge, { backgroundColor: colors.primary + "18" }]}>
                <Text style={[styles.posText, { color: colors.primary }]}>{currentWord?.pos}</Text>
              </View>
              <TouchableOpacity
                onPress={replay}
                style={[styles.replayPill, { backgroundColor: colors.secondary }]}
                activeOpacity={0.75}
              >
                <MaterialIcons name="volume-up" size={20} color={colors.primary} />
                <Text style={[styles.replayText, { color: colors.primary }]}>다시 듣기</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Hint box */}
          {hintLevel > 0 && currentWord && (
            <View style={[styles.hintBox, { backgroundColor: colors.sunshine + "20", borderColor: colors.sunshine, borderRadius: 16 }]}>
              <View style={styles.hintHeader}>
                <MaterialIcons name="lightbulb" size={18} color={colors.sunshine} />
                <Text style={[styles.hintLabel, { color: colors.warningForeground }]}>
                  힌트{hintLevel === 1 ? ` — ${currentWord.word.length}글자` : " — 첫 글자 공개"}
                </Text>
              </View>
              <Text style={[styles.hintChars, { color: colors.foreground }]} numberOfLines={2}>
                {buildHint(currentWord.word, hintLevel as 1 | 2)}
              </Text>
            </View>
          )}

          {/* Retry banner */}
          {phase === "retry" && (
            <View style={[styles.banner, { backgroundColor: colors.sunshine + "28", borderColor: colors.sunshine, borderRadius: 20 }]}>
              <MaterialIcons name="mood" size={30} color={colors.sunshine} />
              <Text style={[styles.bannerText, { color: colors.warningForeground }]}>
                아깝다! 한 글자 차이예요.{"\n"}한 번 더!
              </Text>
            </View>
          )}

          {/* Correct banner + star sparkle */}
          {phase === "correct" && (
            <View style={[styles.banner, { backgroundColor: colors.success + "20", borderColor: colors.success, borderRadius: 20 }]}>
              <Animated.View style={{ transform: [{ scale: starScale }], opacity: starOpacity }}>
                <MaterialIcons name="star" size={36} color={colors.sunshine} />
              </Animated.View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.bannerText, { color: colors.success }]}>{praiseMsg}</Text>
                <Text style={[styles.bannerAnswer, { color: colors.foreground }]}>
                  {currentWord?.word}
                </Text>
              </View>
            </View>
          )}

          {/* Wrong banner — soft shake, no harsh red */}
          {phase === "wrong" && (
            <Animated.View style={{ transform: [{ translateX: shakeX }] }}>
              <View style={[styles.banner, { backgroundColor: colors.destructive + "15", borderColor: colors.destructive + "60", borderRadius: 20 }]}>
                <MaterialIcons name="sentiment-dissatisfied" size={30} color={colors.destructive} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.bannerText, { color: colors.destructive }]}>정답은:</Text>
                  <Text style={[styles.bannerAnswer, { color: colors.foreground }]}>
                    {currentWord?.word}
                  </Text>
                </View>
              </View>
            </Animated.View>
          )}

          {/* Input + actions */}
          {(phase === "question" || phase === "retry") && (
            <>
              <TextInput
                ref={inputRef}
                value={userInput}
                onChangeText={setUserInput}
                placeholder="영어 단어를 입력하세요"
                placeholderTextColor={colors.mutedForeground + "70"}
                style={[
                  styles.input,
                  {
                    color: colors.foreground,
                    borderColor: phase === "retry" ? colors.sunshine : colors.border,
                    backgroundColor: colors.card,
                    borderRadius: 20,
                  },
                ]}
                autoCapitalize="none"
                autoCorrect={false}
                spellCheck={false}
                returnKeyType="done"
                onSubmitEditing={submit}
              />

              <View style={styles.actionRow}>
                <TouchableOpacity
                  onPress={showHint}
                  disabled={hintLevel >= 2}
                  style={[
                    styles.hintPill,
                    { backgroundColor: colors.card, borderColor: colors.sunshine, opacity: hintLevel >= 2 ? 0.4 : 1 },
                  ]}
                  activeOpacity={0.8}
                >
                  <MaterialIcons name="lightbulb" size={20} color={colors.sunshine} />
                  <Text style={[styles.hintPillText, { color: colors.warningForeground }]}>
                    힌트{hintLevel > 0 ? ` (${hintLevel}/2)` : ""}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={submit}
                  disabled={!userInput.trim()}
                  style={[
                    styles.submitPill,
                    { backgroundColor: userInput.trim() ? colors.primary : colors.border },
                  ]}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.submitPillText, { color: userInput.trim() ? "#fff" : colors.mutedForeground }]}>
                    제출
                  </Text>
                  <MaterialIcons name="send" size={20} color={userInput.trim() ? "#fff" : colors.mutedForeground} />
                </TouchableOpacity>
              </View>
            </>
          )}

          {/* Next / Finish */}
          {(phase === "correct" || phase === "wrong") && (
            <TouchableOpacity
              onPress={advance}
              style={[
                styles.pill,
                {
                  backgroundColor: phase === "correct" ? colors.success : colors.primary,
                },
              ]}
              activeOpacity={0.85}
            >
              <Text style={styles.pillText}>
                {currentIndex + 1 >= totalWords ? "결과 보기" : "다음 단어"}
              </Text>
              <MaterialIcons
                name={currentIndex + 1 >= totalWords ? "flag" : "arrow-forward"}
                size={24}
                color="#fff"
              />
            </TouchableOpacity>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

// ─── styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  flex: { flex: 1 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 24, fontFamily: "Baloo2_700Bold", textAlign: "center" },
  emptySub: { fontSize: 16, fontFamily: "Jua_400Regular", textAlign: "center" },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 10,
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
  progressWrap: { flex: 1, gap: 6 },
  progressTopRow: { flexDirection: "row", justifyContent: "space-between" },
  progressLabel: { fontSize: 12, fontFamily: "Jua_400Regular" },
  progressNum: { fontSize: 14, fontFamily: "Baloo2_700Bold" },
  progressTrack: { height: 8, borderRadius: 4, overflow: "hidden" },
  progressFill: { height: 8, borderRadius: 4 },
  streakBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    minWidth: 54,
    justifyContent: "center",
  },
  streakNum: { fontSize: 18, fontFamily: "Baloo2_700Bold" },

  body: { paddingHorizontal: 16, paddingTop: 8, gap: 14 },
  scoreRow: { flexDirection: "row" },
  scoreChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  scoreText: { fontSize: 15, fontFamily: "Baloo2_700Bold" },

  defCard: {
    padding: 22,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 4,
  },
  defPrompt: { fontSize: 12, fontFamily: "Jua_400Regular", letterSpacing: 0.3 },
  defText: { fontSize: 22, fontFamily: "Baloo2_400Regular", lineHeight: 34 },
  defFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  posBadge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999 },
  posText: { fontSize: 13, fontFamily: "Baloo2_600SemiBold" },
  replayPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
  },
  replayText: { fontSize: 15, fontFamily: "Baloo2_600SemiBold" },

  hintBox: { borderWidth: 1.5, padding: 16, gap: 8 },
  hintHeader: { flexDirection: "row", alignItems: "center", gap: 6 },
  hintLabel: { fontSize: 14, fontFamily: "Baloo2_600SemiBold" },
  hintChars: { fontSize: 24, fontFamily: "Baloo2_700Bold", letterSpacing: 5, lineHeight: 38 },

  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 18,
    borderWidth: 1.5,
  },
  bannerText: { fontSize: 18, fontFamily: "Baloo2_700Bold", lineHeight: 26 },
  bannerAnswer: { fontSize: 26, fontFamily: "Baloo2_800ExtraBold", marginTop: 4 },

  input: {
    borderWidth: 2.5,
    paddingHorizontal: 20,
    paddingVertical: 18,
    fontSize: 24,
    fontFamily: "Baloo2_400Regular",
  },

  actionRow: { flexDirection: "row", gap: 10 },
  hintPill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 999,
    paddingVertical: 16,
    borderWidth: 1.5,
    minHeight: 56,
  },
  hintPillText: { fontSize: 16, fontFamily: "Baloo2_600SemiBold" },
  submitPill: {
    flex: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 999,
    paddingVertical: 16,
    minHeight: 56,
  },
  submitPillText: { fontSize: 18, fontFamily: "Baloo2_700Bold" },

  pill: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderRadius: 999,
    paddingVertical: 18,
    paddingHorizontal: 28,
    minHeight: 60,
    shadowColor: "#4FC3A1",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 14,
    elevation: 6,
  },
  pillText: { color: "#fff", fontSize: 20, fontFamily: "Baloo2_700Bold" },
  pillOutline: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderRadius: 999,
    paddingVertical: 16,
    paddingHorizontal: 28,
    minHeight: 56,
    borderWidth: 2,
    backgroundColor: "transparent",
  },
  pillOutlineText: { fontSize: 18, fontFamily: "Baloo2_700Bold" },

  summaryScroll: { paddingHorizontal: 24, gap: 18, alignItems: "center" },
  summaryIconWrap: {
    width: 130,
    height: 130,
    borderRadius: 65,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  summaryTitle: { fontSize: 32, fontFamily: "Baloo2_800ExtraBold", textAlign: "center" },
  summaryScore: { fontSize: 26, fontFamily: "Baloo2_700Bold", textAlign: "center" },
  streakRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  streakLabel: { fontSize: 16, fontFamily: "Jua_400Regular" },
  missedBox: {
    width: "100%",
    padding: 20,
    gap: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  missedLabel: { fontSize: 12, fontFamily: "Jua_400Regular", letterSpacing: 0.5, marginBottom: 2 },
  missedRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  missedWord: { fontSize: 18, fontFamily: "Baloo2_700Bold" },
  missedKo: { fontSize: 15, fontFamily: "Jua_400Regular" },
});
