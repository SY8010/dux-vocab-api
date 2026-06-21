import React, { useRef, useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as FileSystem from "expo-file-system";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import { useVocab } from "@/context/VocabContext";

const MAX_PHOTOS = 5;
const API_BASE = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;

export default function CameraScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { setCurrentWords } = useVocab();

  const [permission, requestPermission] = useCameraPermissions();
  const [photos, setPhotos] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cameraRef = useRef<CameraView>(null);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const takePhoto = useCallback(async () => {
    if (photos.length >= MAX_PHOTOS) return;
    try {
      const pic = await cameraRef.current?.takePictureAsync({ quality: 0.65, skipProcessing: false });
      if (pic?.uri) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setPhotos((prev) => [...prev, pic.uri]);
      }
    } catch (e) {
      setError("사진 촬영에 실패했습니다.");
    }
  }, [photos.length]);

  const deletePhoto = useCallback((index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const submit = useCallback(async () => {
    if (photos.length === 0 || loading) return;
    setLoading(true);
    setError(null);
    try {
      const base64Images = await Promise.all(
        photos.map((uri) =>
          FileSystem.readAsStringAsync(uri, {
            encoding: FileSystem.EncodingType.Base64,
          })
        )
      );

      const response = await fetch(`${API_BASE}/api/ocr/extract`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ images: base64Images }),
      });

      if (!response.ok) {
        const errBody = await response.text();
        throw new Error(errBody || `Server error ${response.status}`);
      }

      const data = await response.json();

      if (!data.words || !Array.isArray(data.words)) {
        throw new Error("서버 응답 형식이 올바르지 않습니다.");
      }

      setCurrentWords(data.words);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace("/words");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "알 수 없는 오류가 발생했습니다.";
      setError(`오류: ${msg}`);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  }, [photos, loading, setCurrentWords, router]);

  if (!permission) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background, paddingTop: topPad }]}>
        <Ionicons name="camera-outline" size={64} color={colors.mutedForeground} />
        <Text style={[styles.permTitle, { color: colors.foreground }]}>카메라 권한 필요</Text>
        <Text style={[styles.permSub, { color: colors.mutedForeground }]}>
          단어장을 촬영하려면 카메라 권한이 필요합니다
        </Text>
        <TouchableOpacity
          style={[styles.permBtn, { backgroundColor: colors.primary, borderRadius: colors.radius }]}
          onPress={requestPermission}
        >
          <Text style={styles.permBtnText}>권한 허용</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 12 }}>
          <Text style={[styles.backLink, { color: colors.mutedForeground }]}>돌아가기</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: "#000" }]}>
      {/* Camera */}
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing="back"
      />

      {/* Top bar */}
      <View style={[styles.topBar, { paddingTop: topPad + 8 }]}>
        <TouchableOpacity
          style={[styles.topBtn, { backgroundColor: "#00000066" }]}
          onPress={() => router.back()}
        >
          <Ionicons name="close" size={26} color="#fff" />
        </TouchableOpacity>

        <View style={[styles.counter, { backgroundColor: "#00000066" }]}>
          <Text style={styles.counterText}>
            {photos.length} / {MAX_PHOTOS}
          </Text>
        </View>
      </View>

      {/* Bottom panel */}
      <View style={[styles.bottomPanel, { paddingBottom: botPad + 16 }]}>
        {/* Photo strip */}
        {photos.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.strip}
            contentContainerStyle={styles.stripContent}
          >
            {photos.map((uri, i) => (
              <View key={uri + i} style={styles.thumbContainer}>
                <Image source={{ uri }} style={styles.thumb} />
                <TouchableOpacity
                  style={styles.deleteBtn}
                  onPress={() => deletePhoto(i)}
                >
                  <Ionicons name="close-circle" size={22} color="#ff4444" />
                </TouchableOpacity>
                <View style={styles.thumbNumber}>
                  <Text style={styles.thumbNumberText}>{i + 1}</Text>
                </View>
              </View>
            ))}
          </ScrollView>
        )}

        {/* Error */}
        {error && (
          <View style={[styles.errorBox, { backgroundColor: "#ff444444" }]}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Controls */}
        <View style={styles.controls}>
          <View style={styles.controlLeft}>
            {photos.length >= MAX_PHOTOS && (
              <Text style={styles.maxText}>최대 {MAX_PHOTOS}장</Text>
            )}
          </View>

          {/* Shutter */}
          <TouchableOpacity
            onPress={takePhoto}
            disabled={photos.length >= MAX_PHOTOS || loading}
            style={[
              styles.shutter,
              (photos.length >= MAX_PHOTOS || loading) && { opacity: 0.4 },
            ]}
            activeOpacity={0.8}
          >
            <View style={styles.shutterInner} />
          </TouchableOpacity>

          {/* Submit */}
          <TouchableOpacity
            onPress={submit}
            disabled={photos.length === 0 || loading}
            style={[
              styles.submitBtn,
              {
                backgroundColor:
                  photos.length === 0 || loading ? "#ffffff33" : colors.primary,
                borderRadius: 14,
              },
            ]}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name="sparkles" size={18} color="#fff" />
                <Text style={styles.submitText}>분석 시작</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    paddingHorizontal: 32,
  },
  topBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  topBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  counter: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  counterText: {
    color: "#fff",
    fontFamily: "Inter_700Bold",
    fontSize: 16,
  },
  bottomPanel: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#000000aa",
    paddingTop: 12,
    gap: 12,
  },
  strip: {
    maxHeight: 90,
  },
  stripContent: {
    paddingHorizontal: 16,
    gap: 10,
    alignItems: "center",
  },
  thumbContainer: {
    width: 70,
    height: 70,
    position: "relative",
  },
  thumb: {
    width: 70,
    height: 70,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#fff",
  },
  deleteBtn: {
    position: "absolute",
    top: -6,
    right: -6,
    backgroundColor: "#000",
    borderRadius: 11,
  },
  thumbNumber: {
    position: "absolute",
    bottom: 4,
    left: 4,
    backgroundColor: "#00000088",
    borderRadius: 8,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  thumbNumberText: {
    color: "#fff",
    fontSize: 11,
    fontFamily: "Inter_700Bold",
  },
  errorBox: {
    marginHorizontal: 16,
    padding: 10,
    borderRadius: 10,
  },
  errorText: {
    color: "#ff6666",
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    textAlign: "center",
  },
  controls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingVertical: 8,
  },
  controlLeft: { width: 90, alignItems: "center" },
  maxText: {
    color: "#ffffff88",
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  shutter: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 4,
    borderColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  shutterInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#fff",
  },
  submitBtn: {
    width: 90,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },
  submitText: {
    color: "#fff",
    fontFamily: "Inter_700Bold",
    fontSize: 14,
  },
  permTitle: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
    marginTop: 16,
  },
  permSub: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 22,
  },
  permBtn: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    marginTop: 8,
  },
  permBtnText: {
    color: "#fff",
    fontSize: 17,
    fontFamily: "Inter_700Bold",
  },
  backLink: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
});
