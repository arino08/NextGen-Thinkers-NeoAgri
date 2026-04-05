import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Animated, FlatList } from 'react-native';
import { COLORS, FONTS } from '../../lib/voiceStyles';

export default function TranscriptFeed({ transcript = '', agentTranscript = '', history = [] }) {
  const cursorOpacity = useRef(new Animated.Value(1)).current;
  const flatListRef = useRef(null);

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(cursorOpacity, { toValue: 0, duration: 500, useNativeDriver: true }),
        Animated.timing(cursorOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [cursorOpacity]);

  useEffect(() => {
    if (flatListRef.current) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 50);
    }
  }, [transcript, agentTranscript, history]);

  const renderItem = ({ item }) => {
    const isUser = item.role === 'user';
    return (
      <View style={[styles.bubble, isUser ? styles.userBubble : styles.aiBubble]}>
        <Text style={[styles.roleLabel, isUser ? styles.userLabel : styles.aiLabel]}>
          {isUser ? 'आप' : 'NeoAgri'}
        </Text>
        <Text style={styles.text}>{item.text}</Text>
      </View>
    );
  };

  const renderFooter = () => {
    const elements = [];

    // Agent streaming transcript
    if (agentTranscript) {
      elements.push(
        <View key="agent-stream" style={[styles.bubble, styles.aiBubble]}>
          <Text style={[styles.roleLabel, styles.aiLabel]}>NeoAgri</Text>
          <Text style={styles.text}>
            {agentTranscript}
            <Animated.Text style={[styles.cursor, { opacity: cursorOpacity }]}>▊</Animated.Text>
          </Text>
        </View>
      );
    }

    return elements.length > 0 ? <>{elements}</> : null;
  };

  if (history.length === 0 && !agentTranscript) {
    return null;
  }

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={history}
        keyExtractor={(_, index) => index.toString()}
        renderItem={renderItem}
        ListFooterComponent={renderFooter}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingHorizontal: 16,
    justifyContent: 'flex-end',
    maxHeight: 320,
  },
  listContent: {
    flexGrow: 1,
    justifyContent: 'flex-end',
  },
  bubble: {
    maxWidth: '85%',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
    marginBottom: 8,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: 'rgba(0,200,150,0.08)',
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderBottomLeftRadius: 4,
  },
  roleLabel: {
    fontSize: 10,
    marginBottom: 3,
    fontWeight: '500',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  userLabel: {
    color: COLORS.orbTeal,
  },
  aiLabel: {
    color: COLORS.orbBlue,
  },
  text: {
    ...FONTS.hindiBody,
  },
  cursor: {
    ...FONTS.hindiBody,
    color: COLORS.orbTeal,
  },
});
