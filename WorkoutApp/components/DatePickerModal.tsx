import React, { useEffect, useState } from 'react';
import { Modal, View, Text, TouchableOpacity, Platform } from 'react-native';
import { colors } from '../styles/theme';
import DateTimePicker from '@react-native-community/datetimepicker';
import styles from '../styles/todayStyles';

type Props = {
  visible: boolean;
  initialDate?: Date | null;
  onCancel: () => void;
  onConfirm: (isoDate: string) => void;
};

export default function DatePickerModal({ visible, initialDate, onCancel, onConfirm }: Props) {
  const [date, setDate] = useState<Date | null>(initialDate ?? new Date());
  const iosInlineSupported = Platform.OS === 'ios' && parseFloat(String(Platform.Version)) >= 14;
  const [showInlinePicker, setShowInlinePicker] = useState<boolean>(iosInlineSupported);

  useEffect(() => {
    setDate(initialDate ?? new Date());
  }, [initialDate]);

  const handleChange = (event: any, d?: Date | undefined) => {
    if (!d) {
      // dismissed on Android
      setShowInlinePicker(false);
      return;
    }
    setDate(d);
    // Create a date-only string using local date components to avoid
    // timezone/UTC shifts that occur with toISOString().
    const pad = (n: number) => String(n).padStart(2, '0');
    const iso = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    // On Android, confirm immediately when selecting from native picker
    if (Platform.OS === 'android') {
      onConfirm(iso);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onCancel}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={{ fontSize: 18, fontWeight: '700', marginBottom: 12 }}>Select Date</Text>

          {Platform.OS === 'android' && (
            <TouchableOpacity
              onPress={() => setShowInlinePicker(true)}
              style={{ padding: 12, backgroundColor: colors.textMuted, borderRadius: 8, marginBottom: 12, alignItems: 'center' }}
            >
              <Text>{date ? date.toDateString() : 'Choose date'}</Text>
            </TouchableOpacity>
          )}

          {(showInlinePicker || Platform.OS === 'ios') && (
            <DateTimePicker
              value={date || new Date()}
              mode="date"
              display={Platform.OS === 'ios' ? (iosInlineSupported ? 'inline' : 'spinner') : 'calendar'}
              // @ts-ignore: iOS specific prop
              preferredDatePickerStyle={iosInlineSupported ? 'inline' : undefined}
              // @ts-ignore: iOS specific prop
              themeVariant={Platform.OS === 'ios' ? 'light' : undefined}
              // @ts-ignore: iOS specific prop for accent color
              accentColor={colors.primary}
              // @ts-ignore: Android specific prop for text color
              textColor={colors.primary}
              onChange={handleChange}
            />
          )}

          <View style={{ flexDirection: 'row', marginTop: 12 }}>
            <TouchableOpacity onPress={onCancel} style={{ flex: 1, marginRight: 8, padding: 12, backgroundColor: colors.textMuted, borderRadius: 8, alignItems: 'center' }}>
              <Text style={{ color: colors.text, fontWeight: '700' }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { if (date) {
                const pad = (n: number) => String(n).padStart(2, '0');
                onConfirm(`${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`);
              } }} style={{ flex: 1, padding: 12, backgroundColor: colors.primary, borderRadius: 8, alignItems: 'center' }}>
              <Text style={{ color: colors.background, fontWeight: '700' }}>Select</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
