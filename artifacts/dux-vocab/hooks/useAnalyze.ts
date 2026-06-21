import { useState } from "react";
import { Alert } from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { useVocab, WordEntry } from "@/context/VocabContext";

const API_BASE = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;

export function useAnalyze() {
  const { setCurrentWords } = useVocab();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyze = async (base64Images: string[]) => {
    if (base64Images.length === 0 || loading) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/api/ocr/extract`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ images: base64Images }),
      });

      let responseText = "";
      try {
        responseText = await response.text();
      } catch {
        responseText = "(응답 없음)";
      }

      if (!response.ok) {
        const errMsg = `서버 오류 ${response.status}:\n${responseText}`;
        setError(errMsg);
        Alert.alert("분석 실패", errMsg);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        return;
      }

      let data: { words?: unknown[] };
      try {
        data = JSON.parse(responseText);
      } catch {
        const errMsg = `JSON 파싱 오류:\n${responseText}`;
        setError(errMsg);
        Alert.alert("분석 실패", errMsg);
        return;
      }

      if (!data.words || !Array.isArray(data.words)) {
        const errMsg = `잘못된 응답 형식:\n${responseText}`;
        setError(errMsg);
        Alert.alert("분석 실패", errMsg);
        return;
      }

      setCurrentWords(data.words as WordEntry[]);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace("/words");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      const errMsg = `네트워크 오류:\n${msg}`;
      setError(errMsg);
      Alert.alert("분석 실패", errMsg);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  return { analyze, loading, error, setError };
}
