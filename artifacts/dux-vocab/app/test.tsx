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
} from "react-native";
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

// ─── types ────────────────────────────────────────────────────────────────────

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
    if (currentWords.length > 0) {
      startSession(currentWords);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── auto-play TTS on new question ───────────────────────────────────────────
  useEffect(() => {
    if (
      phase === "question" &&
      sessionWords.length > 0 &&
      currentIndex < sessionWords.length
    ) {
      const word = sessionWords[currentIndex];
      const timer = setTimeout(() => {
        Speech.stop();
        Speech.speak(word.definition_en, { language: "en-US", pitch: 1.0, rate: 0.9 });
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [currentIndex, phase, sessionWords]);

  // ── helpers ─────────────────────────────────────────────────────────────────
  const currentWord = sessionWords[currentIndex] ?? null;
  const totalWords = sessionWords.length;

  const replay = () => {
    if (!currentWord) return;
    Speech.stop();
    Speech.speak(currentWord.definition_en, { language: "en-US", rate: 0.9 });
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
      <View
        style={[
          styles.centered,
          { backgroundColor: colors.background, paddingTop: insets.top },
        ]}
      >
        <MaterialIcons name="school" size={64} color={colors.mutedForeground} />
        <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
          단어가 없습니다
        </Text>
        <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
          먼저 단어장을 불러오세요
        </Text>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[
            styles.bigBtn,
            { backgroundColor: colors.primary, borderRadius: colors.radius },
          ]}
        >
          <Text style={styles.bigBtnText}>돌아가기</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (sessionWords.length === 0) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  // ── SUMMARY ─────────────────────────────────────────────────────────────────
  if (phase === "summary") {
    const pct = totalWords > 0 ? score / totalWords : 0;
    const isGood = pct >= 0.8;
    return (
      <View
        style={[
          styles.container,
          {
            backgroundColor: colors.background,
            paddingTop: insets.top + 16,
            paddingBottom: insets.bottom + 24,
          },
        ]}
      >
        <ScrollView
          contentContainerStyle={styles.summaryScroll}
          showsVerticalScrollIndicator={false}
        >
          <View
            style={[
              styles.summaryIconWrap,
              {
                backgroundColor: isGood
                  ? colors.success + "20"
                  : colors.primary + "20",
              },
            ]}
          >
            <MaterialIcons
              name={isGood ? "emoji-events" : "school"}
              size={64}
              color={isGood ? colors.success : colors.primary}
            />
          </View>

          <Text style={[styles.summaryTitle, { color: colors.foreground }]}>
            퀴즈 완료!
          </Text>

          <Text style={[styles.summaryScore, { color: colors.primary }]}>
            {totalWords}개 중 {score}개 정답
          </Text>

          {maxStreak > 1 && (
            <View style={styles.streakRow}>
              <MaterialIcons
                name="local-fire-department"
                size={20}
                color={colors.success}
              />
              <Text style={[styles.summaryStreak, { color: colors.mutedForeground }]}>
                최고 연속 정답 {maxStreak}개
              </Text>
            </View>
          )}

          {missedWords.length > 0 && (
            <View
              style={[
                styles.missedBox,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  borderRadius: colors.radius,
                },
              ]}
            >
              <Text style={[styles.missedLabel, { color: colors.mutedForeground }]}>
                틀린 단어
              </Text>
              {missedWords.map((w) => (
                <Text
                  key={w.id}
                  style={[styles.missedWord, { color: colors.foreground }]}
                >
                  • {w.word}
                  {"  "}
                  <Text style={{ color: colors.mutedForeground, fontSize: 14 }}>
                    {w.word_ko}
                  </Text>
                </Text>
              ))}
            </View>
          )}

          {missedWords.length > 0 && (
            <TouchableOpacity
              onPress={() => startSession(missedWords)}
              style={[
                styles.bigBtn,
                { backgroundColor: colors.primary, borderRadius: colors.radius },
              ]}
            >
              <MaterialIcons name="refresh" size={22} color="#fff" />
              <Text style={styles.bigBtnText}>틀린 단어 다시</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            onPress={() => { Speech.stop(); router.back(); }}
            style={[
              styles.bigBtn,
              {
                backgroundColor: colors.secondary,
                borderRadius: colors.radius,
              },
            ]}
          >
            <MaterialIcons name="arrow-back" size={22} color={colors.primary} />
            <Text style={[styles.bigBtnText, { color: colors.primary }]}>
              단어 목록으로
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  // ── QUESTION / RETRY / CORRECT / WRONG ──────────────────────────────────────
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      {/* ── Header ── */}
      <View
        style={[
          styles.header,
          { paddingTop: topPad + 8, borderBottomColor: colors.border },
        ]}
      >
        <TouchableOpacity
          onPress={() => {
            Speech.stop();
            router.back();
          }}
          style={[styles.iconBtn, { backgroundColor: colors.secondary }]}
        >
          <MaterialIcons name="close" size={22} color={colors.primary} />
        </TouchableOpacity>

        <View style={styles.progressWrap}>
          <View style={styles.progressTopRow}>
            <Text style={[styles.progressLabel, { color: colors.mutedForeground }]}>
              진행
            </Text>
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

        <View
          style={[
            styles.streakBadge,
            {
              backgroundColor:
                streak > 0 ? colors.success + "20" : colors.muted,
            },
          ]}
        >
          <MaterialIcons
            name="local-fire-department"
            size={18}
            color={streak > 0 ? colors.success : colors.mutedForeground}
          />
          <Text
            style={[
              styles.streakNum,
              { color: streak > 0 ? colors.success : colors.mutedForeground },
            ]}
          >
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
          <View
            style={[
              styles.scoreChip,
              { backgroundColor: colors.primary + "15" },
            ]}
          >
            <MaterialIcons name="star" size={16} color={colors.primary} />
            <Text style={[styles.scoreText, { color: colors.primary }]}>
              점수 {score}
            </Text>
          </View>
        </View>

        {/* Definition card */}
        <View
          style={[
            styles.defCard,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              borderRadius: colors.radius,
            },
          ]}
        >
          <Text style={[styles.defPrompt, { color: colors.mutedForeground }]}>
            뜻을 보고 영어 단어를 입력하세요
          </Text>
          <Text style={[styles.defText, { color: colors.foreground }]}>
            {currentWord?.definition_en}
          </Text>
          <View style={styles.defFooter}>
            <Text style={[styles.posChip, { color: colors.mutedForeground }]}>
              {currentWord?.pos}
            </Text>
            <TouchableOpacity
              onPress={replay}
              style={[styles.replayBtn, { backgroundColor: colors.secondary }]}
              activeOpacity={0.75}
            >
              <MaterialIcons name="volume-up" size={20} color={colors.primary} />
              <Text style={[styles.replayText, { color: colors.primary }]}>
                다시 듣기
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Hint box */}
        {hintLevel > 0 && currentWord && (
          <View
            style={[
              styles.hintBox,
              {
                backgroundColor: colors.warning + "18",
                borderColor: colors.warning,
                borderRadius: colors.radius,
              },
            ]}
          >
            <View style={styles.hintHeader}>
              <MaterialIcons name="lightbulb" size={18} color={colors.warning} />
              <Text style={[styles.hintLabel, { color: colors.warning }]}>
                힌트
                {hintLevel === 1
                  ? ` — ${currentWord.word.length}글자`
                  : " — 첫 글자 공개"}
              </Text>
            </View>
            <Text
              style={[styles.hintChars, { color: colors.foreground }]}
              numberOfLines={2}
            >
              {buildHint(currentWord.word, hintLevel as 1 | 2)}
            </Text>
          </View>
        )}

        {/* Retry banner */}
        {phase === "retry" && (
          <View
            style={[
              styles.feedbackBanner,
              {
                backgroundColor: colors.warning + "22",
                borderColor: colors.warning,
                borderRadius: colors.radius,
              },
            ]}
          >
            <MaterialIcons name="mood" size={28} color={colors.warning} />
            <Text
              style={[
                styles.feedbackMsg,
                { color: colors.warningForeground ?? colors.warning },
              ]}
            >
              아깝다! 한 글자 차이예요.{"\n"}한 번 더!
            </Text>
          </View>
        )}

        {/* Correct banner */}
        {phase === "correct" && (
          <View
            style={[
              styles.feedbackBanner,
              {
                backgroundColor: colors.success + "22",
                borderColor: colors.success,
                borderRadius: colors.radius,
              },
            ]}
          >
            <MaterialIcons name="check-circle" size={32} color={colors.success} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.feedbackMsg, { color: colors.success }]}>
                {praiseMsg}
              </Text>
              <Text style={[styles.feedbackAnswer, { color: colors.foreground }]}>
                {currentWord?.word}
              </Text>
            </View>
          </View>
        )}

        {/* Wrong banner */}
        {phase === "wrong" && (
          <View
            style={[
              styles.feedbackBanner,
              {
                backgroundColor: colors.destructive + "18",
                borderColor: colors.destructive,
                borderRadius: colors.radius,
              },
            ]}
          >
            <MaterialIcons name="cancel" size={32} color={colors.destructive} />
            <View style={{ flex: 1 }}>
              <Text
                style={[styles.feedbackMsg, { color: colors.destructive }]}
              >
                정답은:
              </Text>
              <Text style={[styles.feedbackAnswer, { color: colors.foreground }]}>
                {currentWord?.word}
              </Text>
            </View>
          </View>
        )}

        {/* Input + action row */}
        {(phase === "question" || phase === "retry") && (
          <>
            <TextInput
              ref={inputRef}
              value={userInput}
              onChangeText={setUserInput}
              placeholder="영어 단어를 입력하세요"
              placeholderTextColor={colors.mutedForeground + "80"}
              style={[
                styles.input,
                {
                  color: colors.foreground,
                  borderColor:
                    phase === "retry" ? colors.warning : colors.border,
                  backgroundColor: colors.card,
                  borderRadius: colors.radius,
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
                  styles.hintBtn,
                  {
                    backgroundColor: colors.secondary,
                    borderRadius: colors.radius,
                    opacity: hintLevel >= 2 ? 0.4 : 1,
                  },
                ]}
                activeOpacity={0.8}
              >
                <MaterialIcons
                  name="lightbulb"
                  size={20}
                  color={colors.primary}
                />
                <Text style={[styles.hintBtnText, { color: colors.primary }]}>
                  힌트{hintLevel > 0 ? ` (${hintLevel}/2)` : ""}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={submit}
                disabled={!userInput.trim()}
                style={[
                  styles.submitBtn,
                  {
                    backgroundColor: userInput.trim()
                      ? colors.primary
                      : colors.muted,
                    borderRadius: colors.radius,
                  },
                ]}
                activeOpacity={0.85}
              >
                <Text
                  style={[
                    styles.submitBtnText,
                    {
                      color: userInput.trim()
                        ? "#fff"
                        : colors.mutedForeground,
                    },
                  ]}
                >
                  제출
                </Text>
                <MaterialIcons
                  name="send"
                  size={20}
                  color={userInput.trim() ? "#fff" : colors.mutedForeground}
                />
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* Next / Finish button */}
        {(phase === "correct" || phase === "wrong") && (
          <TouchableOpacity
            onPress={advance}
            style={[
              styles.nextBtn,
              {
                backgroundColor:
                  phase === "correct" ? colors.success : colors.primary,
                borderRadius: colors.radius,
              },
            ]}
            activeOpacity={0.85}
          >
            <Text style={styles.nextBtnText}>
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
  );
}

// ─── styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    paddingHorizontal: 32,
  },
  emptyTitle: { fontSize: 22, fontFamily: "Inter_700Bold", textAlign: "center" },
  emptySub: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },

  // ── Header ──
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    gap: 12,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  progressWrap: { flex: 1, gap: 6 },
  progressTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  progressLabel: { fontSize: 11, fontFamily: "Inter_500Medium" },
  progressNum: { fontSize: 13, fontFamily: "Inter_700Bold" },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: { height: 6, borderRadius: 3 },
  streakBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    minWidth: 52,
    justifyContent: "center",
  },
  streakNum: { fontSize: 16, fontFamily: "Inter_700Bold" },

  // ── Body ──
  body: { paddingHorizontal: 16, paddingTop: 16, gap: 14 },
  scoreRow: { flexDirection: "row" },
  scoreChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  scoreText: { fontSize: 14, fontFamily: "Inter_700Bold" },

  // ── Definition card ──
  defCard: {
    borderWidth: 1.5,
    padding: 20,
    gap: 10,
  },
  defPrompt: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  defText: {
    fontSize: 22,
    fontFamily: "Inter_400Regular",
    lineHeight: 32,
  },
  defFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
  posChip: { fontSize: 14, fontFamily: "Inter_500Medium" },
  replayBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  replayText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },

  // ── Hint box ──
  hintBox: { borderWidth: 1.5, padding: 14, gap: 8 },
  hintHeader: { flexDirection: "row", alignItems: "center", gap: 6 },
  hintLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  hintChars: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    letterSpacing: 4,
    lineHeight: 36,
  },

  // ── Feedback banners ──
  feedbackBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 16,
    borderWidth: 1.5,
  },
  feedbackMsg: { fontSize: 18, fontFamily: "Inter_700Bold", lineHeight: 26 },
  feedbackAnswer: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    marginTop: 4,
  },

  // ── Input ──
  input: {
    borderWidth: 2,
    paddingHorizontal: 18,
    paddingVertical: 16,
    fontSize: 22,
    fontFamily: "Inter_400Regular",
  },

  // ── Action row ──
  actionRow: {
    flexDirection: "row",
    gap: 10,
  },
  hintBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 16,
  },
  hintBtnText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  submitBtn: {
    flex: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
  },
  submitBtnText: { fontSize: 18, fontFamily: "Inter_700Bold" },

  // ── Next button ──
  nextBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 18,
  },
  nextBtnText: {
    color: "#fff",
    fontSize: 20,
    fontFamily: "Inter_700Bold",
  },

  // ── Buttons ──
  bigBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 18,
    paddingHorizontal: 24,
  },
  bigBtnText: { color: "#fff", fontSize: 18, fontFamily: "Inter_700Bold" },

  // ── Summary ──
  summaryScroll: {
    paddingHorizontal: 24,
    paddingBottom: 40,
    gap: 18,
    alignItems: "center",
  },
  summaryIconWrap: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  summaryTitle: {
    fontSize: 30,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
  },
  summaryScore: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
  },
  streakRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  summaryStreak: {
    fontSize: 16,
    fontFamily: "Inter_500Medium",
  },
  missedBox: {
    borderWidth: 1.5,
    padding: 18,
    gap: 10,
    width: "100%",
  },
  missedLabel: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  missedWord: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
    lineHeight: 28,
  },
});
