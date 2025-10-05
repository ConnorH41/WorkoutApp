import React, { useState } from 'react';
import { View, Text, Switch, StyleSheet } from 'react-native';
import { colors, darkColors } from '../styles/theme';

export default function SettingsScreen({ navigation }) {
  const [darkMode, setDarkMode] = useState(false);

  // You would want to lift this state up to context or redux for global theme switching
  const theme = darkMode ? darkColors : colors;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}> 
      <Text style={[styles.title, { color: theme.text }]}>Settings</Text>
      <View style={styles.row}>
        <Text style={{ color: theme.text, fontSize: 16 }}>Dark Mode</Text>
        <Switch
          value={darkMode}
          onValueChange={setDarkMode}
          thumbColor={darkMode ? theme.primary : theme.muted}
          trackColor={{ false: theme.muted, true: theme.primary }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 24,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
});
