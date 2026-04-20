import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
} from 'react-native';
import {
  collection,
  onSnapshot,
  addDoc,
  deleteDoc,
  updateDoc,
  doc,
  serverTimestamp,
  query,
  orderBy,
} from 'firebase/firestore';
import { db } from '../firebase';
import { Item } from '../types';

// ── Design tokens ─────────────────────────────────────────────────────────────

const COLOR = {
  primary: '#5B5FFF',
  primaryLight: '#EEF0FF',
  bg: '#F4F6FB',
  surface: '#FFFFFF',
  textPrimary: '#111827',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
  border: '#E5E7EB',
  danger: '#EF4444',
  dangerLight: '#FEF2F2',
};

const CATEGORIES = [
  { name: 'General',  color: '#6366F1' },
  { name: 'Baby',     color: '#F59E0B' },
  { name: 'Kitchen',  color: '#10B981' },
  { name: 'Bathroom', color: '#8B5CF6' },
  { name: 'Food',     color: '#EF4444' },
  { name: 'Cleaning', color: '#06B6D4' },
  { name: 'Health',   color: '#EC4899' },
  { name: 'Other',    color: '#9CA3AF' },
];

function categoryColor(name: string): string {
  return CATEGORIES.find(c => c.name === name)?.color ?? '#6366F1';
}

