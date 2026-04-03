import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, FONTS } from '../../lib/voiceStyles';

export default function TranscriptFeed({ transcript = '', history = [] }) {
  const recentHistory = history.slice(-3);

  return (
    <View style={styles.container}>
      {recentHistory.map((item, index) => {
        const isUser = item.role === 'user';
        return (
          <View 
            key={index} 
            style={[styles.bubble, isUser ? styles.userBubble : styles.aiBubble]}
          >
            <Text style={styles.text}>{item.text}</Text>
          </View>
        );
      })}
      
      {!!transcript && (
        <View style={[styles.bubble, styles.userBubble]}>
          <Text style={styles.text}>
            {transcript}
            <Text style={styles.cursor}>|</Text>
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingHorizontal: 20,
    justifyContent: 'flex-end',
  },
  bubble: {
    maxWidth: '85%',
    padding: 14,
    borderRadius: 16,
    marginBottom: 12,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: '#0D3D2C',
    borderWidth: 1,
    borderColor: COLORS.orbTeal,
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.cardBg,
    borderBottomLeftRadius: 4,
  },
  text: {
    ...FONTS.hindiBody,
  },
  cursor: {
    ...FONTS.hindiBody,
    color: COLORS.orbTeal,
  }
});
