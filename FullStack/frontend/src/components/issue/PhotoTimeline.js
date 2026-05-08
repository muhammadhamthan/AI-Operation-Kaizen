import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  ActivityIndicator,
  Modal,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../../theme/ThemeContext';
import {
  getPhotos,
  addPhoto,
  PHASE,
  PHASE_META,
} from '../../services/mocks/photoTimelineMockService';

/**
 * Photo timeline (Kairox §16).
 *
 * Three horizontally-scrolling rows (Before / During / After) with a
 * colour-coded left border per phase. Thumbnails open a fullscreen viewer.
 *
 * Uploads: Supervisor can add BEFORE; Problem Solver can add DURING or
 * AFTER. Parent decides the button set by passing `canUpload` + `role`.
 */
const PhotoTimeline = ({ issueId, role, canUpload }) => {
  const { theme, isDark } = useTheme();
  const [grouped, setGrouped] = useState(null);
  const [loading, setLoading] = useState(true);
  const [viewerUri, setViewerUri] = useState(null);
  const [uploadingPhase, setUploadingPhase] = useState(null);

  const load = useCallback(async () => {
    if (!issueId) return;
    setLoading(true);
    // TODO(backend): GET /api/v1/issues/:id/photos
    const g = await getPhotos(issueId);
    setGrouped(g);
    setLoading(false);
  }, [issueId]);

  useEffect(() => { load(); }, [load]);

  const handleUpload = async (phase) => {
    try {
      // Ask for gallery permission (camera also works fine; keep it simple).
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permission needed', 'Please allow photo library access.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.7,
      });
      if (result.canceled || !result.assets?.[0]?.uri) return;
      setUploadingPhase(phase);
      // TODO(backend): POST /api/v1/issues/:id/photos (multipart)
      await addPhoto(issueId, phase, result.assets[0].uri, role || 'Unknown');
      await load();
    } catch (e) {
      Alert.alert('Upload failed', e.message || 'Unable to add photo.');
    } finally {
      setUploadingPhase(null);
    }
  };

  if (loading) {
    return (
      <View style={[styles.shell, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <ActivityIndicator size="small" color={theme.textSecondary} />
      </View>
    );
  }

  const phases = [PHASE.BEFORE, PHASE.DURING, PHASE.AFTER];
  // Permission matrix: Supervisor can add BEFORE, PS can add DURING/AFTER.
  const phaseCanUpload = (phase) => {
    if (!canUpload) return false;
    if (role === 'supervisor' && phase === PHASE.BEFORE) return true;
    if (role === 'problem_solver' && (phase === PHASE.DURING || phase === PHASE.AFTER)) return true;
    return false;
  };

  return (
    <View testID="photo-timeline">
      {phases.map((phase) => {
        const meta = PHASE_META[phase];
        const shots = grouped?.[phase] || [];
        const uploadable = phaseCanUpload(phase);
        const isUploadingThis = uploadingPhase === phase;
        return (
          <View key={phase} style={styles.phaseBlock} testID={`photo-phase-${phase}`}>
            <View style={styles.phaseHeaderRow}>
              <View style={[styles.phaseBar, { backgroundColor: meta.color }]} />
              <Ionicons name={meta.icon} size={14} color={meta.color} style={{ marginRight: 6 }} />
              <Text style={[styles.phaseLabel, { color: theme.text }]}>
                {meta.label}
              </Text>
              <Text style={[styles.phaseCount, { color: theme.textSecondary }]}>
                · {shots.length}
              </Text>
              {uploadable && (
                <TouchableOpacity
                  style={[styles.addBtn, { borderColor: meta.color }]}
                  onPress={() => handleUpload(phase)}
                  disabled={isUploadingThis}
                  testID={`add-photo-${phase}`}
                  activeOpacity={0.7}
                >
                  {isUploadingThis ? (
                    <ActivityIndicator size="small" color={meta.color} />
                  ) : (
                    <>
                      <Ionicons name="add" size={14} color={meta.color} />
                      <Text style={[styles.addBtnText, { color: meta.color }]}>Add</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>
            {shots.length === 0 ? (
              <View
                style={[
                  styles.emptySlot,
                  { borderColor: isDark ? '#333' : '#e5e5e5', borderLeftColor: meta.color },
                ]}
              >
                <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                  No {meta.label.toLowerCase()} photos yet
                </Text>
              </View>
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.row}
              >
                {shots.map((p, idx) => (
                  <TouchableOpacity
                    key={`${phase}-${idx}`}
                    style={[styles.thumb, { borderLeftColor: meta.color }]}
                    onPress={() => setViewerUri(p.uri)}
                    activeOpacity={0.8}
                    testID={`photo-thumb-${phase}-${idx}`}
                  >
                    <Image source={{ uri: p.uri }} style={styles.thumbImg} />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>
        );
      })}

      <Modal
        visible={!!viewerUri}
        transparent
        animationType="fade"
        onRequestClose={() => setViewerUri(null)}
      >
        <View style={styles.viewer}>
          <TouchableOpacity
            style={styles.viewerClose}
            onPress={() => setViewerUri(null)}
            testID="photo-viewer-close"
          >
            <Ionicons name="close" size={32} color="#fff" />
          </TouchableOpacity>
          {viewerUri && (
            <Image
              source={{ uri: viewerUri }}
              style={styles.viewerImg}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  shell: {
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  phaseBlock: { marginBottom: 16 },
  phaseHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  phaseBar: { width: 3, height: 14, marginRight: 8, borderRadius: 2 },
  phaseLabel: { fontSize: 13, fontWeight: '700', letterSpacing: 0.2 },
  phaseCount: { fontSize: 12, fontWeight: '600', marginLeft: 4, flex: 1 },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
    gap: 2,
  },
  addBtnText: { fontSize: 11, fontWeight: '700' },
  emptySlot: {
    borderWidth: 1,
    borderLeftWidth: 3,
    borderRadius: 8,
    paddingVertical: 18,
    paddingHorizontal: 14,
    borderStyle: 'dashed',
  },
  emptyText: { fontSize: 12, fontStyle: 'italic' },
  row: { gap: 10, paddingVertical: 2, paddingRight: 10 },
  thumb: {
    width: 100,
    height: 100,
    borderRadius: 8,
    overflow: 'hidden',
    borderLeftWidth: 4,
    backgroundColor: '#1a1a1a',
  },
  thumbImg: { width: '100%', height: '100%' },
  viewer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewerClose: {
    position: 'absolute',
    top: Platform.OS === 'web' ? 24 : 48,
    right: 20,
    zIndex: 10,
    padding: 8,
  },
  viewerImg: { width: '90%', height: '80%' },
});

export default PhotoTimeline;