function quantityColor(qty: number): string {
  if (qty <= 2) return '#EF4444';
  if (qty <= 9) return '#F59E0B';
  return '#10B981';
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [category, setCategory] = useState('General');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'items'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, snapshot => {
      setItems(snapshot.docs.map(d => ({ id: d.id, ...(d.data() as Omit<Item, 'id'>) })));
      setLoading(false);
    });
    return unsub;
  }, []);

  const openAdd = () => {
    setEditingItem(null);
    setName('');
    setQuantity(1);
    setCategory('General');
    setModalVisible(true);
  };

  const openEdit = (item: Item) => {
    setEditingItem(item);
    setName(item.name);
    setQuantity(item.quantity);
    setCategory(item.category);
    setModalVisible(true);
  };

  const closeModal = () => { setModalVisible(false); setEditingItem(null); };

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      if (editingItem) {
        await updateDoc(doc(db, 'items', editingItem.id), {
          name: name.trim(), quantity, category,
        });
      } else {
        await addDoc(collection(db, 'items'), {
          name: name.trim(), quantity, category, createdAt: serverTimestamp(),
        });
      }
      closeModal();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    if (!editingItem) return;
    Alert.alert('Remove Item', `Remove "${editingItem.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive',
        onPress: async () => {
          closeModal();
          await deleteDoc(doc(db, 'items', editingItem.id));
        },
      },
    ]);
  };

  // ── Item card ───────────────────────────────────────────────────────────────

  const renderItem = ({ item }: { item: Item }) => {
    const catColor = categoryColor(item.category);
    const qtyColor = quantityColor(item.quantity);
    return (
      <TouchableOpacity style={styles.card} onPress={() => openEdit(item)} activeOpacity={0.72}>
        <View style={[styles.cardAccent, { backgroundColor: catColor }]} />
        <View style={styles.cardBody}>
          <View style={styles.cardLeft}>
            <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
            <View style={[styles.catChip, { backgroundColor: catColor + '22' }]}>
              <View style={[styles.catDot, { backgroundColor: catColor }]} />
              <Text style={[styles.catLabel, { color: catColor }]}>{item.category}</Text>
            </View>
          </View>
          <View style={[styles.qtyBadge, { backgroundColor: qtyColor + '18' }]}>
            <Text style={[styles.qtyText, { color: qtyColor }]}>{item.quantity}</Text>
            <Text style={[styles.qtyUnit, { color: qtyColor }]}>left</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={COLOR.primary} />

      {/* Header */}
      <SafeAreaView style={styles.headerSafe}>
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Tuntun</Text>
            <Text style={styles.headerSub}>
              {loading ? 'Loading…' : items.length === 0 ? 'No items yet' : `${items.length} item${items.length !== 1 ? 's' : ''} tracked`}
            </Text>
          </View>
        </View>
      </SafeAreaView>

      {/* List */}
      <SafeAreaView style={styles.body}>
        {loading ? (
          <ActivityIndicator size="large" color={COLOR.primary} style={styles.loader} />
        ) : (
          <FlatList
            data={items}
            keyExtractor={i => i.id}
            renderItem={renderItem}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Text style={styles.emptyIcon}>📦</Text>
                <Text style={styles.emptyTitle}>Nothing here yet</Text>
                <Text style={styles.emptyHint}>Tap + to add your first item</Text>
              </View>
            }
          />
        )}
      </SafeAreaView>

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={openAdd} activeOpacity={0.85}>
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>

      {/* Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={closeModal}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={closeModal} />

          <View style={styles.sheet}>
            {/* Handle bar */}
            <View style={styles.sheetHandle} />

            <Text style={styles.sheetTitle}>{editingItem ? 'Edit Item' : 'New Item'}</Text>

            {/* Name input */}
            <Text style={styles.label}>Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Diapers"
              placeholderTextColor={COLOR.textMuted}
              value={name}
              onChangeText={setName}
              autoFocus
              returnKeyType="next"
            />

            {/* Category chips */}
            <Text style={styles.label}>Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
              {CATEGORIES.map(cat => {
                const active = category === cat.name;
                return (
                  <TouchableOpacity
                    key={cat.name}
                    style={[
                      styles.chip,
                      { borderColor: cat.color, backgroundColor: active ? cat.color : cat.color + '18' },
                    ]}
                    onPress={() => setCategory(cat.name)}
                    activeOpacity={0.75}
                  >
                    <Text style={[styles.chipText, { color: active ? '#FFFFFF' : cat.color }]}>
                      {cat.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Quantity stepper */}
            <Text style={styles.label}>Quantity</Text>
            <View style={styles.stepper}>
              <TouchableOpacity
                style={styles.stepBtn}
                onPress={() => setQuantity(Math.max(0, quantity - 1))}
                activeOpacity={0.7}
              >
                <Text style={styles.stepBtnText}>−</Text>
              </TouchableOpacity>
              <TextInput
                style={styles.stepInput}
                value={String(quantity)}
                onChangeText={v => setQuantity(parseInt(v, 10) || 0)}
                keyboardType="number-pad"
                textAlign="center"
              />
              <TouchableOpacity
                style={styles.stepBtn}
                onPress={() => setQuantity(quantity + 1)}
                activeOpacity={0.7}
              >
                <Text style={styles.stepBtnText}>+</Text>
              </TouchableOpacity>
            </View>

            {/* Actions */}
            <View style={styles.sheetActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={closeModal}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, !name.trim() && styles.saveBtnDisabled]}
                onPress={handleSave}
                disabled={!name.trim() || saving}
              >
                <Text style={styles.saveBtnText}>{saving ? 'Saving…' : editingItem ? 'Save' : 'Add'}</Text>
              </TouchableOpacity>
            </View>

            {editingItem && (
              <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
                <Text style={styles.deleteBtnText}>Delete Item</Text>
              </TouchableOpacity>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLOR.primary },

  // Header
  headerSafe: { backgroundColor: COLOR.primary },
  header: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 20,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  headerTitle: { fontSize: 32, fontWeight: '700', color: '#FFFFFF', letterSpacing: -0.5 },
  headerSub:   { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 2 },

  // Body
  body:   { flex: 1, backgroundColor: COLOR.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  loader: { flex: 1 },
  list:   { padding: 16, paddingBottom: 110 },

  // Card
  card: {
    backgroundColor: COLOR.surface,
    borderRadius: 14,
    marginBottom: 10,
    flexDirection: 'row',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cardAccent: { width: 4 },
  cardBody:   { flex: 1, flexDirection: 'row', alignItems: 'center', padding: 14 },
  cardLeft:   { flex: 1, marginRight: 12 },
  itemName:   { fontSize: 15, fontWeight: '600', color: COLOR.textPrimary, marginBottom: 6 },

  // Category chip on card
  catChip:  { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  catDot:   { width: 6, height: 6, borderRadius: 3, marginRight: 5 },
  catLabel: { fontSize: 11, fontWeight: '600' },

  // Quantity badge
  qtyBadge: { borderRadius: 12, minWidth: 52, paddingHorizontal: 10, paddingVertical: 8, alignItems: 'center' },
  qtyText:  { fontSize: 18, fontWeight: '700', lineHeight: 22 },
  qtyUnit:  { fontSize: 10, fontWeight: '500', marginTop: 1 },

  // Empty state
  empty:      { alignItems: 'center', marginTop: 80 },
  emptyIcon:  { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: COLOR.textSecondary },
  emptyHint:  { fontSize: 14, color: COLOR.textMuted, marginTop: 6 },

  // FAB
  fab: {
    position: 'absolute', right: 20, bottom: 36,
    width: 58, height: 58, borderRadius: 29,
    backgroundColor: COLOR.primary,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: COLOR.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4, shadowRadius: 12, elevation: 10,
  },
  fabIcon: { fontSize: 28, color: '#FFFFFF', lineHeight: 32 },

  // Modal
  modalOverlay:  { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: {
    backgroundColor: COLOR.surface,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 24, paddingTop: 12, paddingBottom: 48,
  },
  sheetHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: COLOR.border,
    alignSelf: 'center', marginBottom: 20,
  },
  sheetTitle: { fontSize: 20, fontWeight: '700', color: COLOR.textPrimary, marginBottom: 20 },

  // Label
  label: { fontSize: 12, fontWeight: '600', color: COLOR.textSecondary, marginBottom: 8, letterSpacing: 0.5 },

  // Text input
  input: {
    borderWidth: 1.5, borderColor: COLOR.border, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: COLOR.textPrimary,
    backgroundColor: '#FAFAFA', marginBottom: 20,
  },

  // Category chip selector
  chipScroll:  { marginBottom: 20 },
  chip: {
    borderWidth: 1.5, borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 7,
    marginRight: 8,
  },
  chipText: { fontSize: 13, fontWeight: '600' },

  // Stepper
  stepper: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: COLOR.border, borderRadius: 12,
    overflow: 'hidden', marginBottom: 24,
  },
  stepBtn: {
    width: 52, height: 48,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#F9FAFB',
  },
  stepBtnText: { fontSize: 22, color: COLOR.primary, fontWeight: '500', lineHeight: 26 },
  stepInput: {
    flex: 1, height: 48,
    fontSize: 18, fontWeight: '700', color: COLOR.textPrimary,
    borderLeftWidth: 1.5, borderRightWidth: 1.5, borderColor: COLOR.border,
  },

  // Sheet actions
  sheetActions: { flexDirection: 'row', gap: 12 },
  cancelBtn: {
    flex: 1, height: 50, borderRadius: 12,
    borderWidth: 1.5, borderColor: COLOR.border,
    alignItems: 'center', justifyContent: 'center',
  },
  cancelBtnText: { fontSize: 15, fontWeight: '600', color: COLOR.textSecondary },
  saveBtn: {
    flex: 1, height: 50, borderRadius: 12,
    backgroundColor: COLOR.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  saveBtnDisabled: { backgroundColor: '#A5B4FC' },
  saveBtnText: { fontSize: 15, fontWeight: '600', color: '#FFFFFF' },
  deleteBtn: {
    marginTop: 12, height: 50, borderRadius: 12,
    backgroundColor: COLOR.dangerLight,
    alignItems: 'center', justifyContent: 'center',
  },
  deleteBtnText: { fontSize: 15, fontWeight: '600', color: COLOR.danger },
});
