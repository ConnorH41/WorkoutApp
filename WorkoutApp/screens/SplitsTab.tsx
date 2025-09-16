
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TextInput, Button, FlatList, TouchableOpacity, Alert, Picker } from 'react-native';
import { supabase } from '../lib/supabase';
import { useProfileStore } from '../lib/profileStore';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function SplitsTab() {
  const profile = useProfileStore((state) => state.profile);
  const [splits, setSplits] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [newSplit, setNewSplit] = useState({ name: '', mode: 'week' });
  const [adding, setAdding] = useState(false);
  const [selectedSplitId, setSelectedSplitId] = useState<string | null>(null);
  const [splitDays, setSplitDays] = useState<any[]>([]);
  const [days, setDays] = useState<any[]>([]);
  const [linking, setLinking] = useState(false);

  useEffect(() => {
    if (profile && profile.id) {
      fetchSplits();
      fetchDays();
    }
  }, [profile?.id]);

  const fetchSplits = async () => {
    setLoading(true);
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

  const fetchDays = async () => {
    const { data, error } = await supabase
      .from('days')
      .select('*')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: true });
    if (!error && data) {
      setDays(data);
    }
  };

  const fetchSplitDays = async (splitId: string) => {
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

  const handleAddSplit = async () => {
    if (!newSplit.name.trim() || !profile || !profile.id) return;
    setAdding(true);
    const { error } = await supabase.from('splits').insert({
      user_id: profile.id,
      name: newSplit.name.trim(),
      mode: newSplit.mode,
    });
    setAdding(false);
    if (error) {
      Alert.alert('Error', error.message);
    } else {
      setNewSplit({ name: '', mode: 'week' });
      fetchSplits();
    }
  };

  const handleDeleteSplit = async (id: string) => {
    Alert.alert('Delete Split', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          const { error } = await supabase.from('splits').delete().eq('id', id);
          if (error) {
            Alert.alert('Error', error.message);
          } else {
            setSelectedSplitId(null);
            setSplitDays([]);
            fetchSplits();
          }
        }
      }
    ]);
  };

  // Link day to split (week or rotation)
  const handleLinkDay = async (dayId: string, index: number) => {
    if (!selectedSplitId) return;
    setLinking(true);
    const split = splits.find(s => s.id === selectedSplitId);
    let payload: any = { split_id: selectedSplitId, day_id: dayId };
    if (split.mode === 'week') payload.weekday = index;
    if (split.mode === 'rotation') payload.order_index = index;
    const { error } = await supabase.from('split_days').insert(payload);
    setLinking(false);
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

  // When selecting a split, fetch its days
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
                <Text style={styles.splitName}>{item.name} ({item.mode})</Text>
              </TouchableOpacity>
              <View style={styles.splitActions}>
                <TouchableOpacity onPress={() => handleDeleteSplit(item.id)}>
                  <Text style={styles.deleteBtn}>Delete</Text>
                </TouchableOpacity>
              </View>
              {selectedSplitId === item.id && (
                <View style={styles.splitDaysSection}>
                  <Text style={styles.splitDaysTitle}>Linked Days</Text>
                  {splitDays.length === 0 && <Text>No days linked yet.</Text>}
                  <FlatList
                    data={splitDays}
                    keyExtractor={sd => sd.id}
                    renderItem={({ item: sd, index }) => {
                      const day = days.find(d => d.id === sd.day_id);
                      return (
                        <View style={styles.splitDayBox}>
                          <Text>{item.mode === 'week' ? WEEKDAYS[sd.weekday] : `#${sd.order_index + 1}`}: {day?.name}</Text>
                          <TouchableOpacity onPress={() => handleRemoveSplitDay(sd.id)}>
                            <Text style={styles.deleteBtn}>Remove</Text>
                          </TouchableOpacity>
                        </View>
                      );
                    }}
                  />
                  <Text style={styles.splitDaysTitle}>Add Day to Split</Text>
                  <FlatList
                    data={days.filter(d => !splitDays.some(sd => sd.day_id === d.id))}
                    keyExtractor={d => d.id}
                    renderItem={({ item: d, index }) => (
                      <TouchableOpacity
                        style={styles.addDayBtn}
                        onPress={() => handleLinkDay(d.id, item.mode === 'week' ? index : splitDays.length)}
                        disabled={linking}
                      >
                        <Text style={styles.addDayBtnText}>Add {d.name} ({item.mode === 'week' ? WEEKDAYS[index] : `#${splitDays.length + 1}`})</Text>
                      </TouchableOpacity>
                    )}
                  />
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
});
