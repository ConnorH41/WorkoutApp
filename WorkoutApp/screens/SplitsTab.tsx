import React, { useEffect, useState, useRef } from 'react';
import { View, Text, TextInput, Button, FlatList, TouchableOpacity, Alert, Modal, Platform, Keyboard, ToastAndroid, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DatePickerModal from '../components/DatePickerModal';
import { supabase } from '../lib/supabase';
import { useProfileStore } from '../lib/profileStore';
import ModalButtons from '../components/ModalButtons';
import EditPencil from '../components/EditPencil';
import RemoveButton from '../components/RemoveButton';
import styles from '../styles/splitsStyles';
import Badge from '../components/Badge';
import { colors } from '../styles/theme';
import AddSplitModal from '../components/AddSplitModal';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Round a number to the nearest 0.5 (half-week)
const roundToHalf = (n: number) => Math.round(n * 2) / 2;

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
  const insets = useSafeAreaInsets();
  const profile = useProfileStore((state) => state.profile);
  const [splits, setSplits] = useState<any[]>([]);
  const [currentSplitId, setCurrentSplitId] = useState<string | null>(null);
  const [splitStartDate, setSplitStartDate] = useState<string | null>(null);
  const [splitEndDate, setSplitEndDate] = useState<string | null>(null);
  const [activeRuns, setActiveRuns] = useState<any[]>([]);
  const [showSetModal, setShowSetModal] = useState(false);
  const [pendingSplit, setPendingSplit] = useState<any>(null);
  const [pendingRotationLength, setPendingRotationLength] = useState<number | null>(null);
  const [calendarDate, setCalendarDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  // number of rotations is auto-calculated for rotation-mode when scheduling
  // UX: optional duration in weeks (can be fractional). If null, duration is auto-calculated from start/end.
  const [durationWeeks, setDurationWeeks] = useState<number | null>(4);
  const [endManuallyEdited, setEndManuallyEdited] = useState(false);
  const iosInlineSupported = Platform.OS === 'ios' && parseFloat(String(Platform.Version)) >= 14;
  const toDateOnly = (d: Date) => {
    if (!d) return null;
    const dd = new Date(d);
    dd.setHours(0, 0, 0, 0);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${dd.getFullYear()}-${pad(dd.getMonth() + 1)}-${pad(dd.getDate())}`;
  };

  // Parse a YYYY-MM-DD date-only string into a local Date at midnight (avoids UTC parsing)
  const parseDateOnlyLocal = (s: string | null | undefined) => {
    if (!s) return null;
    const parts = String(s).split('-').map(p => parseInt(p, 10));
    if (parts.length < 3 || parts.some(p => Number.isNaN(p))) return null;
    const [y, m, day] = parts;
    return new Date(y, m - 1, day);
  };

  const showValidationToast = (msg: string) => {
    if (Platform.OS === 'android' && ToastAndroid && ToastAndroid.show) {
      ToastAndroid.show(msg, ToastAndroid.SHORT);
    } else {
      Alert.alert('Validation', msg);
    }
  };
  // Open modal to set current split
  const handleSetCurrentSplit = async (split: any) => {
    setPendingSplit(split);
    // For scheduling we want the fields to be empty by default when there is no existing run.
    // Do not prefill rotation length/start/end unless there is an active run to copy from.
    setPendingRotationLength(null);
    // If there is an existing active run for this split, prefill with those dates
    const run = activeRuns.find(r => r.split_id === split.id);
    if (run && run.start_date) {
      const s = parseDateOnlyLocal(run.start_date);
      setCalendarDate(s);
      if (run.end_date) {
        const e = parseDateOnlyLocal(run.end_date);
        setEndDate(e);
        if (s && e) {
          const msPerDay = 24 * 60 * 60 * 1000;
          const s0 = new Date(s);
          s0.setHours(0, 0, 0, 0);
          const e0 = new Date(e);
          e0.setHours(0, 0, 0, 0);
          const diffDays = Math.floor((e0.getTime() - s0.getTime()) / msPerDay);
          const inclusiveDays = Math.max(0, diffDays) + 1;
          // If this split is rotation-mode, compute rotations (allow half-rotations in UI)
          if (pendingSplit?.mode === 'rotation') {
            const rotationLen = pendingSplit?.rotation_length ?? pendingRotationLength ?? 3;
            const uiRotations = Math.max(0.5, roundToHalf(inclusiveDays / (rotationLen || 3)));
            setDurationWeeks(uiRotations);
          } else {
            const uiWeeks = Math.max(0.5, roundToHalf(inclusiveDays / 7));
            setDurationWeeks(uiWeeks);
          }
        }
      } else {
        setEndDate(null);
        setDurationWeeks(-1);
      }
      setEndManuallyEdited(false);
      setShowSetModal(true);
      return;
    }

    // Otherwise leave fields empty so the user can choose dates explicitly
    setCalendarDate(null);
    setDurationWeeks(null);
    setEndDate(null);
    setEndManuallyEdited(false);
    setShowSetModal(true);
  };

  // State to hold edit split data for passing to AddSplitModal
  const [editSplitData, setEditSplitData] = useState<any>(null);

  // Open edit split modal - now using AddSplitModal
  const handleEditSplit = async (split: any) => {
    setEditingSplit(split);
    
    // Load current split days
    const { data: splitDaysData } = await supabase
      .from('split_days')
      .select('*')
      .eq('split_id', split.id)
      .order('weekday', { ascending: true })
      .order('order_index', { ascending: true });
    
    // Load current split run (for start/end dates)
    const run = activeRuns.find(r => r.split_id === split.id);
    const startDateParsed = run && run.start_date ? parseDateOnlyLocal(run.start_date) : null;
    const endDateParsed = run && run.end_date ? parseDateOnlyLocal(run.end_date) : null;
    
    if (split.mode === 'week') {
      // Populate weekdays array
      const weekdays = new Array(7).fill(null);
      splitDaysData?.forEach(sd => {
        if (sd.weekday !== null) {
          weekdays[sd.weekday] = sd.day_id;
        }
      });
      setEditSplitWeekdays(weekdays);
      
      // Set edit data
      setEditSplitData({
        weekdays,
        startDate: startDateParsed,
        endDate: endDateParsed,
      });
      
      // Pass data to AddSplitModal
      setShowAddModal(true);
    } else {
      // For rotation mode, populate selected days
      const maxIndex = splitDaysData && splitDaysData.length > 0 ? Math.max(...splitDaysData.map((sd: any) => sd.order_index ?? 0)) : -1;
      const length = maxIndex >= 0 ? maxIndex + 1 : 3;
      const rotationDays = Array.from({ length }).map((_, i) => {
        const sd = splitDaysData?.find(sd => sd.order_index === i);
        return sd ? sd.day_id : null;
      });
      
      setEditSplitRotationLength(length);
      setEditSplitRotationInput(String(length));
      
      // Set edit data
      setEditSplitData({
        rotationDays,
        rotationLength: length,
        startDate: startDateParsed,
        endDate: endDateParsed,
      });
      
      // Temporarily store in state to pass to AddSplitModal
      setEditSplitWeekdays(new Array(7).fill(null)); // Clear weekdays
      
      // Pass data to AddSplitModal
      setShowAddModal(true);
    }
  };

  // Confirm setting current split with date and weeks/rotations
  const handleConfirmSetCurrentSplit = async () => {
    if (!pendingSplit) return;
    try {
        // If no start date provided, treat this as clearing/resetting the timeframe.
        if (!calendarDate) {
          // Clear local stored timeframe and deactivate any existing active run for this split
          try {
            const existingRun = activeRuns.find(r => r.split_id === pendingSplit.id && r.active);
            if (profile?.id) {
              if (existingRun && existingRun.id) {
                await supabase.from('split_runs').update({
                  start_date: null,
                  end_date: null,
                  num_weeks: null,
                  num_rotations: null,
                  active: false,
                }).eq('id', existingRun.id);
              }
              await safeStorage.removeItem('currentSplitId');
              await safeStorage.removeItem('splitStartDate');
              await safeStorage.removeItem('splitEndDate');
              await safeStorage.removeItem('splitNumWeeks');
              await safeStorage.removeItem('splitNumRotations');
              await fetchActiveRun();
              await fetchSplits();
            }
          } catch (err) {
            // swallow and show a simple toast
            showValidationToast('Failed to update split timeframe');
          }
          setShowSetModal(false);
          setPendingSplit(null);
          setShowStartPicker(false);
          setShowEndPicker(false);
          return;
        }
      // Prevent overlaps: compute intended start/end (ISO dates) and ensure no active run overlaps
        const intendedStart = toDateOnly(calendarDate as Date);
        const intendedEnd = endDate ? toDateOnly(endDate) : null;
      // If any existing active run (for other splits) overlaps, block scheduling
      const overlapping = activeRuns.some(r => r.split_id !== pendingSplit.id && rangesOverlap(r.start_date, r.end_date, intendedStart, intendedEnd));
      if (overlapping) {
        showValidationToast('Scheduling would overlap an existing split run. Pick different dates.');
        return;
      }
  setCurrentSplitId(pendingSplit.id);
  setSplitStartDate(toDateOnly(calendarDate as Date));
  if (endDate) setSplitEndDate(toDateOnly(endDate as Date));
  await safeStorage.setItem('currentSplitId', pendingSplit.id);
  await safeStorage.setItem('splitStartDate', toDateOnly(calendarDate as Date) ?? '');
  if (endDate) await safeStorage.setItem('splitEndDate', toDateOnly(endDate as Date) ?? '');
  if (pendingSplit.mode === 'week') {
        // calculate number of weeks from start (calendarDate) to endDate (inclusive)
        const msPerDay = 24 * 60 * 60 * 1000;
        let weeks = '0';
        if (endDate) {
          const s = new Date(calendarDate as Date);
          s.setHours(0, 0, 0, 0);
          const e = new Date(endDate as Date);
          e.setHours(0, 0, 0, 0);
          const diffDays = Math.floor((e.getTime() - s.getTime()) / msPerDay);
          const uiWeeks = Math.max(0.5, roundToHalf(diffDays / 7));
          // store the UI half-week value (e.g. 1.5) directly in DB
          weeks = String(uiWeeks);
        } else {
          // Forever preset - set a large number of weeks or handle differently
          weeks = '999';
        }
        await safeStorage.setItem('splitNumWeeks', weeks);
        await safeStorage.removeItem('splitNumRotations');
        // Persist to split_runs
        if (profile?.id) {
            const existingRun = activeRuns.find(r => r.split_id === pendingSplit.id && r.active);
            if (existingRun && existingRun.id) {
              await supabase.from('split_runs').update({
                start_date: toDateOnly(calendarDate as Date),
                end_date: endDate ? toDateOnly(endDate as Date) : null,
                num_weeks: endDate ? parseFloat(weeks) || 1 : null,
                num_rotations: null,
                active: true,
              }).eq('id', existingRun.id);
            } else {
              await supabase.from('split_runs').insert({
                split_id: pendingSplit.id,
                user_id: profile.id,
                start_date: toDateOnly(calendarDate as Date),
                end_date: endDate ? toDateOnly(endDate as Date) : null,
                num_weeks: endDate ? parseFloat(weeks) || 1 : null,
                num_rotations: null,
                active: true,
              });
            }
            await fetchActiveRun();
            await fetchActiveRun();
        }
      } else {
        // For rotation mode, compute number of rotations from calendarDate->endDate range and rotation length
        let computedRotations = 1;
        if (calendarDate && endDate && pendingRotationLength && pendingRotationLength > 0) {
          const msPerDay = 24 * 60 * 60 * 1000;
          const s = new Date(calendarDate as Date);
          s.setHours(0, 0, 0, 0);
          const e = new Date(endDate as Date);
          e.setHours(0, 0, 0, 0);
          const diffDays = Math.floor((e.getTime() - s.getTime()) / msPerDay);
          const inclusiveDays = Math.max(0, diffDays) + 1;
          const rotationLen = pendingRotationLength || 3;
          const uiRotations = Math.max(0.5, roundToHalf(inclusiveDays / rotationLen));
          const dbRotations = Math.max(1, Math.ceil(inclusiveDays / rotationLen));
          computedRotations = dbRotations;
          await safeStorage.setItem('splitNumRotations', String(uiRotations));
        } else {
          await safeStorage.setItem('splitNumRotations', String(computedRotations));
        }
        await safeStorage.removeItem('splitNumWeeks');
        // Persist to split_runs
        if (profile?.id) {
          const existingRun = activeRuns.find(r => r.split_id === pendingSplit.id && r.active);
          if (existingRun && existingRun.id) {
            await supabase.from('split_runs').update({
              start_date: toDateOnly(calendarDate as Date),
              end_date: endDate ? toDateOnly(endDate as Date) : null,
              num_weeks: null,
              num_rotations: computedRotations || 1,
              active: true,
            }).eq('id', existingRun.id);
          } else {
            await supabase.from('split_runs').insert({
              split_id: pendingSplit.id,
              user_id: profile.id,
              start_date: toDateOnly(calendarDate as Date),
              end_date: endDate ? toDateOnly(endDate as Date) : null,
              num_weeks: null,
              num_rotations: computedRotations || 1,
              active: true,
            });
          }
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
  const now = toDateOnly(new Date());
  setSplitStartDate(now);
  await safeStorage.setItem('splitStartDate', now ?? '');
  };
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  // state for showing loading when saving edits (previously shared with add split)
  const [adding, setAdding] = useState(false);
  // rotation editing selection state retained for existing splits only
  const [pendingRotationIndex, setPendingRotationIndex] = useState<number | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingSplit, setEditingSplit] = useState<any>(null);
  // editSplitTab removed — edit modal simplified
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
  // removed weekday modal origin flags (AddSplitModal manages its own picker)
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
  setSplitStartDate(run.start_date ?? null);
  setSplitEndDate(run.end_date ?? null);
      } else {
        setCurrentSplitId(null);
        setSplitStartDate(null);
        setSplitEndDate(null);
      }
    }
  };

  // Return true if two date ranges overlap.
  // Uses YYYY-MM-DD date-only parsing to avoid timezone shifts and treats missing
  // start dates as non-overlapping (cannot determine overlap without a start).
  const parseDateOnlyEpoch = (d: string | null) => {
    if (!d) return null;
    const parts = String(d).split('-').map(p => parseInt(p, 10));
    if (parts.length < 3 || parts.some(p => Number.isNaN(p))) return null;
    const [y, m, day] = parts;
    return Date.UTC(y, m - 1, day);
  };

  const rangesOverlap = (s1: string | null, e1: string | null, s2: string | null, e2: string | null) => {
    // If either range lacks a start we cannot reliably determine overlap — treat as non-overlap.
    if (!s1 || !s2) return false;
    const a1 = parseDateOnlyEpoch(s1);
    const b1 = parseDateOnlyEpoch(e1);
    const a2 = parseDateOnlyEpoch(s2);
    const b2 = parseDateOnlyEpoch(e2);
    if (a1 === null || a2 === null) return false;
    // Both have end dates
    if (b1 !== null && b2 !== null) return !(b1 < a2 || b2 < a1);
    // Neither have end dates: both open-ended -> overlap
    if (b1 === null && b2 === null) return true;
    // Only first is open-ended
    if (b1 === null && b2 !== null) return !(b2 < a1);
    // Only second is open-ended
    if (b1 !== null && b2 === null) return !(b1 < a2);
    return false;
  };

  const isSplitCurrentlyActive = (splitId: string) => {
    const run = activeRuns.find(r => r.split_id === splitId);
    if (!run) return false;
    const today = new Date();
    today.setHours(0,0,0,0);
    if (!run.start_date) return true;
  const s = parseDateOnlyLocal(run.start_date);
  if (s) s.setHours(0,0,0,0);
  if (!s) return true; // cannot determine start -> treat as active
  if (today.getTime() < s.getTime()) return false;
    if (!run.end_date) return true;
  const e = parseDateOnlyLocal(run.end_date);
  if (e) e.setHours(0,0,0,0);
  if (!e) return true;
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
  const diffDays = Math.floor((e.getTime() - s.getTime()) / msPerDay);
  if (diffDays <= 0) return 0;
  const weeks = diffDays / 7;
  return Math.max(0.5, roundToHalf(weeks));
    })();

    const endBeforeStart = !!endDate && new Date(endDate).setHours(0, 0, 0, 0) < new Date(startDate).setHours(0, 0, 0, 0);

    // Helper: calculate weeks (integer weeks, min 1) between two dates (inclusive)
    const calcWeeksFromDates = (sDate: Date, eDate: Date) => {
      const msPerDay = 24 * 60 * 60 * 1000;
      const s = new Date(sDate);
      s.setHours(0, 0, 0, 0);
      const e = new Date(eDate);
      e.setHours(0, 0, 0, 0);
      const diffDays = Math.floor((e.getTime() - s.getTime()) / msPerDay);
      if (diffDays <= 0) return 0;
      const weeks = diffDays / 7;
      return Math.max(0.5, roundToHalf(weeks));
    };

    return (
      <View>
        <Text style={{ marginBottom: 4, fontWeight: '500' }}>Start Date:</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
          <TouchableOpacity
            style={{ flex: 1, padding: 10, backgroundColor: '#eee', borderRadius: 6 }}
            onPress={() => { setShowStartPicker((v: boolean) => !v); setShowEndPicker(false); }}
          >
            <Text>{startDate ? startDate.toDateString() : 'Select start date'}</Text>
          </TouchableOpacity>
          {startDate && (
            <TouchableOpacity
              style={{ marginLeft: 8, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 6, backgroundColor: '#f0f0f0' }}
              onPress={() => { setStartDate(null); setDurationWeeks(null); }}
            >
              <Text style={{ color: '#333', fontWeight: '600' }}>Clear</Text>
            </TouchableOpacity>
          )}
        </View>
        <DatePickerModal
          visible={showStartPicker}
          initialDate={startDate ?? getNextMonday(new Date())}
          onCancel={() => setShowStartPicker(false)}
          onConfirm={(iso) => {
            setShowStartPicker(false);
            const d = new Date(`${iso}T00:00:00`);
            setStartDate(d);
            if (durationWeeks !== null && durationWeeks !== -1) {
              if (mode === 'rotation') {
                const rotLen = rotationLength && rotationLength > 0 ? rotationLength : 3;
                const days = durationWeeks * rotLen - 1;
                setEndDate(addDaysFloat(d, days));
              } else {
                const days = durationWeeks * 7 - 1;
                setEndDate(addDaysFloat(d, days));
              }
            }
            if (endDate && (durationWeeks === null || durationWeeks === undefined)) {
              if (mode === 'rotation') {
                const msPerDay = 24 * 60 * 60 * 1000;
                const s = new Date(d);
                s.setHours(0, 0, 0, 0);
                const e = new Date(endDate as Date);
                e.setHours(0, 0, 0, 0);
                const diffDays = Math.floor((e.getTime() - s.getTime()) / msPerDay);
                const inclusiveDays = Math.max(0, diffDays) + 1;
                const rotLen = rotationLength && rotationLength > 0 ? rotationLength : 3;
                const uiRot = Math.max(0.5, roundToHalf(inclusiveDays / rotLen));
                if (uiRot > 0) setDurationWeeks(uiRot);
              } else {
                const weeks = calcWeeksFromDates(d, endDate as Date);
                if (weeks > 0) setDurationWeeks(weeks);
              }
            }
          }}
        />

        <Text style={{ marginBottom: 4, fontWeight: '500' }}>End Date:</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
          <TouchableOpacity
            style={{ flex: 1, padding: 10, backgroundColor: '#eee', borderRadius: 6 }}
            onPress={() => { setShowEndPicker((v: boolean) => !v); setShowStartPicker(false); }}
          >
            <Text>{endDate ? endDate.toDateString() : 'Select end date'}</Text>
          </TouchableOpacity>
          {endDate && (
            <TouchableOpacity
              style={{ marginLeft: 8, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 6, backgroundColor: '#f0f0f0' }}
              onPress={() => { setEndDate(null); setDurationWeeks(null); }}
            >
              <Text style={{ color: '#333', fontWeight: '600' }}>Clear</Text>
            </TouchableOpacity>
          )}
        </View>
        <DatePickerModal
          visible={showEndPicker}
          initialDate={endDate ?? startDate ?? getNextMonday(new Date())}
          onCancel={() => setShowEndPicker(false)}
          onConfirm={(iso) => {
            setShowEndPicker(false);
            const d = new Date(`${iso}T00:00:00`);
            setEndDate(d);
            const baseStart = startDate ?? d;
            if (mode === 'rotation') {
              const msPerDay = 24 * 60 * 60 * 1000;
              const s = new Date(baseStart as Date);
              s.setHours(0, 0, 0, 0);
              const e = new Date(d);
              e.setHours(0, 0, 0, 0);
              const diffDays = Math.floor((e.getTime() - s.getTime()) / msPerDay);
              const inclusiveDays = Math.max(0, diffDays) + 1;
              const rotLen = rotationLength && rotationLength > 0 ? rotationLength : 3;
              const uiRot = Math.max(0.5, roundToHalf(inclusiveDays / rotLen));
              if (uiRot > 0) setDurationWeeks(uiRot); else setDurationWeeks(null);
            } else {
              const weeks = calcWeeksFromDates(baseStart as Date, d);
              if (weeks > 0) {
                setDurationWeeks(weeks);
              } else {
                setDurationWeeks(null);
              }
            }
          }}
        />

        <Text style={{ fontWeight: 'bold', marginBottom: 4 }}>
          {mode === 'rotation' ? 'Duration (Rotations):' : 'Duration (Weeks):'}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
          <TextInput
            placeholder={mode === 'rotation' ? "e.g. 3 (leave blank to auto-calc)" : "e.g. 4 or 4.5 (leave blank to auto-calc)"}
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
                let days = 0;
                if (mode === 'rotation') {
                  // duration input represents number of rotations
                  if (rotationLength && rotationLength > 0) {
                    days = parsed * rotationLength - 1;
                  } else {
                    // fallback to 7-day rotations if rotationLength unknown
                    days = parsed * 7 - 1;
                  }
                } else {
                  // weeks -> days
                  days = parsed * 7 - 1;
                }
                setEndDate(addDaysFloat(baseStart, days));
                if (!startDate) setStartDate(baseStart);
              }
            }}
            keyboardType="numeric"
          />
          <Text style={{ marginHorizontal: 6, color: '#666', fontWeight: '600' }}>or</Text>
          <TouchableOpacity
            style={{ paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, backgroundColor: durationWeeks === -1 ? colors.primary : colors.backgroundMuted }}
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
  // add split logic moved to AddSplitModal



  // Delete a split
  const handleDeleteSplit = async (splitId: string) => {
    // If the split being deleted is the current split, end its run today
    const todayIso = new Date().toISOString().slice(0, 10);
    const currentRun = activeRuns.find(r => r.split_id === splitId && r.active);
    if (currentRun && currentRun.id) {
      await supabase.from('split_runs').update({ end_date: todayIso, active: false }).eq('id', currentRun.id);
    }
    const { error } = await supabase.from('splits').delete().eq('id', splitId);
    if (error) {
      Alert.alert('Error', error.message);
    } else {
      if (selectedSplitId === splitId) setSelectedSplitId(null);
      fetchSplits();
      fetchActiveRun();
    }
  };

  // Link a day to a split (for rotation mode)
  const handleLinkDay = async (dayId: string, split: any) => {
    if (!selectedSplitId) return;
    setLinking(true);
    let payload: any = { split_id: selectedSplitId, day_id: dayId };
    if (split.mode === 'rotation') payload.order_index = splitDays.length;
  const { error } = await supabase.from('split_days').insert({ ...payload, day_id: payload.day_id ?? null });
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
  const { error } = await supabase.from('split_days').insert({ ...payload, day_id: payload.day_id ?? null });
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

  const ListHeader = () => (
    <View style={{ paddingHorizontal: 16 }}>
      <View style={styles.header}>
        <Text style={styles.title}>Splits</Text>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => setShowAddModal(true)}
        >
          <Text style={styles.addButtonText}>Add New Split</Text>
        </TouchableOpacity>
      </View>
  <View style={{ borderBottomWidth: 1, borderBottomColor: colors.backgroundMuted, marginBottom: 12 }} />
      {loading && <Text>Loading...</Text>}
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: 0 }]}> 
      {loading ? (
        <Text>Loading...</Text>
      ) : (
        <FlatList
          data={splits}
          keyExtractor={item => item.id}
          contentContainerStyle={{ paddingBottom: 24 }}
          ListHeaderComponent={ListHeader}
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
                  <Badge
                    text={item.mode === 'week' ? 'Weekly' : 'Rotation'}
                    backgroundColor={styles.modeBadge?.backgroundColor || colors.backgroundMuted}
                    color={styles.badgeText?.color || '#333'}
                    size="sm"
                    style={{ marginRight: 8 }}
                  />
                  {isSplitCurrentlyActive(item.id) && (
                    <Badge
                      text="Current"
                      backgroundColor={styles.currentBadge?.backgroundColor || colors.primary}
                      color={styles.badgeText?.color || '#fff'}
                      size="sm"
                    />
                  )}
                </View>
              </View>

              <View style={styles.splitFooter}>
                <View style={{ flex: 1 }}>
                  {(() => {
                    const run = activeRuns.find(r => r.split_id === item.id);
                    if (run && run.start_date) {
                      const s = parseDateOnlyLocal(run.start_date);
                      const e = run.end_date ? parseDateOnlyLocal(run.end_date) : null;
                      return (
                        <Text style={{ fontStyle: 'italic', color: '#666' }}>
                          {`Start: ${s ? s.toLocaleDateString() : run.start_date}`}
                          {e ? `  •  End: ${e.toLocaleDateString()}` : '  •  End: Forever'}
                        </Text>
                      );
                    }
                    return null;
                  })()}
                </View>

                <View style={styles.removeWrapper}>
                  <RemoveButton onPress={() => { setDeleteTargetId(item.id); setShowDeleteConfirm(true); }} label="Delete" accessibilityLabel={`Delete ${item.name}`} textStyle={styles.removeTextStyle} />
                </View>
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
                            <TouchableOpacity
                              style={styles.assignBtn}
                              onPress={() => {
                                setPendingDayId(`${idx}`);
                                setSelectedSplitId(item.id);
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
                      <Text style={styles.splitDaysTitle}>Rotation Days</Text>
                      {(() => {
                        // Determine number of rotation slots to display.
                        // Use existing splitDays order_index if present, otherwise fall back to a stored rotation length or 3.
                        let len = 3;
                        if (splitDays && splitDays.length > 0) {
                          const maxIndex = Math.max(...splitDays.map((sd: any) => (sd.order_index ?? 0)));
                          len = maxIndex >= 0 ? maxIndex + 1 : 3;
                        } else if ((item as any).rotation_length) {
                          const v = parseInt(String((item as any).rotation_length), 10);
                          if (!isNaN(v) && v > 0) len = v;
                        }

                        return Array.from({ length: len }).map((_, idx) => {
                          const sd = splitDays.find(sd => (sd.order_index ?? -1) === idx) || null;
                          const day = sd ? days.find(d => d.id === sd.day_id) : null;
                          return (
                            <View key={`rot-${idx}`} style={styles.splitDayBox}>
                              <Text style={{ width: 80 }}>{`Day ${idx + 1}:`}</Text>
                              <TouchableOpacity
                                style={styles.assignBtn}
                                onPress={() => {
                                  setPendingRotationIndex(idx);
                                  setSelectedSplitId(item.id);
                                  setShowWeekdayModal(true);
                                }}
                              >
                                <Text style={styles.assignBtnText}>{day?.name || 'Rest'}</Text>
                              </TouchableOpacity>
                            </View>
                          );
                        });
                      })()}
                    </>
                  )}

                </View>
              )}
            </TouchableOpacity>
          )}
        />
      )}

      <AddSplitModal
        visible={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setEditingSplit(null);
          setEditSplitWeekdays(new Array(7).fill(null));
          setEditSplitData(null);
        }}
        days={days}
        activeRuns={activeRuns}
        profile={profile}
        fetchActiveRun={fetchActiveRun}
        fetchSplits={fetchSplits}
        editingSplit={editingSplit}
        editSplitData={editSplitData}
      />



      {/* Day picker modal for assigning a day to a weekday or rotation slot on an existing split */}
      <Modal
        visible={showWeekdayModal}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setShowWeekdayModal(false);
          setPendingDayId(null);
          setPendingRotationIndex(null);
        }}
      >
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.3)' }}>
          <View style={{ backgroundColor: '#fff', padding: 20, borderRadius: 12, width: '90%', maxWidth: 420, maxHeight: '80%' }}>
            <ScrollView>
              <Text style={{ fontWeight: 'bold', fontSize: 16, marginBottom: 12 }}>Select Day</Text>
              {days.map(d => (
                <TouchableOpacity
                  key={d.id}
                  style={{ padding: 10, marginVertical: 2, backgroundColor: '#f5f5f5', borderRadius: 6 }}
                  onPress={async () => {
                    if (!selectedSplitId) return;
                    // Assigning to weekday
                    if (pendingDayId !== null) {
                      const weekdayIndex = parseInt(pendingDayId, 10);
                      const existing = splitDays.find(sd => sd.weekday === weekdayIndex);
                      if (existing) await handleRemoveSplitDay(existing.id);
                      const split = splits.find(s => s.id === selectedSplitId);
                      doLinkDay(d.id, split, weekdayIndex);
                      setShowWeekdayModal(false);
                      setPendingDayId(null);
                      return;
                    }
                    // Assigning to rotation index
                    if (pendingRotationIndex !== null) {
                      const idx = pendingRotationIndex;
                      const existing = splitDays.find(sd => sd.order_index === idx);
                      if (existing) await handleRemoveSplitDay(existing.id);
                      await supabase.from('split_days').insert({ split_id: selectedSplitId, day_id: d.id ?? null, weekday: null, order_index: idx });
                      fetchSplitDays(selectedSplitId);
                      setPendingRotationIndex(null);
                      setShowWeekdayModal(false);
                      return;
                    }
                  }}
                >
                  <Text>{d.name}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={{ padding: 10, marginVertical: 8, backgroundColor: '#eee', borderRadius: 6 }}
                onPress={async () => {
                  if (!selectedSplitId) return;
                  if (pendingDayId !== null) {
                    const weekdayIndex = parseInt(pendingDayId, 10);
                    const existing = splitDays.find(sd => sd.weekday === weekdayIndex);
                    if (existing) await handleRemoveSplitDay(existing.id);
                    setShowWeekdayModal(false);
                    setPendingDayId(null);
                    return;
                  }
                  if (pendingRotationIndex !== null) {
                    const idx = pendingRotationIndex;
                    const existing = splitDays.find(sd => sd.order_index === idx);
                    if (existing) await handleRemoveSplitDay(existing.id);
                    setPendingRotationIndex(null);
                    setShowWeekdayModal(false);
                  }
                }}
              >
                <Text>Set to Rest</Text>
              </TouchableOpacity>
              <View style={{ marginTop: 8 }}>
                <ModalButtons
                  leftLabel="Cancel"
                  rightLabel="Close"
                  onLeftPress={() => { setShowWeekdayModal(false); setPendingDayId(null); setPendingRotationIndex(null); }}
                  onRightPress={() => { setShowWeekdayModal(false); setPendingDayId(null); setPendingRotationIndex(null); }}
                  leftColor={colors.backgroundMuted}
                  rightColor={colors.primary}
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
              <Text style={{ fontWeight: 'bold', fontSize: 18, marginBottom: 12 }}>Delete Split?</Text>
              <Text style={{ marginBottom: 16 }}>Are you sure you want to permanently delete this split? This action cannot be undone.</Text>
              <View style={{ marginTop: 8 }}>
                <ModalButtons
                  leftLabel="Cancel"
                    rightLabel="Delete"
                    onLeftPress={() => { setShowDeleteConfirm(false); setDeleteTargetId(null); }}
                    onRightPress={async () => { if (deleteTargetId) await handleDeleteSplit(deleteTargetId); setShowDeleteConfirm(false); setDeleteTargetId(null); }}
                  leftColor={colors.backgroundMuted}
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
};

