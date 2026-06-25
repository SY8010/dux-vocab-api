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
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
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
        result.assets.map(async (asset) => ({
          uri: asset.uri,
          base64: await resizeToBase64(asset.uri),
        }))
      );
      setPhotos((prev) => [...prev, ...newPhotos].slice(0, MAX_PHOTOS));
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      // silent
    } finally {
      setProcessing(false);
    }
  }, [photos.length, router]);

  useEffect(() => {
    openPicker();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const deletePhoto = (index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  if (photos.length === 0 && !processing) return null;

  return (
    <LinearGradient
      colors={[colors.gradientTop, colors.gradientBottom]}
      style={styles.gradient}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 8 }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.iconBtn, { backgroundColor: colors.card }]}
        >
          <MaterialIcons name="arrow-back" size={22} color={colors.primary} />
        </TouchableOpacity>

        <Text style={[styles.headerTitle, { color: colors.foreground }]}>
          사진 올리기
        </Text>

        <View style={[styles.counterBadge, { backgroundColor: colors.primary + "20" }]}>
          <Text style={[styles.counterText, { color: colors.primary }]}>
            {photos.length} / {MAX_PHOTOS}
          </Text>
        </View>
      </View>

      {/* Grid */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.grid, { paddingBottom: botPad + 160 }]}
        showsVerticalScrollIndicator={false}
      >
        {photos.map((photo, i) => (
          <View key={photo.uri + i} style={[styles.thumbWrap, { borderRadius: 20, borderColor: colors.border }]}>
            <Image source={{ uri: photo.uri }} style={styles.thumb} />
            <TouchableOpacity style={styles.deleteBtn} onPress={() => deletePhoto(i)}>
              <View style={styles.deleteBg}>
                <MaterialIcons name="close" size={18} color="#fff" />
              </View>
            </TouchableOpacity>
            <View style={[styles.indexBadge, { backgroundColor: colors.primary }]}>
              <Text style={styles.indexText}>{i + 1}</Text>
            </View>
          </View>
        ))}

        {photos.length < MAX_PHOTOS && (
          <TouchableOpacity
            style={[
              styles.addTile,
              { borderColor: colors.primary, borderRadius: 20, backgroundColor: colors.card },
            ]}
            onPress={openPicker}
            disabled={processing}
            activeOpacity={0.8}
          >
            {processing ? (
              <ActivityIndicator color={colors.primary} size="large" />
            ) : (
              <>
                <View style={[styles.addIconCircle, { backgroundColor: colors.primary + "18" }]}>
                  <MaterialIcons name="add" size={32} color={colors.primary} />
                </View>
                <Text style={[styles.addText, { color: colors.primary }]}>사진 추가</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Bottom bar */}
      <View
        style={[
          styles.bottomBar,
          { paddingBottom: botPad + 16, backgroundColor: colors.card },
        ]}
      >
        {error ? (
          <View style={[styles.errorBox, { backgroundColor: colors.destructive + "15", borderColor: colors.destructive + "40" }]}>
            <MaterialIcons name="error-outline" size={16} color={colors.destructive} />
            <Text style={[styles.errorText, { color: colors.destructive }]} numberOfLines={3}>
              {error}
            </Text>
          </View>
        ) : null}

        <View style={styles.actionRow}>
          <View style={styles.hintWrap}>
            <MaterialIcons name="eco" size={16} color={colors.primary} />
            <Text style={[styles.hintText, { color: colors.mutedForeground }]}>
              불필요한 사진은 X로 삭제하세요
            </Text>
          </View>

          <TouchableOpacity
            style={[
              styles.analyzePill,
              {
                backgroundColor:
                  photos.length === 0 || loading || processing
                    ? colors.border
                    : colors.primary,
              },
            ]}
            onPress={() => analyze(photos.map((p) => p.base64))}
            disabled={photos.length === 0 || loading || processing}
            activeOpacity={0.88}
          >
            {loading ? (
              <>
                <ActivityIndicator color="#fff" size="small" />
                <Text style={styles.analyzePillText}>분석 중...</Text>
              </>
            ) : (
              <>
                <MaterialIcons name="auto-awesome" size={20} color="#fff" />
                <Text style={styles.analyzePillText}>분석 시작</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  headerTitle: { fontSize: 20, fontFamily: "Baloo2_700Bold", flex: 1, textAlign: "center" },
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
  counterBadge: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  counterText: { fontFamily: "Baloo2_700Bold", fontSize: 15 },
  scroll: { flex: 1 },
  grid: { padding: 16, flexDirection: "row", flexWrap: "wrap", gap: 14 },
  thumbWrap: {
    width: "47%",
    aspectRatio: 4 / 3,
    borderWidth: 1.5,
    overflow: "visible",
    position: "relative",
  },
  thumb: { width: "100%", height: "100%", borderRadius: 18 },
  deleteBtn: { position: "absolute", top: -10, right: -10, zIndex: 10 },
  deleteBg: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#E57373",
    alignItems: "center",
    justifyContent: "center",
  },
  indexBadge: {
    position: "absolute",
    bottom: 8,
    left: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  indexText: { color: "#fff", fontSize: 13, fontFamily: "Baloo2_700Bold" },
  addTile: {
    width: "47%",
    aspectRatio: 4 / 3,
    borderWidth: 2,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  addIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  addText: { fontSize: 15, fontFamily: "Baloo2_600SemiBold" },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: 14,
    paddingHorizontal: 16,
    gap: 10,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 8,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  errorText: { fontSize: 12, fontFamily: "Baloo2_400Regular", flex: 1, lineHeight: 17 },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  hintWrap: { flex: 1, flexDirection: "row", alignItems: "center", gap: 6 },
  hintText: { fontSize: 13, fontFamily: "Jua_400Regular", flex: 1 },
  analyzePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 999,
    paddingHorizontal: 22,
    paddingVertical: 14,
    minHeight: 52,
  },
  analyzePillText: { color: "#fff", fontSize: 16, fontFamily: "Baloo2_700Bold" },
});
