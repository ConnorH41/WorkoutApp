
import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, Button, FlatList, TouchableOpacity, Alert, Modal, Platform, Keyboard, ToastAndroid, ScrollView } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { supabase } from '../lib/supabase';
import { useProfileStore } from '../lib/profileStore';
import ModalButtons from '../components/ModalButtons';
import EditPencil from '../components/EditPencil';
import RemoveButton from '../components/RemoveButton';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Helper date utilities (no external deps)
const addDays = (date: Date, days: number) => {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
};

// Get the next Monday from a given date (always future Monday, not today)
const getNextMonday = (from: Date) => {
  const d = new Date(from);
  const day = d.getDay();
  const daysUntilNextMonday = ((8 - day) % 7) || 7; // if Monday, jump 7 days ahead
  return addDays(d, daysUntilNextMonday);
};

const getEndDateForWeeks = (start: Date, weeks: number) => {
  // inclusive range: end = start + (weeks * 7 - 1)
  return addDays(start, weeks * 7 - 1);
};

// Add days with fractional support (accepts fractional days)
const addDaysFloat = (date: Date, days: number) => {
  const ms = Math.round(days * 24 * 60 * 60 * 1000);
  return new Date(date.getTime() + ms);
};

// Lightweight storage guards (RN doesn't have localStorage)
const safeStorage = {
  getItem: async (key: string) => {
    try {
      // @ts-ignore
      if (typeof localStorage !== 'undefined' && localStorage?.getItem) {
        // @ts-ignore
        return localStorage.getItem(key);
      }
    } catch {}
    return null;
  },
  setItem: async (key: string, value: string) => {
    try {
      // @ts-ignore
      if (typeof localStorage !== 'undefined' && localStorage?.setItem) {
        // @ts-ignore
        localStorage.setItem(key, value);
      }
    } catch {}
  },
  removeItem: async (key: string) => {
    try {
      // @ts-ignore
      if (typeof localStorage !== 'undefined' && localStorage?.removeItem) {
        // @ts-ignore
        localStorage.removeItem(key);
      }
    } catch {}
  },
};

