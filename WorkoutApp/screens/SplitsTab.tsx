import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function SplitsTab() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Splits</Text>
      {/* Split schedule management UI will go here */}
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
