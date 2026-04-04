import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Vibration } from 'react-native';
import { COLORS } from '../../lib/voiceStyles';

const KEYS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['', '0', '⌫'],
];

export default function PinPad({ value = '', onChange, maxLength = 4 }) {
  function handleKey(key) {
    if (key === '') return;
    Vibration.vibrate(20);
    if (key === '⌫') {
      onChange(value.slice(0, -1));
    } else if (value.length < maxLength) {
      onChange(value + key);
    }
  }

  return (
    <View style={styles.container}>
      {/* Dots indicator */}
      <View style={styles.dots}>
        {Array.from({ length: maxLength }).map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              i < value.length ? styles.dotFilled : styles.dotEmpty,
            ]}
          />
        ))}
      </View>

      {/* Keypad grid */}
      {KEYS.map((row, ri) => (
        <View key={ri} style={styles.row}>
          {row.map((key, ki) => (
            <TouchableOpacity
              key={ki}
              style={[styles.key, key === '' && styles.keyInvisible]}
              onPress={() => handleKey(key)}
              activeOpacity={key === '' ? 1 : 0.6}
            >
              <Text style={[styles.keyText, key === '⌫' && styles.backspace]}>
                {key}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 8,
  },
  dots: {
    flexDirection: 'row',
    gap: 18,
    marginBottom: 24,
  },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  dotFilled: {
    backgroundColor: COLORS.orbTeal,
  },
  dotEmpty: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#3a3a3a',
  },
  row: {
    flexDirection: 'row',
    gap: 16,
  },
  key: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#1a1a1a',
    alignItems: 'center',
    justifyContent: 'center',
    margin: 4,
  },
  keyInvisible: {
    backgroundColor: 'transparent',
  },
  keyText: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '400',
  },
  backspace: {
    fontSize: 22,
    color: '#aaaaaa',
  },
});
