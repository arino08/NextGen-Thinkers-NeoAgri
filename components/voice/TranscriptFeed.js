import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Animated, FlatList } from 'react-native';
import { COLORS, FONTS } from '../../lib/voiceStyles';

export default function TranscriptFeed({ transcript = '', history = [] }) {
  const recentHistory = history.slice(-3);
  const cursorOpacity = useRef(new Animated.Value(1)).current;
  const flatListRef = useRef(null);

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(cursorOpacity, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(cursorOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [cursorOpacity]);

  useEffect(() => {
    if (flatListRef.current) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 50);
    }
  }, [transcript, history]);

  const renderItem = ({ item }) => {
    const isUser = item.role === 'user';
    return (
      <View style={[styles.bubble, isUser ? styles.userBubble : styles.aiBubble]}>
        <Text style={styles.text}>{item.text}</Text>
      </View>
    );
  };

  const renderFooter = () => {
    if (!transcript) return null;
    return (
      <View style={[styles.bubble, styles.userBubble]}>
        <Text style={styles.text}>
          {transcript}
          <Animated.Text style={[styles.cursor, { opacity: cursorOpacity }]}>|</Animated.Text>
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={recentHistory}
        keyExtractor={(item, index) => index.toString()}
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
    paddingHorizontal: 20,
    justifyContent: 'flex-end',
    maxHeight: 250, // limit height so it scrolls
  },
  listContent: {
    flexGrow: 1,
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
