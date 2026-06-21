import React, { useCallback, useEffect, useState } from "react";
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
import * as ImagePicker from "expo-image-picker";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import { useAnalyze } from "@/hooks/useAnalyze";

const MAX_PHOTOS = 5;
const MAX_WIDTH = 1500;

interface PickedPhoto {
  uri: string;
  base64: string;
}

async function resizeToBase64(uri: string): Promise<string> {
  const result = await manipulateAsync(
    uri,
    [{ resize: { width: MAX_WIDTH } }],
    { compress: 0.7, format: SaveFormat.JPEG, base64: true }
  );
  return result.base64 ?? "";
}

export default function GalleryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { analyze, loading, error } = useAnalyze();

  const [photos, setPhotos] = useState<PickedPhoto[]>([]);
  const [processing, setProcessing] = useState(false);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const openPicker = useCallback(async () => {
    const remaining = MAX_PHOTOS - photos.length;
    if (remaining <= 0) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      selectionLimit: remaining,
      quality: 1,
      base64: false,
    });

    if (result.canceled || result.assets.length === 0) {
      if (photos.length === 0) router.back();
      return;
    }

    setProcessing(true);
    try {
      const newPhotos: PickedPhoto[] = await Promise.all(
        result.assets.map(async (asset) => {
          const b64 = await resizeToBase64(asset.uri);
          return { uri: asset.uri, base64: b64 };
        })
      );
      setPhotos((prev) => [...prev, ...newPhotos].slice(0, MAX_PHOTOS));
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (e) {
      // silently ignore resize errors — uri still usable
    } finally {
      setProcessing(false);
    }
  }, [photos.length, router]);

  // Open picker immediately on first mount
  useEffect(() => {
    openPicker();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const deletePhoto = (index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAnalyze = () => {
    analyze(photos.map((p) => p.base64));
  };

  if (photos.length === 0 && !processing) return null;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
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
          <Ionicons name="arrow-back" size={22} color={colors.primary} />
        </TouchableOpacity>

        <Text style={[styles.headerTitle, { color: colors.foreground }]}>
          사진 올리기
        </Text>

        <View style={[styles.counterBadge, { backgroundColor: colors.secondary }]}>
          <Text style={[styles.counterText, { color: colors.primary }]}>
            {photos.length} / {MAX_PHOTOS}
          </Text>
        </View>
      </View>

      {/* Thumbnails grid */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.grid, { paddingBottom: botPad + 160 }]}
        showsVerticalScrollIndicator={false}
      >
        {photos.map((photo, i) => (
          <View
            key={photo.uri + i}
            style={[styles.thumbWrap, { borderRadius: colors.radius, borderColor: colors.border }]}
          >
            <Image source={{ uri: photo.uri }} style={styles.thumb} />
            <TouchableOpacity
              style={styles.deleteBtn}
              onPress={() => deletePhoto(i)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close-circle" size={28} color="#ff4444" />
            </TouchableOpacity>
            <View style={[styles.indexBadge, { backgroundColor: colors.primary }]}>
              <Text style={styles.indexText}>{i + 1}</Text>
            </View>
          </View>
        ))}

        {/* Add more tile */}
        {photos.length < MAX_PHOTOS && (
          <TouchableOpacity
            style={[
              styles.addTile,
              {
                borderColor: colors.primary,
                borderRadius: colors.radius,
                backgroundColor: colors.secondary,
              },
            ]}
            onPress={openPicker}
            disabled={processing}
            activeOpacity={0.8}
          >
            {processing ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <>
                <Ionicons name="add" size={36} color={colors.primary} />
                <Text style={[styles.addText, { color: colors.primary }]}>추가</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Bottom action bar */}
      <View
        style={[
          styles.bottomBar,
          {
            paddingBottom: botPad + 16,
            backgroundColor: colors.background,
            borderTopColor: colors.border,
          },
        ]}
      >
        {/* Error */}
        {error ? (
          <View style={[styles.errorBox, { backgroundColor: "#ff000022", borderColor: "#ff444444" }]}>
            <Ionicons name="alert-circle" size={15} color="#ff6666" />
            <Text style={styles.errorText} numberOfLines={3}>
              {error}
            </Text>
          </View>
        ) : null}

        <View style={styles.actionRow}>
          <View style={styles.hint}>
            <Ionicons name="information-circle-outline" size={16} color={colors.mutedForeground} />
            <Text style={[styles.hintText, { color: colors.mutedForeground }]}>
              불필요한 사진은 ✕로 삭제하세요
            </Text>
          </View>

          <TouchableOpacity
            style={[
              styles.analyzeBtn,
              {
                backgroundColor:
                  photos.length === 0 || loading || processing
                    ? colors.muted
                    : colors.primary,
                borderRadius: colors.radius,
              },
            ]}
            onPress={handleAnalyze}
            disabled={photos.length === 0 || loading || processing}
            activeOpacity={0.88}
          >
            {loading ? (
              <>
                <ActivityIndicator color="#fff" size="small" />
                <Text style={styles.analyzeBtnText}>분석 중...</Text>
              </>
            ) : (
              <>
                <Ionicons name="sparkles" size={20} color="#fff" />
                <Text style={styles.analyzeBtnText}>분석 시작</Text>
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
  counterBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  counterText: {
    fontFamily: "Inter_700Bold",
    fontSize: 14,
  },
  scroll: { flex: 1 },
  grid: {
    padding: 16,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  thumbWrap: {
    width: "47%",
    aspectRatio: 4 / 3,
    borderWidth: 1,
    overflow: "visible",
    position: "relative",
  },
  thumb: {
    width: "100%",
    height: "100%",
    borderRadius: 12,
  },
  deleteBtn: {
    position: "absolute",
    top: -10,
    right: -10,
    backgroundColor: "#fff",
    borderRadius: 14,
    zIndex: 10,
  },
  indexBadge: {
    position: "absolute",
    bottom: 8,
    left: 8,
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  indexText: {
    color: "#fff",
    fontSize: 13,
    fontFamily: "Inter_700Bold",
  },
  addTile: {
    width: "47%",
    aspectRatio: 4 / 3,
    borderWidth: 2,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  addText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: 12,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    gap: 10,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  errorText: {
    color: "#ff8888",
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    flex: 1,
    lineHeight: 17,
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  hint: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  hintText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    flex: 1,
  },
  analyzeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 22,
    paddingVertical: 14,
  },
  analyzeBtnText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
});