export default function SplitsTab() {
  const profile = useProfileStore((state) => state.profile);
  const [splits, setSplits] = useState<any[]>([]);
  const [currentSplitId, setCurrentSplitId] = useState<string | null>(null);
  const [splitStartDate, setSplitStartDate] = useState<string | null>(null);
  const [splitEndDate, setSplitEndDate] = useState<string | null>(null);
  const [activeRuns, setActiveRuns] = useState<any[]>([]);
  const [showSetModal, setShowSetModal] = useState(false);
  const [pendingSplit, setPendingSplit] = useState<any>(null);
  const [pendingRotationLength, setPendingRotationLength] = useState<number | null>(null);
  const [calendarDate, setCalendarDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  // number of rotations is auto-calculated for rotation-mode when scheduling
  // UX: optional duration in weeks (can be fractional). If null, duration is auto-calculated from start/end.
  const [durationWeeks, setDurationWeeks] = useState<number | null>(4);
  const [endManuallyEdited, setEndManuallyEdited] = useState(false);
  const iosInlineSupported = Platform.OS === 'ios' && parseFloat(String(Platform.Version)) >= 14;
  const toDateOnly = (d: Date) => d.toISOString().slice(0, 10);

  const showValidationToast = (msg: string) => {
    if (Platform.OS === 'android' && ToastAndroid && ToastAndroid.show) {
      ToastAndroid.show(msg, ToastAndroid.SHORT);
    } else {
      Alert.alert('Validation', msg);
    }
  };

  // computed weeks between start and end (inclusive)
  const computedWeeks = (() => {
    if (!calendarDate || !endDate) return 0;
    const msPerDay = 24 * 60 * 60 * 1000;
    const s = new Date(calendarDate);
    s.setHours(0, 0, 0, 0);
    const e = new Date(endDate);
    e.setHours(0, 0, 0, 0);
    const diffDays = Math.floor((e.getTime() - s.getTime()) / msPerDay) + 1;
    if (diffDays <= 0) return 0;
    return Math.max(1, Math.ceil(diffDays / 7));
  })();

  const endBeforeStart = !!endDate && new Date(endDate).setHours(0, 0, 0, 0) < new Date(calendarDate).setHours(0, 0, 0, 0);
  // initial load of active runs handled by fetchActiveRun() in the profile effect below


  // Open modal to set current split
  const handleSetCurrentSplit = async (split: any) => {
    setPendingSplit(split);
    // If rotation mode, fetch split_days to determine rotation length (number of slots)
    if (split?.mode === 'rotation') {
      try {
        const { data: sdData, error: sdError } = await supabase
          .from('split_days')
          .select('*')
          .eq('split_id', split.id)
          .order('order_index', { ascending: true });
        if (!sdError && sdData) {
          // Determine length from max order_index or count
          const withIndex = sdData.filter((sd: any) => sd.order_index !== null && sd.order_index !== undefined);
          if (withIndex.length > 0) {
            const maxIndex = Math.max(...withIndex.map((sd: any) => sd.order_index ?? 0));
            setPendingRotationLength(maxIndex + 1);
          } else if (sdData.length > 0) {
            setPendingRotationLength(sdData.length);
          } else {
            setPendingRotationLength(3);
          }
        } else {
          setPendingRotationLength(3);
        }
      } catch (e) {
        setPendingRotationLength(3);
      }
    } else {
      setPendingRotationLength(null);
    }
    // If there is an existing active run for this split, prefill with those dates
    const run = activeRuns.find(r => r.split_id === split.id);
    if (run && run.start_date) {
      const s = new Date(run.start_date);
      setCalendarDate(s);
      if (run.end_date) {
        const e = new Date(run.end_date);
        setEndDate(e);
        const msPerDay = 24 * 60 * 60 * 1000;
        const s0 = new Date(s);
        s0.setHours(0, 0, 0, 0);
        const e0 = new Date(e);
        e0.setHours(0, 0, 0, 0);
        const diffDays = Math.floor((e0.getTime() - s0.getTime()) / msPerDay) + 1;
        const weeks = Math.max(1, Math.ceil(diffDays / 7));
        setDurationWeeks(weeks);
      } else {
        setEndDate(null);
        setDurationWeeks(-1);
      }
      setEndManuallyEdited(false);
      setShowSetModal(true);
      return;
    }

    // Otherwise use sensible defaults
    const defaultStart = getNextMonday(new Date());
    setCalendarDate(defaultStart);
  const defaultWeeks = 4;
  setDurationWeeks(defaultWeeks);
    setEndDate(getEndDateForWeeks(defaultStart, defaultWeeks));
    setEndManuallyEdited(false);
  // reset rotations placeholder
    setShowSetModal(true);
  };

  // Open edit split modal
  const handleEditSplit = async (split: any) => {
    setEditingSplit(split);
    setEditSplitTab(0);
    
    // Load current split days
    const { data: splitDaysData } = await supabase
      .from('split_days')
      .select('*')
      .eq('split_id', split.id)
      .order('weekday', { ascending: true })
      .order('order_index', { ascending: true });
    
    if (split.mode === 'week') {
      // Populate weekdays array
      const weekdays = new Array(7).fill(null);
      splitDaysData?.forEach(sd => {
        if (sd.weekday !== null) {
          weekdays[sd.weekday] = sd.day_id;
        }
      });
      setEditSplitWeekdays(weekdays);
    } else {
      // For rotation mode, populate selected days and ensure the array length matches the rotation length
      const selectedDays = splitDaysData?.map(sd => sd.day_id) || [];
      const maxIndex = splitDaysData && splitDaysData.length > 0 ? Math.max(...splitDaysData.map((sd: any) => sd.order_index ?? 0)) : -1;
      const length = maxIndex >= 0 ? maxIndex + 1 : 3;
      const filled = Array.from({ length }).map((_, i) => selectedDays[i] ?? null);
      setSelectedDaysForNewSplit(filled);
      setEditSplitRotationLength(length);
      setEditSplitRotationInput(String(length));
    }
    
    // Load current schedule if there is an active run for this split
    const run = activeRuns.find((r: any) => r.split_id === split.id);
    if (run && run.start_date) {
      setEditSplitStartDate(new Date(run.start_date));
      setEditSplitEndDate(run.end_date ? new Date(run.end_date) : null);
    } else {
      setEditSplitStartDate(getNextMonday(new Date()));
      setEditSplitEndDate(getEndDateForWeeks(getNextMonday(new Date()), 4));
    }
    
    setShowEditModal(true);
  };

  // Confirm setting current split with date and weeks/rotations
  const handleConfirmSetCurrentSplit = async () => {
    if (!pendingSplit) return;
    try {
      // Prevent overlaps: compute intended start/end (ISO dates) and ensure no active run overlaps
      const intendedStart = calendarDate ? toDateOnly(calendarDate) : null;
      const intendedEnd = endDate ? toDateOnly(endDate) : null;
      // If any existing active run (for other splits) overlaps, block scheduling
      const overlapping = activeRuns.some(r => r.split_id !== pendingSplit.id && rangesOverlap(r.start_date, r.end_date, intendedStart, intendedEnd));
      if (overlapping) {
        showValidationToast('Scheduling would overlap an existing split run. Pick different dates.');
        return;
      }
      setCurrentSplitId(pendingSplit.id);
      setSplitStartDate(calendarDate.toISOString());
      if (endDate) setSplitEndDate(endDate.toISOString());
      await safeStorage.setItem('currentSplitId', pendingSplit.id);
      await safeStorage.setItem('splitStartDate', calendarDate.toISOString());
      if (endDate) await safeStorage.setItem('splitEndDate', endDate.toISOString());
      if (pendingSplit.mode === 'week') {
        // calculate number of weeks from start (calendarDate) to endDate (inclusive)
        const msPerDay = 24 * 60 * 60 * 1000;
        let weeks = '0';
        if (endDate) {
          const s = new Date(calendarDate);
          s.setHours(0, 0, 0, 0);
          const e = new Date(endDate);
          e.setHours(0, 0, 0, 0);
          const diffDays = Math.floor((e.getTime() - s.getTime()) / msPerDay) + 1;
          weeks = String(Math.max(1, Math.ceil(diffDays / 7)));
        } else {
          // Forever preset - set a large number of weeks or handle differently
          weeks = '999';
        }
        await safeStorage.setItem('splitNumWeeks', weeks);
        await safeStorage.removeItem('splitNumRotations');
        // Persist to split_runs
        if (profile?.id) {
          await supabase.from('split_runs').insert({
            split_id: pendingSplit.id,
            user_id: profile.id,
            start_date: toDateOnly(calendarDate),
            end_date: endDate ? toDateOnly(endDate) : null,
            num_weeks: endDate ? parseInt(weeks, 10) || 1 : null,
            num_rotations: null,
            active: true,
          });
          await fetchActiveRun();
          await fetchActiveRun();
        }
      } else {
        // For rotation mode, compute number of rotations from calendarDate->endDate range and rotation length
        let computedRotations = 1;
        if (calendarDate && endDate && pendingRotationLength && pendingRotationLength > 0) {
          const msPerDay = 24 * 60 * 60 * 1000;
          const s = new Date(calendarDate);
          s.setHours(0, 0, 0, 0);
          const e = new Date(endDate);
          e.setHours(0, 0, 0, 0);
          const diffDays = Math.floor((e.getTime() - s.getTime()) / msPerDay) + 1;
          computedRotations = Math.max(0, Math.floor(diffDays / pendingRotationLength));
        }
        await safeStorage.setItem('splitNumRotations', String(computedRotations));
        await safeStorage.removeItem('splitNumWeeks');
        // Persist to split_runs
        if (profile?.id) {
          await supabase.from('split_runs').insert({
            split_id: pendingSplit.id,
            user_id: profile.id,
            start_date: toDateOnly(calendarDate),
            end_date: endDate ? toDateOnly(endDate) : null,
            num_weeks: null,
            num_rotations: computedRotations || 1,
            active: true,
          });
          await fetchActiveRun();
          await fetchActiveRun();
        }
      }
    } finally {
      setShowSetModal(false);
      setPendingSplit(null);
      setShowStartPicker(false);
      setShowEndPicker(false);
    }
  };

  // Start the current split (set start date)
  const handleStartSplit = async () => {
    if (!currentSplitId) return;
    const now = new Date().toISOString();
    setSplitStartDate(now);
    await safeStorage.setItem('splitStartDate', now);
  };
  const [loading, setLoading] = useState(false);
  const [newSplit, setNewSplit] = useState({ name: '', mode: 'week' });
  const [adding, setAdding] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedDaysForNewSplit, setSelectedDaysForNewSplit] = useState<(string | null)[]>([]);
  const [newSplitWeekdays, setNewSplitWeekdays] = useState<(string | null)[]>(new Array(7).fill(null));
  const [newSplitRotationLength, setNewSplitRotationLength] = useState<number>(3);
  const newSplitRotationRef = useRef<any>(null);
  const [pendingRotationIndex, setPendingRotationIndex] = useState<number | null>(null);
  const [newSplitRotationInput, setNewSplitRotationInput] = useState<string>(String(3));
  const [newRotationFocused, setNewRotationFocused] = useState(false);
  const [newSplitStartDate, setNewSplitStartDate] = useState<Date | null>(null);
  const [newSplitEndDate, setNewSplitEndDate] = useState<Date | null>(null);
  const [showNewSplitStartPicker, setShowNewSplitStartPicker] = useState(false);
  const [showNewSplitEndPicker, setShowNewSplitEndPicker] = useState(false);
  const [newSplitDurationWeeks, setNewSplitDurationWeeks] = useState<number | null>(null);
  const [newSplitTab, setNewSplitTab] = useState(0);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingSplit, setEditingSplit] = useState<any>(null);
  const [editSplitTab, setEditSplitTab] = useState(0);
  const [editSplitWeekdays, setEditSplitWeekdays] = useState<(string | null)[]>(new Array(7).fill(null));
  const [editSplitStartDate, setEditSplitStartDate] = useState<Date>(new Date());
  const [editSplitEndDate, setEditSplitEndDate] = useState<Date | null>(null);
  const [editSplitRotationLength, setEditSplitRotationLength] = useState<number>(3);
  const [editSplitRotationInput, setEditSplitRotationInput] = useState<string>(String(3));
  const editSplitRotationRef = useRef<any>(null);
  const [editRotationFocused, setEditRotationFocused] = useState(false);
  const [showEditStartPicker, setShowEditStartPicker] = useState(false);
  const [showEditEndPicker, setShowEditEndPicker] = useState(false);
  const [editSplitDurationWeeks, setEditSplitDurationWeeks] = useState<number | null>(null);
  const [selectedSplitId, setSelectedSplitId] = useState<string | null>(null);
  const [splitDays, setSplitDays] = useState<any[]>([]);
  const [days, setDays] = useState<any[]>([]);
  const [linking, setLinking] = useState(false);
  // For week mode: modal to pick weekday
  const [showWeekdayModal, setShowWeekdayModal] = useState(false);
  const [pendingDayId, setPendingDayId] = useState<string | null>(null);
  // Track whether weekday modal was opened from Add New Split flow
  const [weekdayModalFromAdd, setWeekdayModalFromAdd] = useState(false);
  // Track whether weekday modal was opened from Edit Split flow
  const [weekdayModalFromEdit, setWeekdayModalFromEdit] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  // Helper to fetch active run after scheduling
  const fetchActiveRun = async () => {
    if (!profile || !profile.id) return;
    const { data, error } = await supabase
      .from('split_runs')
      .select('*')
      .eq('user_id', profile.id)
      .eq('active', true)
      .order('created_at', { ascending: false });
    if (!error && data) {
      setActiveRuns(data || []);
      if (data.length > 0) {
        const run: any = data[0];
        setCurrentSplitId(run.split_id || null);
        setSplitStartDate(run.start_date ? new Date(run.start_date).toISOString() : null);
        setSplitEndDate(run.end_date ? new Date(run.end_date).toISOString() : null);
      } else {
        setCurrentSplitId(null);
        setSplitStartDate(null);
        setSplitEndDate(null);
      }
    }
  };

  // Return true if the given split id is the current active run and today's date
  // falls within the run's start/end range. If end is null treat as ongoing.
  const rangesOverlap = (s1: string | null, e1: string | null, s2: string | null, e2: string | null) => {
    if (!s1 || !s2) return true; // conservative
    const a1 = new Date(s1).setHours(0,0,0,0);
    const b1 = e1 ? new Date(e1).setHours(0,0,0,0) : null;
    const a2 = new Date(s2).setHours(0,0,0,0);
    const b2 = e2 ? new Date(e2).setHours(0,0,0,0) : null;
    if (b1 && b2) return !(b1 < a2 || b2 < a1);
    if (!b1 && !b2) return true;
    if (!b1 && b2) return !(b2 < a1);
    if (b1 && !b2) return !(b1 < a2);
    return true;
  };

  const isSplitCurrentlyActive = (splitId: string) => {
    const run = activeRuns.find(r => r.split_id === splitId);
    if (!run) return false;
    const today = new Date();
    today.setHours(0,0,0,0);
    if (!run.start_date) return true;
    const s = new Date(run.start_date);
    s.setHours(0,0,0,0);
    if (today.getTime() < s.getTime()) return false;
    if (!run.end_date) return true;
    const e = new Date(run.end_date);
    e.setHours(0,0,0,0);
    if (today.getTime() > e.getTime()) return false;
    return true;
  };

  // Reusable schedule editor used by both Add and Edit modals
  const ScheduleEditor = ({
    mode,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    showStartPicker,
    setShowStartPicker,
    showEndPicker,
    setShowEndPicker,
    durationWeeks,
    setDurationWeeks,
    rotationLength,
  }: any) => {
    const computedWeeks = (() => {
      if (!startDate || !endDate) return 0;
      const msPerDay = 24 * 60 * 60 * 1000;
      const s = new Date(startDate);
      s.setHours(0, 0, 0, 0);
      const e = new Date(endDate);
      e.setHours(0, 0, 0, 0);
      const diffDays = Math.floor((e.getTime() - s.getTime()) / msPerDay) + 1;
      if (diffDays <= 0) return 0;
      return Math.max(1, Math.ceil(diffDays / 7));
    })();

    const endBeforeStart = !!endDate && new Date(endDate).setHours(0, 0, 0, 0) < new Date(startDate).setHours(0, 0, 0, 0);

    return (
      <View>
        <Text style={{ marginBottom: 4, fontWeight: '500' }}>Start Date:</Text>
        <TouchableOpacity
          style={{ padding: 10, backgroundColor: '#eee', borderRadius: 6, marginBottom: 8 }}
          onPress={() => { setShowStartPicker((v: boolean) => !v); setShowEndPicker(false); }}
        >
          <Text>{startDate ? startDate.toDateString() : 'Select start date'}</Text>
        </TouchableOpacity>
        {showStartPicker && (
          <DateTimePicker
            value={startDate ?? getNextMonday(new Date())}
            mode="date"
            display={Platform.OS === 'ios' ? (iosInlineSupported ? 'inline' : 'spinner') : 'calendar'}
            // @ts-ignore: iOS specific prop
            preferredDatePickerStyle={iosInlineSupported ? 'inline' : undefined}
            // @ts-ignore: iOS specific prop
            themeVariant={Platform.OS === 'ios' ? 'light' : undefined}
            onChange={(event, date) => {
              if (Platform.OS === 'android') setShowStartPicker(false);
              if (date) {
                setStartDate(date);
                if (durationWeeks !== null && durationWeeks !== -1) {
                  const days = durationWeeks * 7 - 1;
                  setEndDate(addDaysFloat(date, days));
                }
              }
            }}
            style={{ backgroundColor: '#fff', marginBottom: 8, width: '100%', maxWidth: 320, height: iosInlineSupported ? 200 : undefined }}
          />
        )}

        <Text style={{ marginBottom: 4, fontWeight: '500' }}>End Date:</Text>
        <TouchableOpacity
          style={{ padding: 10, backgroundColor: '#eee', borderRadius: 6, marginBottom: 8 }}
          onPress={() => { setShowEndPicker((v: boolean) => !v); setShowStartPicker(false); }}
        >
          <Text>{endDate ? endDate.toDateString() : 'Select end date'}</Text>
        </TouchableOpacity>
        {showEndPicker && (
          <DateTimePicker
            value={endDate ?? startDate ?? getNextMonday(new Date())}
            mode="date"
            display={Platform.OS === 'ios' ? (iosInlineSupported ? 'inline' : 'spinner') : 'calendar'}
            // @ts-ignore: iOS specific prop
            preferredDatePickerStyle={iosInlineSupported ? 'inline' : undefined}
            // @ts-ignore: iOS specific prop
            themeVariant={Platform.OS === 'ios' ? 'light' : undefined}
            onChange={(event, date) => {
              if (Platform.OS === 'android') setShowEndPicker(false);
              if (date) {
                setEndDate(date);
                setDurationWeeks(null);
              }
            }}
            style={{ backgroundColor: '#fff', marginBottom: 8, width: '100%', maxWidth: 320, height: iosInlineSupported ? 200 : undefined }}
          />
        )}

        <Text style={{ fontWeight: 'bold', marginBottom: 4 }}>Duration (Weeks or Rotations):</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
          <TextInput
            placeholder="e.g. 4 or 4.5 (leave blank to auto-calc)"
            style={[styles.input, { flex: 1, marginRight: 8 }]}
            value={durationWeeks === null || durationWeeks === -1 ? '' : String(durationWeeks)}
            onChangeText={(text) => {
              if (text.trim() === '') {
                setDurationWeeks(null);
                return;
              }
              const parsed = parseFloat(text);
              if (!isNaN(parsed)) {
                setDurationWeeks(parsed);
                const baseStart = startDate ?? getNextMonday(new Date());
                const days = parsed * 7 - 1;
                setEndDate(addDaysFloat(baseStart, days));
                if (!startDate) setStartDate(baseStart);
              }
            }}
            keyboardType="numeric"
          />
          <Text style={{ marginHorizontal: 6, color: '#666', fontWeight: '600' }}>or</Text>
          <TouchableOpacity
            style={{ paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, backgroundColor: durationWeeks === -1 ? '#007AFF' : '#e0e0e0' }}
            onPress={() => {
              if (durationWeeks === -1) {
                setDurationWeeks(null);
              } else {
                setDurationWeeks(-1);
                setEndDate(null);
                if (!startDate) setStartDate(getNextMonday(new Date()));
              }
            }}
          >
            <Text style={{ color: durationWeeks === -1 ? '#fff' : '#333', fontWeight: '700' }}>Forever</Text>
          </TouchableOpacity>
        </View>
        {endBeforeStart && <Text style={{ color: 'red', marginBottom: 8 }}>End date must be the same or after start date.</Text>}

        {/* rotation-mode shows no explicit rotations input here; rotations are derived from start/end and rotation length when scheduling */}
      </View>
    );
  };

  // Fetch all days for the user
  const fetchDays = async () => {
    if (!profile || !profile.id) return;
    const { data, error } = await supabase
      .from('days')
      .select('*')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: true });
    if (!error && data) {
      setDays(data);
    }
  };

  // Fetch all split_days for a split
  const fetchSplitDays = async (splitId: string | null) => {
    if (!splitId) return;
    const { data, error } = await supabase
      .from('split_days')
      .select('*')
      .eq('split_id', splitId)
      .order('weekday', { ascending: true })
      .order('order_index', { ascending: true });
    if (!error && data) {
      setSplitDays(data);
    }
  };

  // Add a new split with days and schedule it
  const handleAddSplit = async () => {
    if (!profile || !profile.id) {
      Alert.alert('Error', 'You must be signed in to create a split');
      return;
    }
    if (!newSplit.name || !newSplit.name.trim()) {
      showValidationToast('Split name is required');
      return;
    }
    setAdding(true);
    
    try {
      // Create the split
      const { data: splitData, error: splitError } = await supabase
        .from('splits')
        .insert([{ name: newSplit.name.trim(), mode: newSplit.mode, user_id: profile.id }])
        .select();
      
      if (splitError) {
        Alert.alert('Error', splitError.message);
        return;
      }
      
      const newSplitId = splitData[0].id;
      
      // Add days to the split based on mode
      if (newSplit.mode === 'week') {
        // For weekly mode, assign days to weekdays
        const splitDayInserts = newSplitWeekdays
          .map((dayId, weekday) => dayId ? { split_id: newSplitId, day_id: dayId, weekday, order_index: null } : null)
          .filter(Boolean);
        
        if (splitDayInserts.length > 0) {
          const { error: daysError } = await supabase
            .from('split_days')
            .insert(splitDayInserts);
          
          if (daysError) {
            Alert.alert('Error', daysError.message);
            return;
          }
        }
      } else {
        // For rotation mode, assign days in order
        const splitDayInserts = selectedDaysForNewSplit.map((dayId, index) => ({
          split_id: newSplitId,
          day_id: dayId,
          weekday: null,
          order_index: index,
        }));
        
        if (splitDayInserts.length > 0) {
          const { error: daysError } = await supabase
            .from('split_days')
            .insert(splitDayInserts);
          
          if (daysError) {
            Alert.alert('Error', daysError.message);
            return;
          }
        }
      }
      
      // Schedule the split (create split_run) only if a start date was provided
  if (newSplitStartDate) {
        if (newSplit.mode === 'week') {
          const msPerDay = 24 * 60 * 60 * 1000;
          let weeks = '0';
          if (newSplitEndDate) {
            const s = new Date(newSplitStartDate);
            s.setHours(0, 0, 0, 0);
            const e = new Date(newSplitEndDate);
            e.setHours(0, 0, 0, 0);
            const diffDays = Math.floor((e.getTime() - s.getTime()) / msPerDay) + 1;
            weeks = String(Math.max(1, Math.ceil(diffDays / 7)));
          } else {
            weeks = '999'; // Forever
          }

          // Check overlap before inserting
          const intendedStart = toDateOnly(newSplitStartDate);
          const intendedEnd = newSplitEndDate ? toDateOnly(newSplitEndDate) : null;
          const overlapping = activeRuns.some(r => rangesOverlap(r.start_date, r.end_date, intendedStart, intendedEnd));
          if (overlapping) {
            showValidationToast('Scheduling would overlap an existing split run. Pick different dates.');
          } else {
              await supabase.from('split_runs').insert({
            split_id: newSplitId,
            user_id: profile.id,
            start_date: toDateOnly(newSplitStartDate),
            end_date: newSplitEndDate ? toDateOnly(newSplitEndDate) : null,
            num_weeks: newSplitEndDate ? parseInt(weeks, 10) || 1 : null,
            num_rotations: null,
            active: true,
              });
              await fetchActiveRun();
          }
        } else {
          // For rotation-mode, compute number of rotations if an end date was provided
          let computedRotations = 1;
          if (newSplitStartDate && newSplitEndDate && newSplitRotationLength && newSplitRotationLength > 0) {
            const msPerDay = 24 * 60 * 60 * 1000;
            const s = new Date(newSplitStartDate);
            s.setHours(0, 0, 0, 0);
            const e = new Date(newSplitEndDate);
            e.setHours(0, 0, 0, 0);
            const diffDays = Math.floor((e.getTime() - s.getTime()) / msPerDay) + 1;
            computedRotations = Math.max(0, Math.floor(diffDays / newSplitRotationLength));
          }
          // Check overlap before inserting rotation-mode run
          const intendedStart = toDateOnly(newSplitStartDate);
          const intendedEnd = newSplitEndDate ? toDateOnly(newSplitEndDate) : null;
          const overlapping = activeRuns.some(r => rangesOverlap(r.start_date, r.end_date, intendedStart, intendedEnd));
          if (overlapping) {
            showValidationToast('Scheduling would overlap an existing split run. Pick different dates.');
          } else {
            await supabase.from('split_runs').insert({
            split_id: newSplitId,
            user_id: profile.id,
            start_date: toDateOnly(newSplitStartDate),
            end_date: newSplitEndDate ? toDateOnly(newSplitEndDate) : null,
            num_weeks: null,
            num_rotations: computedRotations || 1,
            active: true,
            });
            await fetchActiveRun();
          }
        }
      }
      
      // Reset form and close modal
    setNewSplit({ name: '', mode: 'week' });
  setSelectedDaysForNewSplit([]);
      setNewSplitWeekdays(new Array(7).fill(null));
    setNewSplitStartDate(null);
    setNewSplitEndDate(null);
    setNewSplitDurationWeeks(null);
      setNewSplitTab(0);
      setShowAddModal(false);
      fetchSplits();
      fetchActiveRun();
      
    } catch (error) {
      Alert.alert('Error', 'Failed to create split');
    } finally {
      setAdding(false);
    }
  };

  // Save edited split
  const handleSaveEditSplit = async () => {
    if (!editingSplit || !profile?.id) return;
    if (!editingSplit?.name || !editingSplit.name.trim()) {
      showValidationToast('Split name is required');
      return;
    }
    setAdding(true);
    
    try {
      // Update split basic info
      const { error: splitError } = await supabase
        .from('splits')
        .update({ 
          name: editingSplit.name.trim(), 
          mode: editingSplit.mode 
        })
        .eq('id', editingSplit.id);
      
      if (splitError) {
        Alert.alert('Error', splitError.message);
        return;
      }
      
      // Clear existing split days
      await supabase
        .from('split_days')
        .delete()
        .eq('split_id', editingSplit.id);
      
      // Add new split days
      if (editingSplit.mode === 'week') {
        const splitDayInserts = editSplitWeekdays
          .map((dayId, weekday) => dayId ? { split_id: editingSplit.id, day_id: dayId, weekday, order_index: null } : null)
          .filter(Boolean);
        
        if (splitDayInserts.length > 0) {
          const { error: daysError } = await supabase
            .from('split_days')
            .insert(splitDayInserts);
          
          if (daysError) {
            Alert.alert('Error', daysError.message);
            return;
          }
        }
      } else {
        const splitDayInserts = selectedDaysForNewSplit.map((dayId, index) => ({
          split_id: editingSplit.id,
          day_id: dayId,
          weekday: null,
          order_index: index,
        }));
        
        if (splitDayInserts.length > 0) {
          const { error: daysError } = await supabase
            .from('split_days')
            .insert(splitDayInserts);
          
          if (daysError) {
            Alert.alert('Error', daysError.message);
            return;
          }
        }
      }
      
      // Update schedule if this is the active split
      if (currentSplitId === editingSplit.id) {
        if (editingSplit.mode === 'week') {
          const msPerDay = 24 * 60 * 60 * 1000;
          let weeks = '0';
          if (editSplitEndDate) {
            const s = new Date(editSplitStartDate);
            s.setHours(0, 0, 0, 0);
            const e = new Date(editSplitEndDate);
            e.setHours(0, 0, 0, 0);
            const diffDays = Math.floor((e.getTime() - s.getTime()) / msPerDay) + 1;
            weeks = String(Math.max(1, Math.ceil(diffDays / 7)));
          } else {
            weeks = '999'; // Forever
          }
          
          // Check overlap before inserting updated run
          const intendedStart = toDateOnly(editSplitStartDate);
          const intendedEnd = editSplitEndDate ? toDateOnly(editSplitEndDate) : null;
          const overlapping = activeRuns.some(r => r.split_id !== editingSplit.id && rangesOverlap(r.start_date, r.end_date, intendedStart, intendedEnd));
          if (overlapping) {
            showValidationToast('Scheduling would overlap an existing split run. Pick different dates.');
          } else {
            await supabase.from('split_runs').insert({
            split_id: editingSplit.id,
            user_id: profile.id,
            start_date: toDateOnly(editSplitStartDate),
            end_date: editSplitEndDate ? toDateOnly(editSplitEndDate) : null,
            num_weeks: editSplitEndDate ? parseInt(weeks, 10) || 1 : null,
            num_rotations: null,
            active: true,
            });
            await fetchActiveRun();
          }
        } else {
          // For rotation-mode when editing an active split, compute rotations if end date provided
          let computedRotations = 1;
          if (editSplitStartDate && editSplitEndDate && editSplitRotationLength && editSplitRotationLength > 0) {
            const msPerDay = 24 * 60 * 60 * 1000;
            const s = new Date(editSplitStartDate);
            s.setHours(0, 0, 0, 0);
            const e = new Date(editSplitEndDate);
            e.setHours(0, 0, 0, 0);
            const diffDays = Math.floor((e.getTime() - s.getTime()) / msPerDay) + 1;
            computedRotations = Math.max(0, Math.floor(diffDays / editSplitRotationLength));
          }
          // Check overlap before inserting rotation-mode updated run
          const intendedStart = toDateOnly(editSplitStartDate);
          const intendedEnd = editSplitEndDate ? toDateOnly(editSplitEndDate) : null;
          const overlapping = activeRuns.some(r => r.split_id !== editingSplit.id && rangesOverlap(r.start_date, r.end_date, intendedStart, intendedEnd));
          if (overlapping) {
            showValidationToast('Scheduling would overlap an existing split run. Pick different dates.');
          } else {
            await supabase.from('split_runs').insert({
            split_id: editingSplit.id,
            user_id: profile.id,
            start_date: toDateOnly(editSplitStartDate),
            end_date: editSplitEndDate ? toDateOnly(editSplitEndDate) : null,
            num_weeks: null,
            num_rotations: computedRotations || 1,
            active: true,
            });
            await fetchActiveRun();
          }
        }
      }
      
      // Reset and close
      setEditingSplit(null);
      setEditSplitTab(0);
      setEditSplitWeekdays(new Array(7).fill(null));
  setSelectedDaysForNewSplit([]);
      setShowEditModal(false);
      fetchSplits();
      fetchActiveRun();
      
    } catch (error) {
      Alert.alert('Error', 'Failed to update split');
    } finally {
      setAdding(false);
    }
  };

  // Delete a split
  const handleDeleteSplit = async (splitId: string) => {
    const { error } = await supabase.from('splits').delete().eq('id', splitId);
    if (error) {
      Alert.alert('Error', error.message);
    } else {
      if (selectedSplitId === splitId) setSelectedSplitId(null);
      fetchSplits();
    }
  };

  // Link a day to a split (for rotation mode)
  const handleLinkDay = async (dayId: string, split: any) => {
    if (!selectedSplitId) return;
    setLinking(true);
    let payload: any = { split_id: selectedSplitId, day_id: dayId };
    if (split.mode === 'rotation') payload.order_index = splitDays.length;
    const { error } = await supabase.from('split_days').insert(payload);
    setLinking(false);
    if (error) {
      Alert.alert('Error', error.message);
    } else {
      fetchSplitDays(selectedSplitId);
    }
  };

  // Link a day to a split for a specific weekday (for week mode)
  const doLinkDay = async (dayId: string, split: any, weekday: number) => {
    if (!selectedSplitId) return;
    setLinking(true);
    let payload: any = { split_id: selectedSplitId, day_id: dayId, weekday };
    const { error } = await supabase.from('split_days').insert(payload);
    setLinking(false);
    setShowWeekdayModal(false);
    setPendingDayId(null);
    if (error) {
      Alert.alert('Error', error.message);
    } else {
      fetchSplitDays(selectedSplitId);
    }
  };

  // Remove day from split
  const handleRemoveSplitDay = async (splitDayId: string) => {
    const { error } = await supabase.from('split_days').delete().eq('id', splitDayId);
    if (error) {
      Alert.alert('Error', error.message);
    } else if (selectedSplitId) {
      fetchSplitDays(selectedSplitId);
    }
  };

  // Fetch all splits for the user
  const fetchSplits = async () => {
    setLoading(true);
    if (!profile || !profile.id) return;
    const { data, error } = await supabase
      .from('splits')
      .select('*')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: true });
    if (!error && data) {
      setSplits(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (profile && profile.id) {
      fetchSplits();
      fetchDays();
      fetchActiveRun();
    }
  }, [profile?.id]);

  useEffect(() => {
    if (selectedSplitId) {
      fetchSplitDays(selectedSplitId);
    } else {
      setSplitDays([]);
    }
  }, [selectedSplitId]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Splits</Text>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => setShowAddModal(true)}
        >
          <Text style={styles.addButtonText}>Add New Split</Text>
        </TouchableOpacity>
      </View>
      {loading ? (
        <Text>Loading...</Text>
      ) : (
        <FlatList
          data={splits}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => setSelectedSplitId(prev => prev === item.id ? null : item.id)}
              style={styles.splitBox}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={styles.splitName}>{item.name}</Text>
                  <EditPencil onPress={() => handleEditSplit(item)} accessibilityLabel={`Edit ${item.name}`} />
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={styles.modeBadge}>
                    <Text style={styles.badgeText}>{item.mode === 'week' ? 'Weekly' : 'Rotation'}</Text>
                  </View>
                  {isSplitCurrentlyActive(item.id) && (
                    <View style={styles.currentBadge}>
                      <Text style={styles.badgeText}>Current</Text>
                    </View>
                  )}
                </View>
              </View>

              <View style={styles.splitFooter}>
                <View style={{ flex: 1 }}>
                  {(() => {
                    const run = activeRuns.find(r => r.split_id === item.id);
                    if (run && run.start_date) {
                      return (
                        <Text style={{ fontStyle: 'italic', color: '#666' }}>
                          {`Start: ${new Date(run.start_date).toLocaleDateString()}`}
                          {run.end_date ? `  •  End: ${new Date(run.end_date).toLocaleDateString()}` : '  •  End: Forever'}
                        </Text>
                      );
                    }
                    return null;
                  })()}
                  <TouchableOpacity onPress={() => handleSetCurrentSplit(item)}>
                    {(() => {
                      const run = activeRuns.find(r => r.split_id === item.id);
                      return <Text style={styles.linkText}>{run && run.start_date ? 'Change Timeframe' : 'Schedule'}</Text>;
                    })()}
                  </TouchableOpacity>
                </View>

                <View style={styles.removeWrapper}>
                  <RemoveButton onPress={() => { setDeleteTargetId(item.id); setShowDeleteConfirm(true); }} label="Remove" accessibilityLabel={`Remove ${item.name}`} textStyle={styles.removeTextStyle} />
                </View>
                {/* Modal for setting current split with calendar and weeks/rotations */}
                <Modal
                  visible={showSetModal}
                  transparent
                  animationType="slide"
                  onRequestClose={() => setShowSetModal(false)}
                >
                  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.3)' }}>
                    <View style={{ backgroundColor: '#fff', padding: 16, borderRadius: 12, width: '90%', maxWidth: 420, maxHeight: '90%' }}>
                      <ScrollView contentContainerStyle={{ paddingBottom: 12 }}>
                        <Text style={{ fontWeight: 'bold', fontSize: 18, marginBottom: 12 }}>Schedule Split</Text>

                        <ScheduleEditor
                          mode={pendingSplit?.mode}
                          startDate={calendarDate}
                          setStartDate={setCalendarDate}
                          endDate={endDate}
                          setEndDate={setEndDate}
                          showStartPicker={showStartPicker}
                          setShowStartPicker={setShowStartPicker}
                          showEndPicker={showEndPicker}
                          setShowEndPicker={setShowEndPicker}
                          durationWeeks={durationWeeks}
                          setDurationWeeks={setDurationWeeks}
                          rotationLength={pendingRotationLength}
                        />

                        {/* removed display of number of rotations here — it's calculated when scheduling and saved to the DB */}
                        <View style={{ marginTop: 8 }}>
                          <ModalButtons
                            leftLabel="Cancel"
                            rightLabel="Schedule"
                            onLeftPress={() => setShowSetModal(false)}
                            onRightPress={handleConfirmSetCurrentSplit}
                            leftColor="#e0e0e0"
                            rightColor="#007AFF"
                            leftTextColor="#333"
                            rightTextColor="#fff"
                            rightDisabled={pendingSplit?.mode === 'week' && endBeforeStart}
                          />
                        </View>
                      </ScrollView>
                    </View>
                  </View>
                </Modal>
              </View>
              {/* timeframe is shown in the footer when scheduled; no duplicate block here */}
              {selectedSplitId === item.id && (
                <View style={styles.splitDaysSection}>
                  {item.mode === 'week' ? (
                    <>
                      <Text style={styles.splitDaysTitle}>Week Schedule</Text>
                      {WEEKDAYS.map((wd, idx) => {
                        const splitDay = splitDays.find(sd => sd.weekday === idx);
                        const assignedDay = splitDay ? days.find(d => d.id === splitDay.day_id) : null;
                        return (
                          <View key={wd} style={styles.splitDayBox}>
                            <Text style={{ width: 60 }}>{wd}:</Text>
                            <View style={{ paddingVertical: 8, paddingHorizontal: 12, borderRadius: 6 }}>
                              <Text style={{ color: '#333' }}>{assignedDay ? assignedDay.name : 'Rest'}</Text>
                            </View>
                          </View>
                        );
                      })}
                    </>
                  ) : (
                    <>
                      <Text style={styles.splitDaysTitle}>Rotation Days</Text>
                      {splitDays.map((sd, index) => {
                        const day = days.find(d => d.id === sd.day_id);
                        return (
                          <View key={sd.id} style={styles.splitDayBox}>
                            <Text>{`Day ${(sd.order_index ?? index) + 1}:`} {day?.name || '—'}</Text>
                          </View>
                        );
                      })}
                    </>
                  )}

                </View>
              )}
            </TouchableOpacity>
          )}
        />
      )}

      {/* Add New Split Modal */}
      <Modal
        visible={showAddModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.3)' }}>
          <View style={{ backgroundColor: '#fff', padding: 20, borderRadius: 12, width: '90%', maxWidth: 420, maxHeight: '90%' }}>
            <ScrollView contentContainerStyle={{ paddingBottom: 16 }}>
              <Text style={{ fontWeight: 'bold', fontSize: 18, marginBottom: 16, textAlign: 'center' }}>Add New Split</Text>

              {/* Tab Navigation */}
              <View style={{ flexDirection: 'row', marginBottom: 20, backgroundColor: '#f0f0f0', borderRadius: 8, padding: 4 }}>
              <TouchableOpacity
                style={[styles.tabButton, { backgroundColor: newSplitTab === 0 ? '#007AFF' : 'transparent' }]}
                onPress={() => setNewSplitTab(0)}
              >
                <Text style={{ color: newSplitTab === 0 ? '#fff' : '#333', fontWeight: 'bold', fontSize: 12 }}>1. Basic</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tabButton, { backgroundColor: newSplitTab === 1 ? '#007AFF' : 'transparent' }]}
                onPress={() => setNewSplitTab(1)}
              >
                <Text style={{ color: newSplitTab === 1 ? '#fff' : '#333', fontWeight: 'bold', fontSize: 12 }}>2. Days</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tabButton, { backgroundColor: newSplitTab === 2 ? '#007AFF' : 'transparent' }]}
                onPress={() => setNewSplitTab(2)}
              >
                <Text style={{ color: newSplitTab === 2 ? '#fff' : '#333', fontWeight: 'bold', fontSize: 12 }}>3. Schedule</Text>
              </TouchableOpacity>
            </View>

            {/* Tab Content */}
            {newSplitTab === 0 && (
              <View>
                <Text style={{ marginBottom: 4, fontWeight: '500' }}>Split Name:</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                  <TextInput
                    style={[styles.input, { marginBottom: 8, height: 35, fontSize: 16 }]}
                    placeholder="e.g. PPL, Upper/Lower"
                    value={newSplit.name}
                    onChangeText={v => setNewSplit(s => ({ ...s, name: v }))}
                    returnKeyType="done"
                    onSubmitEditing={() => Keyboard.dismiss()}
                  />
                </View>

                <Text style={{ marginBottom: 4, fontWeight: '500' }}>Mode:</Text>
                <View style={{ flexDirection: 'row', marginBottom: 16 }}>
                  <TouchableOpacity
                    style={[
                      styles.modeButton,
                      { backgroundColor: newSplit.mode === 'week' ? '#007AFF' : '#e0e0e0' }
                    ]}
                    onPress={() => setNewSplit(s => ({ ...s, mode: 'week' }))}
                  >
                    <Text style={{ color: newSplit.mode === 'week' ? '#fff' : '#333', fontWeight: 'bold' }}>
                      Weekly
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.modeButton,
                      { backgroundColor: newSplit.mode === 'rotation' ? '#007AFF' : '#e0e0e0', marginLeft: 8 }
                    ]}
                    onPress={() => setNewSplit(s => ({ ...s, mode: 'rotation' }))}
                  >
                    <Text style={{ color: newSplit.mode === 'rotation' ? '#fff' : '#333', fontWeight: 'bold' }}>
                      Rotation
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {newSplitTab === 1 && (
              <View>
                {newSplit.mode === 'week' ? (
                  <>
                    <Text style={{ marginBottom: 8, fontWeight: '500' }}>Week Schedule:</Text>
                    {WEEKDAYS.map((wd, idx) => {
                      const assignedDay = newSplitWeekdays[idx] ? days.find(d => d.id === newSplitWeekdays[idx]) : null;
                      return (
                        <View key={wd} style={styles.splitDayBox}>
                          <Text style={{ width: 60, fontWeight: '500' }}>{wd}:</Text>
                          <TouchableOpacity
                            style={styles.assignBtn}
                            onPress={() => {
                              setPendingDayId(`${idx}`);
                              if (showAddModal) {
                                setShowAddModal(false);
                                setWeekdayModalFromAdd(true);
                              } else {
                                setWeekdayModalFromAdd(false);
                              }
                              setShowWeekdayModal(true);
                            }}
                          >
                            <Text style={styles.assignBtnText}>{assignedDay ? assignedDay.name : 'Rest'}</Text>
                          </TouchableOpacity>
                        </View>
                      );
                    })}
                  </>
                ) : (
                  <>
                    <Text style={{ marginBottom: 8, fontWeight: '500' }}>Rotation Length (days):</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                      <TextInput
                        ref={newSplitRotationRef}
                        style={[styles.input, { width: 120, marginRight: 8 }]}
                        keyboardType="numeric"
                        returnKeyType="done"
                        value={newSplitRotationInput}
                        onChangeText={v => {
                          setNewSplitRotationInput(v);
                          const n = parseInt(v, 10);
                          if (!isNaN(n) && n > 0) {
                            setNewSplitRotationLength(n);
                            setSelectedDaysForNewSplit(prev => {
                              const arr = [...prev];
                              arr.length = n;
                              return arr.map(v2 => v2 ?? null);
                            });
                          }
                        }}
                        onFocus={() => setNewRotationFocused(true)}
                        onBlur={() => {
                          setNewRotationFocused(false);
                          const n = parseInt(newSplitRotationInput, 10);
                          if (isNaN(n) || n <= 0) {
                            setNewSplitRotationInput(String(newSplitRotationLength));
                          }
                        }}
                        onSubmitEditing={() => newSplitRotationRef.current?.blur()}
                      />
                      <Text style={{ color: '#666' }}>days in rotation</Text>
                    </View>
                    <Text style={{ marginBottom: 8, fontWeight: '500' }}>Assign Days To Rotation Slots:</Text>
                    <View>
                      {Array.from({ length: newSplitRotationLength }).map((_, idx) => {
                        const assigned = selectedDaysForNewSplit[idx] ? days.find(d => d.id === selectedDaysForNewSplit[idx]) : null;
                        return (
                          <View key={`rot-${idx}`} style={styles.splitDayBox}>
                            <Text style={{ width: 60, fontWeight: '500' }}>{`Day ${idx + 1}:`}</Text>
                            <TouchableOpacity
                              style={styles.assignBtn}
                              onPress={() => {
                                setPendingRotationIndex(idx);
                                setPendingDayId(null);
                                if (showAddModal) {
                                  setShowAddModal(false);
                                  setWeekdayModalFromAdd(true);
                                } else {
                                  setWeekdayModalFromAdd(false);
                                }
                                setShowWeekdayModal(true);
                              }}
                            >
                              <Text style={styles.assignBtnText}>{assigned ? assigned.name : 'Rest'}</Text>
                            </TouchableOpacity>
                          </View>
                        );
                      })}
                    </View>
                  </>
                )}
              </View>
            )}

            {newSplitTab === 2 && (
              <ScheduleEditor
                mode={newSplit.mode}
                startDate={newSplitStartDate}
                setStartDate={setNewSplitStartDate}
                endDate={newSplitEndDate}
                setEndDate={setNewSplitEndDate}
                showStartPicker={showNewSplitStartPicker}
                setShowStartPicker={setShowNewSplitStartPicker}
                showEndPicker={showNewSplitEndPicker}
                setShowEndPicker={setShowNewSplitEndPicker}
                durationWeeks={newSplitDurationWeeks}
                setDurationWeeks={setNewSplitDurationWeeks}
                rotationLength={newSplitRotationLength}
              />
            )}

            {/* Navigation Buttons - fixed three slots to keep buttons consistent size */}
            <View style={{ marginTop: 20 }}>
              {newSplitTab < 2 ? (
                <ModalButtons
                  leftLabel="Cancel"
                  rightLabel="Next"
                  onLeftPress={() => setShowAddModal(false)}
                  onRightPress={() => setNewSplitTab(newSplitTab + 1)}
                  leftColor="#e0e0e0"
                  rightColor="#007AFF"
                  leftTextColor="#333"
                  rightTextColor="#fff"
                />
              ) : (
                <ModalButtons
                  leftLabel="Cancel"
                  rightLabel={adding ? 'Creating...' : 'Create'}
                  onLeftPress={() => setShowAddModal(false)}
                  onRightPress={handleAddSplit}
                  leftColor="#e0e0e0"
                  rightColor="#007AFF"
                  leftTextColor="#333"
                  rightTextColor="#fff"
                  rightDisabled={adding}
                />
              )}
            </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Edit Split Modal */}
      <Modal
        visible={showEditModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.3)' }}>
          <View style={{ backgroundColor: '#fff', padding: 20, borderRadius: 12, width: '90%', maxWidth: 420, maxHeight: '90%' }}>
            <ScrollView contentContainerStyle={{ paddingBottom: 16 }}>
              <Text style={{ fontWeight: 'bold', fontSize: 18, marginBottom: 16, textAlign: 'center' }}>Edit Split</Text>

              {/* Tab Navigation */}
              <View style={{ flexDirection: 'row', marginBottom: 20, backgroundColor: '#f0f0f0', borderRadius: 8, padding: 4 }}>
              <TouchableOpacity
                style={[styles.tabButton, { backgroundColor: editSplitTab === 0 ? '#007AFF' : 'transparent' }]}
                onPress={() => setEditSplitTab(0)}
              >
                <Text style={{ color: editSplitTab === 0 ? '#fff' : '#333', fontWeight: 'bold', fontSize: 12 }}>1. Basic</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tabButton, { backgroundColor: editSplitTab === 1 ? '#007AFF' : 'transparent' }]}
                onPress={() => setEditSplitTab(1)}
              >
                <Text style={{ color: editSplitTab === 1 ? '#fff' : '#333', fontWeight: 'bold', fontSize: 12 }}>2. Days</Text>
              </TouchableOpacity>
              {/* Edit modal only has Basic and Days tabs now; Schedule is separate */}
            </View>

            {/* Tab Content */}
            {editSplitTab === 0 && (
              <View>
                <Text style={{ marginBottom: 4, fontWeight: '500' }}>Split Name:</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                  <TextInput
                    style={{ width: '100%', marginBottom: 8, height: 35, fontSize: 16, textAlignVertical: 'top', padding: 8, borderWidth: 1, borderColor: '#ccc', borderRadius: 4 }}
                    placeholder="e.g. PPL, Upper/Lower"
                    value={editingSplit?.name || ''}
                    onChangeText={v => setEditingSplit((prev: any) => ({ ...prev, name: v }))}
                    returnKeyType="done"
                    onSubmitEditing={() => Keyboard.dismiss()}
                    multiline
                    numberOfLines={3}
                  />
                </View>
                
                <Text style={{ marginBottom: 4, fontWeight: '500' }}>Mode:</Text>
                <View style={{ flexDirection: 'row', marginBottom: 16 }}>
                  <TouchableOpacity
                    style={[
                      styles.modeButton,
                      { backgroundColor: editingSplit?.mode === 'week' ? '#007AFF' : '#e0e0e0' }
                    ]}
                    onPress={() => setEditingSplit((prev: any) => ({ ...prev, mode: 'week' }))}
                  >
                    <Text style={{ color: editingSplit?.mode === 'week' ? '#fff' : '#333', fontWeight: 'bold' }}>
                      Weekly
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.modeButton,
                      { backgroundColor: editingSplit?.mode === 'rotation' ? '#007AFF' : '#e0e0e0', marginLeft: 8 }
                    ]}
                    onPress={() => setEditingSplit((prev: any) => ({ ...prev, mode: 'rotation' }))}
                  >
                    <Text style={{ color: editingSplit?.mode === 'rotation' ? '#fff' : '#333', fontWeight: 'bold' }}>
                      Rotation
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {editSplitTab === 1 && (
              <View>
                {editingSplit?.mode === 'week' ? (
                  <>
                    <Text style={{ marginBottom: 8, fontWeight: '500' }}>Week Schedule:</Text>
                    {WEEKDAYS.map((wd, idx) => {
                      const assignedDay = editSplitWeekdays[idx] ? days.find(d => d.id === editSplitWeekdays[idx]) : null;
                      return (
                        <View key={wd} style={styles.splitDayBox}>
                          <Text style={{ width: 60, fontWeight: '500' }}>{wd}:</Text>
                          <TouchableOpacity
                            style={styles.assignBtn}
                            onPress={() => {
                              setPendingDayId(`${idx}`);
                              if (showEditModal) {
                                setShowEditModal(false);
                                setWeekdayModalFromEdit(true);
                              } else {
                                setWeekdayModalFromEdit(false);
                              }
                              setWeekdayModalFromAdd(false);
                              setShowWeekdayModal(true);
                            }}
                          >
                            <Text style={styles.assignBtnText}>{assignedDay ? assignedDay.name : 'Rest'}</Text>
                          </TouchableOpacity>
                        </View>
                      );
                    })}
                  </>
                ) : (
                  <>
                    <Text style={{ marginBottom: 8, fontWeight: '500' }}>Rotation Length (days):</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                      <TextInput
                        ref={editSplitRotationRef}
                        style={[styles.input, { width: 120, marginRight: 8 }]}
                        keyboardType="numeric"
                        returnKeyType="done"
                        value={editSplitRotationInput}
                        onChangeText={v => {
                          setEditSplitRotationInput(v);
                          const n = parseInt(v, 10);
                          if (!isNaN(n) && n > 0) {
                            setEditSplitRotationLength(n);
                            setSelectedDaysForNewSplit(prev => {
                              const arr = [...prev];
                              arr.length = n;
                              return arr.map(v2 => v2 ?? null);
                            });
                          }
                        }}
                        onFocus={() => setEditRotationFocused(true)}
                        onBlur={() => {
                          setEditRotationFocused(false);
                          const n = parseInt(editSplitRotationInput, 10);
                          if (isNaN(n) || n <= 0) {
                            setEditSplitRotationInput(String(editSplitRotationLength));
                          }
                        }}
                        onSubmitEditing={() => editSplitRotationRef.current?.blur()}
                      />
                      <Text style={{ color: '#666' }}>days in rotation</Text>
                    </View>
                    <Text style={{ marginBottom: 8, fontWeight: '500' }}>Assign Days To Rotation Slots:</Text>
                    <View>
                      {Array.from({ length: editSplitRotationLength }).map((_, idx) => {
                        const assigned = selectedDaysForNewSplit[idx] ? days.find(d => d.id === selectedDaysForNewSplit[idx]) : null;
                        return (
                          <View key={`edit-rot-${idx}`} style={styles.splitDayBox}>
                            <Text style={{ width: 60, fontWeight: '500' }}>{`Day ${idx + 1}:`}</Text>
                            <TouchableOpacity
                              style={styles.assignBtn}
                              onPress={() => {
                                setPendingRotationIndex(idx);
                                setPendingDayId(null);
                                if (showEditModal) {
                                  setShowEditModal(false);
                                  setWeekdayModalFromEdit(true);
                                } else {
                                  setWeekdayModalFromEdit(false);
                                }
                                setShowWeekdayModal(true);
                              }}
                            >
                              <Text style={styles.assignBtnText}>{assigned ? assigned.name : 'Rest'}</Text>
                            </TouchableOpacity>
                          </View>
                        );
                      })}
                    </View>
                  </>
                )}
              </View>
            )}

            {/* Schedule removed from Edit modal; scheduling is handled via the Schedule button on the split card */}

            {/* Navigation Buttons - fixed three slots to keep buttons consistent size */}
            <View style={{ marginTop: 20 }}>
              {editSplitTab === 0 ? (
                <ModalButtons
                  leftLabel="Cancel"
                  rightLabel="Next"
                  onLeftPress={() => setShowEditModal(false)}
                  onRightPress={() => setEditSplitTab(1)}
                  leftColor="#e0e0e0"
                  rightColor="#007AFF"
                  leftTextColor="#333"
                  rightTextColor="#fff"
                />
              ) : (
                <ModalButtons
                  leftLabel="Cancel"
                  rightLabel={adding ? 'Saving...' : 'Save Split'}
                  onLeftPress={() => setShowEditModal(false)}
                  onRightPress={handleSaveEditSplit}
                  leftColor="#e0e0e0"
                  rightColor="#007AFF"
                  leftTextColor="#333"
                  rightTextColor="#fff"
                  rightDisabled={adding}
                />
              )}
            </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Day picker modal for assigning a day to a weekday */}
      <Modal
        visible={showWeekdayModal}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setShowWeekdayModal(false);
          if (weekdayModalFromAdd) {
            setShowAddModal(true);
            setWeekdayModalFromAdd(false);
          }
          if (weekdayModalFromEdit) {
            setShowEditModal(true);
            setWeekdayModalFromEdit(false);
          }
          setPendingDayId(null);
        }}
      >
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.3)' }}>
          <View style={{ backgroundColor: '#fff', padding: 24, borderRadius: 12, width: '90%', maxWidth: 420, maxHeight: '90%' }}>
            <ScrollView contentContainerStyle={{ paddingBottom: 12 }}>
              <Text style={{ fontWeight: 'bold', fontSize: 18, marginBottom: 12 }}>
              {pendingDayId !== null
                ? `Assign Day to ${WEEKDAYS[parseInt(pendingDayId)]}`
                : pendingRotationIndex !== null
                  ? `Assign Day to Day ${pendingRotationIndex + 1}`
                  : 'Assign Day'}
            </Text>
            {days.length === 0 && <Text>No days created yet.</Text>}
            {days.map((d) => (
              <TouchableOpacity
                key={d.id}
                style={{ padding: 10, marginVertical: 2, backgroundColor: '#eee', borderRadius: 6 }}
                onPress={async () => {
                  // If assigning to a weekday (weekly mode)
                  if (pendingDayId !== null) {
                    const weekdayIndex = parseInt(pendingDayId, 10);
                    if (weekdayModalFromAdd) {
                      setNewSplitWeekdays(prev => {
                        const newWeekdays = [...prev];
                        newWeekdays[weekdayIndex] = d.id;
                        return newWeekdays;
                      });
                      setShowWeekdayModal(false);
                      setPendingDayId(null);
                      setShowAddModal(true);
                      setWeekdayModalFromAdd(false);
                    } else if (weekdayModalFromEdit) {
                      setEditSplitWeekdays(prev => {
                        const newWeekdays = [...prev];
                        newWeekdays[weekdayIndex] = d.id;
                        return newWeekdays;
                      });
                      setShowWeekdayModal(false);
                      setPendingDayId(null);
                      setShowEditModal(true);
                      setWeekdayModalFromEdit(false);
                    } else if (selectedSplitId) {
                      const split = splits.find(s => s.id === selectedSplitId);
                      const existing = splitDays.find(sd => sd.weekday === weekdayIndex);
                      if (existing) await handleRemoveSplitDay(existing.id);
                      doLinkDay(d.id, split, weekdayIndex);
                    }
                    return;
                  }

                  // If assigning to a rotation slot
                  if (pendingRotationIndex !== null) {
                    const idx = pendingRotationIndex;
                    if (weekdayModalFromAdd) {
                      // Use selectedDaysForNewSplit array for new-split rotation slots
                      setSelectedDaysForNewSplit(prev => {
                        const arr = [...prev];
                        arr[idx] = d.id;
                        return arr;
                      });
                      setPendingRotationIndex(null);
                      setShowWeekdayModal(false);
                      setWeekdayModalFromAdd(false);
                      setShowAddModal(true);
                      return;
                    }
                    if (weekdayModalFromEdit) {
                      setSelectedDaysForNewSplit(prev => {
                        const arr = [...prev];
                        arr[idx] = d.id;
                        return arr;
                      });
                      setPendingRotationIndex(null);
                      setShowWeekdayModal(false);
                      setWeekdayModalFromEdit(false);
                      setShowEditModal(true);
                      return;
                    }
                    if (selectedSplitId) {
                      // Persist to DB: insert or update split_days with order_index = idx
                      const split = splits.find(s => s.id === selectedSplitId);
                      // Remove any existing entry at this order_index
                      const existing = splitDays.find(sd => sd.order_index === idx);
                      if (existing) await handleRemoveSplitDay(existing.id);
                      // Insert new
                      await supabase.from('split_days').insert({ split_id: selectedSplitId, day_id: d.id, weekday: null, order_index: idx });
                      fetchSplitDays(selectedSplitId);
                      setPendingRotationIndex(null);
                      setShowWeekdayModal(false);
                      return;
                    }
                  }
                }}
              >
                <Text>{d.name}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={{ padding: 10, marginVertical: 2, backgroundColor: '#eee', borderRadius: 6 }}
              onPress={async () => {
                // Remove assignment for either weekday or rotation slot
                if (pendingDayId !== null) {
                  const weekdayIndex = parseInt(pendingDayId, 10);
                  if (weekdayModalFromAdd) {
                    setNewSplitWeekdays(prev => {
                      const newWeekdays = [...prev];
                      newWeekdays[weekdayIndex] = null;
                      return newWeekdays;
                    });
                    setShowWeekdayModal(false);
                    setPendingDayId(null);
                    setShowAddModal(true);
                    setWeekdayModalFromAdd(false);
                  } else if (weekdayModalFromEdit) {
                    setEditSplitWeekdays(prev => {
                      const newWeekdays = [...prev];
                      newWeekdays[weekdayIndex] = null;
                      return newWeekdays;
                    });
                    setShowWeekdayModal(false);
                    setPendingDayId(null);
                    setShowEditModal(true);
                    setWeekdayModalFromEdit(false);
                  } else if (selectedSplitId) {
                    const existing = splitDays.find(sd => sd.weekday === weekdayIndex);
                    if (existing) await handleRemoveSplitDay(existing.id);
                    setShowWeekdayModal(false);
                    setPendingDayId(null);
                  }
                  return;
                }

                if (pendingRotationIndex !== null) {
                  const idx = pendingRotationIndex;
                  if (weekdayModalFromAdd) {
                    setSelectedDaysForNewSplit(prev => {
                      const arr = [...prev];
                      arr[idx] = null;
                      return arr;
                    });
                    setPendingRotationIndex(null);
                    setShowWeekdayModal(false);
                    setShowAddModal(true);
                    setWeekdayModalFromAdd(false);
                  } else if (weekdayModalFromEdit) {
                    setSelectedDaysForNewSplit(prev => {
                      const arr = [...prev];
                      arr[idx] = null;
                      return arr;
                    });
                    setPendingRotationIndex(null);
                    setShowWeekdayModal(false);
                    setShowEditModal(true);
                    setWeekdayModalFromEdit(false);
                  } else if (selectedSplitId) {
                    const existing = splitDays.find(sd => sd.order_index === idx);
                    if (existing) await handleRemoveSplitDay(existing.id);
                    setPendingRotationIndex(null);
                    setShowWeekdayModal(false);
                  }
                }
              }}
            >
              <Text>Set to Rest</Text>
            </TouchableOpacity>
            <View style={{ marginTop: 8 }}>
              <ModalButtons
                leftLabel="Cancel"
                rightLabel="Set"
                onLeftPress={() => {
                  setShowWeekdayModal(false);
                  if (weekdayModalFromAdd) {
                    setShowAddModal(true);
                    setWeekdayModalFromAdd(false);
                  }
                  if (weekdayModalFromEdit) {
                    setShowEditModal(true);
                    setWeekdayModalFromEdit(false);
                  }
                  setPendingDayId(null);
                }}
                onRightPress={() => { /* no-op default - selection handlers already close modal */ }}
                leftColor="#e0e0e0"
                rightColor="#007AFF"
                leftTextColor="#333"
                rightTextColor="#fff"
              />
            </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        visible={showDeleteConfirm}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDeleteConfirm(false)}
      >
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <View style={{ backgroundColor: '#fff', padding: 20, borderRadius: 12, width: '90%', maxWidth: 420, maxHeight: '90%' }}>
            <ScrollView contentContainerStyle={{ paddingBottom: 12 }}>
              <Text style={{ fontWeight: 'bold', fontSize: 18, marginBottom: 12 }}>Remove Split?</Text>
              <Text style={{ marginBottom: 16 }}>Are you sure you want to permanently remove this split? This action cannot be undone.</Text>
              <View style={{ marginTop: 8 }}>
                <ModalButtons
                  leftLabel="Cancel"
                    rightLabel="Remove"
                    onLeftPress={() => { setShowDeleteConfirm(false); setDeleteTargetId(null); }}
                    onRightPress={async () => { if (deleteTargetId) await handleDeleteSplit(deleteTargetId); setShowDeleteConfirm(false); setDeleteTargetId(null); }}
                  leftColor="#e0e0e0"
                  rightColor="#ff3b30"
                  leftTextColor="#333"
                  rightTextColor="#fff"
                />
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  addButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 8,
    borderRadius: 4,
    flex: 1,
    marginRight: 8,
  },
  splitBox: {
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 10,
    padding: 16,
    marginBottom: 14,
    backgroundColor: '#fafafa',
  },
  splitName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  modeBadge: {
    backgroundColor: '#e6f0ff',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    marginLeft: 8,
  },
  currentBadge: {
    backgroundColor: '#dff6e0',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    marginLeft: 8,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
  },
  splitActions: {
    flexDirection: 'row',
    marginTop: 8,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  deleteBtn: {
    color: 'red',
    marginLeft: 16,
  },
  splitDaysSection: {
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#ddd',
  },
  splitDaysTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  splitDayBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  addDayBtn: {
    backgroundColor: '#e0e0e0',
    borderRadius: 6,
    padding: 8,
    marginBottom: 6,
  },
  addDayBtnText: {
    color: '#333',
    fontWeight: 'bold',
  },
  assignBtn: {
    backgroundColor: '#eee',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 6,
    marginHorizontal: 4,
  },
  assignBtnText: {
    color: '#007AFF',
    fontWeight: 'bold',
  },
  modeButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    flex: 1,
  },
  daySelectItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
  },
  modalButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  actionBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginLeft: 10,
    minWidth: 78,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  primaryBtn: {
    backgroundColor: '#007AFF',
  },
  primaryBtnText: {
    color: '#fff',
  },
  dangerBtn: {
    backgroundColor: '#ff3b30',
    borderWidth: 0,
  },
  dangerBtnText: {
    color: '#fff',
  },
  durationBadge: {
    backgroundColor: '#e6f0ff',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 12,
    marginRight: 8,
  },
  durationText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#007AFF',
  },
  splitFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  removeWrapper: {
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
  },
  linkText: {
    color: '#007AFF',
    fontWeight: '700',
    marginTop: 4,
  },
  removeTextStyle: {
    color: '#ff3b30',
    fontWeight: '600',
    fontSize: 12,
  },
});
