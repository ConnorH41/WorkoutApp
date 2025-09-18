
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TextInput, Button, FlatList, TouchableOpacity, Alert, Modal, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { supabase } from '../lib/supabase';
import { useProfileStore } from '../lib/profileStore';

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
  const [showSetModal, setShowSetModal] = useState(false);
  const [pendingSplit, setPendingSplit] = useState<any>(null);
  const [calendarDate, setCalendarDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [numRotations, setNumRotations] = useState('1');
  // UX: selected duration preset (weeks) and whether user manually edited end
  const [weeksPreset, setWeeksPreset] = useState<number | null>(4);
  const [endManuallyEdited, setEndManuallyEdited] = useState(false);
  const iosInlineSupported = Platform.OS === 'ios' && parseFloat(String(Platform.Version)) >= 14;
  const toDateOnly = (d: Date) => d.toISOString().slice(0, 10);

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
  // Load current split run from database
  useEffect(() => {
    const fetchFromDb = async () => {
      if (!profile || !profile.id) return;
      const { data } = await supabase
        .from('split_runs')
        .select('*')
        .eq('user_id', profile.id)
        .eq('active', true)
        .order('created_at', { ascending: false })
        .limit(1);
      if (data && data.length > 0) {
        const run: any = data[0];
        setCurrentSplitId(run.split_id || null);
        setSplitStartDate(run.start_date ? new Date(run.start_date).toISOString() : null);
        setSplitEndDate(run.end_date ? new Date(run.end_date).toISOString() : null);
      }
    };
    fetchFromDb();
  }, []);


  // Open modal to set current split
  const handleSetCurrentSplit = (split: any) => {
    setPendingSplit(split);
    const defaultStart = getNextMonday(new Date());
    setCalendarDate(defaultStart);
    // default end date = start + 4 weeks (inclusive)
    const defaultWeeks = 4;
    setWeeksPreset(defaultWeeks);
    setEndDate(getEndDateForWeeks(defaultStart, defaultWeeks));
    setEndManuallyEdited(false);
    setNumRotations('1');
    setShowSetModal(true);
  };

  // Confirm setting current split with date and weeks/rotations
  const handleConfirmSetCurrentSplit = async () => {
    if (!pendingSplit) return;
    try {
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
        }
        await safeStorage.setItem('splitNumWeeks', weeks);
        await safeStorage.removeItem('splitNumRotations');
        // Persist to split_runs
        if (profile?.id) {
          // Deactivate any existing active run for this user
          await supabase.from('split_runs').update({ active: false }).eq('user_id', profile.id).eq('active', true);
          await supabase.from('split_runs').insert({
            split_id: pendingSplit.id,
            user_id: profile.id,
            start_date: toDateOnly(calendarDate),
            end_date: endDate ? toDateOnly(endDate) : null,
            num_weeks: parseInt(weeks, 10) || 1,
            num_rotations: null,
            active: true,
          });
          await fetchActiveRun();
        }
      } else {
        await safeStorage.setItem('splitNumRotations', numRotations);
        await safeStorage.removeItem('splitNumWeeks');
        // Persist to split_runs
        if (profile?.id) {
          await supabase.from('split_runs').update({ active: false }).eq('user_id', profile.id).eq('active', true);
          await supabase.from('split_runs').insert({
            split_id: pendingSplit.id,
            user_id: profile.id,
            start_date: toDateOnly(calendarDate),
            end_date: null,
            num_weeks: null,
            num_rotations: parseInt(numRotations, 10) || 1,
            active: true,
          });
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
  const [selectedSplitId, setSelectedSplitId] = useState<string | null>(null);
  const [splitDays, setSplitDays] = useState<any[]>([]);
  const [days, setDays] = useState<any[]>([]);
  const [linking, setLinking] = useState(false);
  // For week mode: modal to pick weekday
  const [showWeekdayModal, setShowWeekdayModal] = useState(false);
  const [pendingDayId, setPendingDayId] = useState<string | null>(null);

  // Helper to fetch active run after scheduling
  const fetchActiveRun = async () => {
    if (!profile || !profile.id) return;
    const { data, error } = await supabase
      .from('split_runs')
      .select('*')
      .eq('user_id', profile.id)
      .eq('active', true)
      .order('created_at', { ascending: false })
      .limit(1);
    if (!error && data && data.length > 0) {
      const run: any = data[0];
      setCurrentSplitId(run.split_id || null);
      setSplitStartDate(run.start_date ? new Date(run.start_date).toISOString() : null);
      setSplitEndDate(run.end_date ? new Date(run.end_date).toISOString() : null);
    } else if (!error) {
      setCurrentSplitId(null);
      setSplitStartDate(null);
      setSplitEndDate(null);
    }
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

  // Add a new split
  const handleAddSplit = async () => {
    if (!profile || !profile.id || !newSplit.name.trim()) return;
    setAdding(true);
    const { data, error } = await supabase
      .from('splits')
      .insert([{ name: newSplit.name.trim(), mode: newSplit.mode, user_id: profile.id }])
      .select();
    setAdding(false);
    if (error) {
      Alert.alert('Error', error.message);
    } else {
      setNewSplit({ name: '', mode: 'week' });
      fetchSplits();
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
      <Text style={styles.title}>Splits</Text>
      <View style={styles.row}>
        <TextInput
          style={styles.input}
          placeholder="Add new split (e.g. PPL)"
          value={newSplit.name}
          onChangeText={v => setNewSplit(s => ({ ...s, name: v }))}
        />
        <Text style={{ marginHorizontal: 8 }}>Mode:</Text>
        <TextInput
          style={[styles.input, { width: 80 }]}
          value={newSplit.mode}
          onChangeText={v => setNewSplit(s => ({ ...s, mode: v }))}
          placeholder="week/rotation"
        />
        <Button title={adding ? 'Adding...' : 'Add'} onPress={handleAddSplit} disabled={adding} />
      </View>
      {loading ? (
        <Text>Loading...</Text>
      ) : (
        <FlatList
          data={splits}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <View style={styles.splitBox}>
              <TouchableOpacity onPress={() => setSelectedSplitId(item.id)}>
                <Text style={styles.splitName}>{item.name} ({item.mode})
                  {currentSplitId === item.id && '  [Current]'}</Text>
              </TouchableOpacity>
              <View style={styles.splitActions}>
                <TouchableOpacity onPress={() => handleDeleteSplit(item.id)}>
                  <Text style={styles.deleteBtn}>Delete</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleSetCurrentSplit(item)}>
                  <Text style={{ color: '#007AFF', marginLeft: 12 }}>
                    {currentSplitId === item.id ? 'Change' : 'Schedule Split'}
                  </Text>
                </TouchableOpacity>
      {/* Modal for setting current split with calendar and weeks/rotations */}
      <Modal
        visible={showSetModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSetModal(false)}
      >
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.3)' }}>
          <View style={{ backgroundColor: '#fff', padding: 16, borderRadius: 12, width: 320 }}>
            <Text style={{ fontWeight: 'bold', fontSize: 18, marginBottom: 12 }}>Schedule Split</Text>
            
            {pendingSplit?.mode === 'week' ? (
              <>
                <Text style={{ marginBottom: 4 }}>Start Date:</Text>
                <TouchableOpacity
                  style={{ padding: 10, backgroundColor: '#eee', borderRadius: 6, marginBottom: 8 }}
                  onPress={() => { setShowStartPicker(v => !v); setShowEndPicker(false); }}
                >
                  <Text>{calendarDate.toDateString()}</Text>
                </TouchableOpacity>
                {showStartPicker && (
                  <DateTimePicker
                    value={calendarDate}
                    mode="date"
                    display={Platform.OS === 'ios' ? (iosInlineSupported ? 'inline' : 'spinner') : 'calendar'}
                    // @ts-ignore: iOS specific prop
                    preferredDatePickerStyle={iosInlineSupported ? 'inline' : undefined}
                    // @ts-ignore: iOS specific prop
                    themeVariant={Platform.OS === 'ios' ? 'light' : undefined}
                    onChange={(event, date) => {
                      if (Platform.OS === 'android') setShowStartPicker(false);
                      if (date) {
                        setCalendarDate(date);
                        if (weeksPreset && !endManuallyEdited) {
                          setEndDate(getEndDateForWeeks(date, weeksPreset));
                        }
                      }
                    }}
                    style={{ backgroundColor: '#fff', marginBottom: 8, width: '100%', height: iosInlineSupported ? 220 : undefined }}
                  />
                )}

                <Text style={{ marginBottom: 4 }}>End Date:</Text>
                <TouchableOpacity
                  style={{ padding: 10, backgroundColor: '#eee', borderRadius: 6, marginBottom: 8 }}
                  onPress={() => { setShowEndPicker(v => !v); setShowStartPicker(false); setEndManuallyEdited(true); setWeeksPreset(null); }}
                >
                  <Text>{endDate ? endDate.toDateString() : 'Select end date'}</Text>
                </TouchableOpacity>
                {showEndPicker && (
                  <DateTimePicker
                    value={endDate ?? calendarDate}
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
                        setEndManuallyEdited(true);
                        setWeeksPreset(null);
                      }
                    }}
                    style={{ backgroundColor: '#fff', marginBottom: 8, width: '100%', height: iosInlineSupported ? 220 : undefined }}
                  />
                )}

                {/* Preset duration chips */}
                <Text style={{ fontWeight: 'bold', marginBottom: 4 }}>Presets</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8 }}>
                  {[4, 6, 8, 12].map(w => (
                    <TouchableOpacity
                      key={w}
                      style={{ paddingVertical: 6, paddingHorizontal: 10, borderRadius: 16, backgroundColor: weeksPreset === w ? '#007AFF' : '#e0e0e0', marginRight: 8, marginBottom: 8 }}
                      onPress={() => {
                        setWeeksPreset(w);
                        setEndManuallyEdited(false);
                        setEndDate(getEndDateForWeeks(calendarDate, w));
                      }}
                    >
                      <Text style={{ color: weeksPreset === w ? '#fff' : '#333', fontWeight: 'bold' }}>{w} weeks</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Inline summary */}
                <Text style={{ marginBottom: 4 }}>
                  {endDate ? `${calendarDate.toDateString()} → ${endDate.toDateString()}` : 'Select a date range'}
                </Text>
                <Text style={{ marginBottom: 8 }}>Duration: {computedWeeks} {computedWeeks === 1 ? 'week' : 'weeks'}</Text>
                {endBeforeStart && <Text style={{ color: 'red', marginBottom: 8 }}>End date must be the same or after start date.</Text>}
              </>
            ) : (
              <>
                <Text style={{ marginBottom: 4 }}>Number of Rotations:</Text>
                <TextInput
                  style={[styles.input, { marginBottom: 12 }]}
                  value={numRotations}
                  onChangeText={setNumRotations}
                  keyboardType="numeric"
                />
              </>
            )}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Button title="Cancel" onPress={() => setShowSetModal(false)} />
              </View>
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Button title="Schedule" onPress={handleConfirmSetCurrentSplit} disabled={pendingSplit?.mode === 'week' && endBeforeStart} />
              </View>
            </View>
          </View>
        </View>
      </Modal>
              </View>
              {currentSplitId === item.id && (
                <View style={{ marginTop: 8 }}>
                  <Text style={{ fontStyle: 'italic', color: '#666' }}>
                    {splitStartDate ? `Start: ${new Date(splitStartDate).toLocaleDateString()}` : 'Start: —'}
                    {`  •  `}
                    {splitEndDate ? `End: ${new Date(splitEndDate).toLocaleDateString()}` : 'End: —'}
                  </Text>
                </View>
              )}
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
                                setPendingDayId(`${idx}`); // use weekday as pendingDayId
                                setShowWeekdayModal(true);
                              }}
                            >
                              <Text style={styles.assignBtnText}>{assignedDay ? assignedDay.name : 'Rest'}</Text>
                            </TouchableOpacity>
                            {/* Remove button column removed for week splits; use picker to set to Rest */}
                          </View>
                        );
                      })}
                    </>
                  ) : (
                    <>
                      <Text style={styles.splitDaysTitle}>Rotation Days</Text>
                      <FlatList
                        data={splitDays}
                        keyExtractor={sd => sd.id}
                        renderItem={({ item: sd, index }) => {
                          const day = days.find(d => d.id === sd.day_id);
                          return (
                            <View style={styles.splitDayBox}>
                              <Text>{`#${sd.order_index + 1}`}: {day?.name}</Text>
                              <TouchableOpacity onPress={() => handleRemoveSplitDay(sd.id)}>
                                <Text style={styles.deleteBtn}>Remove</Text>
                              </TouchableOpacity>
                            </View>
                          );
                        }}
                      />
                      <Text style={styles.splitDaysTitle}>Add Day to Rotation</Text>
                      <FlatList
                        data={days.filter(d => !splitDays.some(sd => sd.day_id === d.id))}
                        keyExtractor={d => d.id}
                        renderItem={({ item: d }) => (
                          <TouchableOpacity
                            style={styles.addDayBtn}
                            onPress={() => handleLinkDay(d.id, item)}
                            disabled={linking}
                          >
                            <Text style={styles.addDayBtnText}>Add {d.name}</Text>
                          </TouchableOpacity>
                        )}
                      />
                    </>
                  )}
      {/* Day picker modal for assigning a day to a weekday */}
      <Modal
        visible={showWeekdayModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowWeekdayModal(false)}
      >
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.3)' }}>
          <View style={{ backgroundColor: '#fff', padding: 24, borderRadius: 12, width: 300 }}>
            <Text style={{ fontWeight: 'bold', fontSize: 18, marginBottom: 12 }}>Assign Day to {pendingDayId !== null ? WEEKDAYS[parseInt(pendingDayId)] : ''}</Text>
            {days.length === 0 && <Text>No days created yet.</Text>}
            {days.map((d) => (
              <TouchableOpacity
                key={d.id}
                style={{ padding: 10, marginVertical: 2, backgroundColor: '#eee', borderRadius: 6 }}
                onPress={() => {
                  if (pendingDayId && selectedSplitId) {
                    const split = splits.find(s => s.id === selectedSplitId);
                    // Remove any existing assignment for this weekday first
                    const existing = splitDays.find(sd => sd.weekday === parseInt(pendingDayId));
                    if (existing) handleRemoveSplitDay(existing.id);
                    doLinkDay(d.id, split, parseInt(pendingDayId));
                  }
                }}
              >
                <Text>{d.name}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={{ padding: 10, marginVertical: 2, backgroundColor: '#eee', borderRadius: 6 }}
              onPress={() => {
                // Remove assignment for this weekday (set to Rest)
                if (pendingDayId && selectedSplitId) {
                  const existing = splitDays.find(sd => sd.weekday === parseInt(pendingDayId));
                  if (existing) handleRemoveSplitDay(existing.id);
                  setShowWeekdayModal(false);
                  setPendingDayId(null);
                }
              }}
            >
              <Text>Set to Rest</Text>
            </TouchableOpacity>
            <Button title="Cancel" onPress={() => setShowWeekdayModal(false)} />
          </View>
        </View>
      </Modal>
                </View>
              )}
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 16,
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
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    backgroundColor: '#fafafa',
  },
  splitName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  splitActions: {
    flexDirection: 'row',
    marginTop: 4,
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
});
