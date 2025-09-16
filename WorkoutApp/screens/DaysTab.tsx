import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function DaysTab() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Days</Text>
      {/* CRUD UI for workout days and exercises will go here */}
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
});
