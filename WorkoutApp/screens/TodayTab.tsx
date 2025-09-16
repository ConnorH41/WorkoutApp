
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TextInput, Button, FlatList, ActivityIndicator, Alert } from 'react-native';
import { supabase } from '../lib/supabase';
import { useProfileStore } from '../lib/profileStore';

export default function TodayTab() {
  const profile = useProfileStore((state) => state.profile);
  const [bodyweight, setBodyweight] = useState('');
  const [loading, setLoading] = useState(false);
  const [entries, setEntries] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (profile && profile.id) {
      fetchBodyweightEntries();
    }
  }, [profile?.id]);

  const fetchBodyweightEntries = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('bodyweight')
      .select('*')
      .eq('user_id', profile.id)
      .order('logged_at', { ascending: false })
      .limit(7);
    if (!error && data) {
      setEntries(data);
    }
    setLoading(false);
  };

  const handleLogBodyweight = async () => {
    if (!bodyweight || !profile || !profile.id) return;
    setSubmitting(true);
    const { error } = await supabase.from('bodyweight').insert({
      user_id: profile.id,
      weight: parseFloat(bodyweight),
    });
    setSubmitting(false);
    if (error) {
      Alert.alert('Error', error.message);
    } else {
      setBodyweight('');
      fetchBodyweightEntries();
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Today</Text>
      <Text style={styles.sectionTitle}>Log Bodyweight</Text>
      <View style={styles.row}>
        <TextInput
          style={styles.input}
          placeholder="Enter weight (kg)"
          value={bodyweight}
          onChangeText={setBodyweight}
          keyboardType="numeric"
        />
        <Button title={submitting ? 'Logging...' : 'Log'} onPress={handleLogBodyweight} disabled={submitting} />
      </View>
      <Text style={styles.sectionTitle}>Recent Entries</Text>
      {loading ? (
        <ActivityIndicator />
      ) : (
        <FlatList
          data={entries}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <Text>{item.logged_at}: {item.weight} kg</Text>
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
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
});
