import React, { useRef, useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  ScrollView,
  ActivityIndicator,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import { useAnalyze } from "@/hooks/useAnalyze";

const MAX_PHOTOS = 5;

interface CapturedPhoto {
  uri: string;
  base64: string;
}

export default function CameraScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { analyze, loading, error } = useAnalyze();

  const [permission, requestPermission] = useCameraPermissions();
  const [photos, setPhotos] = useState<CapturedPhoto[]>([]);
  const cameraRef = useRef<CameraView>(null);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const takePhoto = useCallback(async () => {
    if (photos.length >= MAX_PHOTOS) return;
    const pic = await cameraRef.current?.takePictureAsync({
      quality: 0.5,
      base64: true,
      skipProcessing: false,
    });
    if (pic?.uri && pic?.base64) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setPhotos((prev) => [...prev, { uri: pic.uri, base64: pic.base64! }]);
    }
  }, [photos.length]);

  const deletePhoto = useCallback((index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // Permission not yet determined
  if (!permission) {
    return (
      <LinearGradient colors={[colors.gradientTop, colors.gradientBottom]} style={styles.gradient}>
        <View style={styles.centered}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      </LinearGradient>
    );
  }

  // Permission denied
  if (!permission.granted) {
    return (
      <LinearGradient colors={[colors.gradientTop, colors.gradientBottom]} style={styles.gradient}>
        <View style={[styles.centered, { paddingTop: topPad }]}>
          <View style={[styles.permIconWrap, { backgroundColor: colors.primary + "18" }]}>
            <MaterialIcons name="photo-camera" size={60} color={colors.primary} />
          </View>
          <Text style={[styles.permTitle, { color: colors.foreground }]}>
            카메라 권한이 필요해요
          </Text>
          <Text style={[styles.permSub, { color: colors.mutedForeground }]}>
            단어장을 찍으려면 카메라 권한을 허용해주세요
          </Text>
          <TouchableOpacity
            style={[styles.pill, { backgroundColor: colors.primary }]}
            onPress={requestPermission}
          >
            <Text style={styles.pillText}>권한 허용</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={[styles.backLink, { color: colors.mutedForeground }]}>돌아가기</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    );
  }

  return (
    <View style={styles.cameraContainer}>
      <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" />

      {/* Top bar overlay */}
      <View style={[styles.topBar, { paddingTop: topPad + 8 }]}>
        <TouchableOpacity
          style={styles.overlayBtn}
          onPress={() => router.back()}
        >
          <MaterialIcons name="close" size={26} color="#fff" />
        </TouchableOpacity>

        <View style={styles.counterBadge}>
          <Text style={styles.counterText}>{photos.length} / {MAX_PHOTOS}</Text>
        </View>
      </View>

      {/* Bottom panel */}
      <View style={[styles.bottomPanel, { paddingBottom: botPad + 16 }]}>
        {/* Thumbnail strip */}
        {photos.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.strip}
            contentContainerStyle={styles.stripContent}
          >
            {photos.map((photo, i) => (
              <View key={photo.uri + i} style={styles.thumbWrap}>
                <Image source={{ uri: photo.uri }} style={styles.thumb} />
                <TouchableOpacity style={styles.deleteBtn} onPress={() => deletePhoto(i)}>
                  <View style={styles.deleteBg}>
                    <MaterialIcons name="close" size={14} color="#fff" />
                  </View>
                </TouchableOpacity>
                <View style={styles.thumbNum}>
                  <Text style={styles.thumbNumText}>{i + 1}</Text>
                </View>
              </View>
            ))}
          </ScrollView>
        )}

        {error ? (
          <View style={styles.errorBox}>
            <MaterialIcons name="error-outline" size={16} color="#FFCB5B" />
            <Text style={styles.errorText} numberOfLines={3}>{error}</Text>
          </View>
        ) : null}

        {/* Controls */}
        <View style={styles.controls}>
          {/* Left: max label */}
          <View style={{ width: 90, alignItems: "center" }}>
            {photos.length >= MAX_PHOTOS && (
              <Text style={styles.maxText}>최대 {MAX_PHOTOS}장</Text>
            )}
          </View>

          {/* Shutter */}
          <TouchableOpacity
            onPress={takePhoto}
            disabled={photos.length >= MAX_PHOTOS || loading}
            style={[styles.shutter, (photos.length >= MAX_PHOTOS || loading) && { opacity: 0.4 }]}
            activeOpacity={0.8}
          >
            <View style={styles.shutterInner} />
          </TouchableOpacity>

          {/* Analyze */}
          <TouchableOpacity
            onPress={() => analyze(photos.map((p) => p.base64))}
            disabled={photos.length === 0 || loading}
            style={[
              styles.analyzePill,
              { backgroundColor: photos.length === 0 || loading ? "#ffffff33" : "#4FC3A1" },
            ]}
            activeOpacity={0.85}
          >
            {loading ? (
              <>
                <ActivityIndicator color="#fff" size="small" />
                <Text style={styles.analyzePillText}>분석 중</Text>
              </>
            ) : (
              <>
                <MaterialIcons name="auto-awesome" size={18} color="#fff" />
                <Text style={styles.analyzePillText}>분석 시작</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  cameraContainer: { flex: 1, backgroundColor: "#000" },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: 18, paddingHorizontal: 32 },
  permIconWrap: { width: 110, height: 110, borderRadius: 55, alignItems: "center", justifyContent: "center" },
  permTitle: { fontSize: 22, fontFamily: "Baloo2_700Bold", textAlign: "center" },
  permSub: { fontSize: 15, fontFamily: "Jua_400Regular", textAlign: "center", lineHeight: 23 },
  pill: {
    borderRadius: 999,
    paddingHorizontal: 32,
    paddingVertical: 16,
    minHeight: 56,
    marginTop: 8,
    shadowColor: "#4FC3A1",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  pillText: { color: "#fff", fontSize: 18, fontFamily: "Baloo2_700Bold" },
  backLink: { fontSize: 15, fontFamily: "Jua_400Regular" },
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
  overlayBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#00000066",
    alignItems: "center",
    justifyContent: "center",
  },
  counterBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#00000066",
  },
  counterText: { color: "#fff", fontFamily: "Baloo2_700Bold", fontSize: 16 },
  bottomPanel: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#000000bb",
    paddingTop: 14,
    gap: 12,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  strip: { maxHeight: 88 },
  stripContent: { paddingHorizontal: 16, gap: 10, alignItems: "center" },
  thumbWrap: { width: 72, height: 72, position: "relative" },
  thumb: { width: 72, height: 72, borderRadius: 14, borderWidth: 2, borderColor: "#fff" },
  deleteBtn: { position: "absolute", top: -6, right: -6, zIndex: 10 },
  deleteBg: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#E57373",
    alignItems: "center",
    justifyContent: "center",
  },
  thumbNum: {
    position: "absolute",
    bottom: 4,
    left: 4,
    backgroundColor: "#00000088",
    borderRadius: 8,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  thumbNumText: { color: "#fff", fontSize: 11, fontFamily: "Baloo2_700Bold" },
  errorBox: {
    marginHorizontal: 16,
    padding: 10,
    borderRadius: 14,
    backgroundColor: "#ffffff18",
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
  },
  errorText: { color: "#FFCB5B", fontFamily: "Baloo2_400Regular", fontSize: 12, flex: 1, lineHeight: 17 },
  controls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingVertical: 8,
  },
  maxText: { color: "#ffffff88", fontSize: 12, fontFamily: "Jua_400Regular" },
  shutter: {
    width: 78,
    height: 78,
    borderRadius: 39,
    borderWidth: 4,
    borderColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  shutterInner: { width: 62, height: 62, borderRadius: 31, backgroundColor: "#fff" },
  analyzePill: {
    width: 90,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 5,
  },
  analyzePillText: { color: "#fff", fontFamily: "Baloo2_700Bold", fontSize: 13 },
});
