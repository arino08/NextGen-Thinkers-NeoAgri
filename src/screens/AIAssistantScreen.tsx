import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Message = {
  id: number;
  type: 'ai' | 'user';
  text: string;
};

export default function AIAssistantScreen() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const scrollRef = useRef<any>(null);

  // 🔥 typing animation
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isTyping) {
      Animated.loop(
        Animated.stagger(150, [
          bounce(dot1),
          bounce(dot2),
          bounce(dot3),
        ])
      ).start();
    }
  }, [isTyping]);

  const bounce = (val: Animated.Value) =>
    Animated.sequence([
      Animated.timing(val, { toValue: -6, duration: 250, useNativeDriver: true }),
      Animated.timing(val, { toValue: 0, duration: 250, useNativeDriver: true }),
    ]);

  const sendMessage = (text: string) => {
    if (!text.trim() || isTyping) return;

    const userMsg: Message = {
      id: Date.now(),
      type: 'user',
      text,
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsTyping(true);

    let reply = "Didn't understand that.";
    const lower = text.toLowerCase();

    if (lower.includes('hi') || lower.includes('hello')) {
      reply = "Hey 👋 How can I help you?";
    } else if (lower.includes('crop')) {
      reply = "Tell me your crop issue 🌾";
    } else if (lower.includes('weather')) {
      reply = "Share location for weather 🌤️";
    } else if (lower.includes('soil')) {
      reply = "I’ll help with soil nutrients 🌱";
    }

    setTimeout(() => {
      const aiMsg: Message = {
        id: Date.now() + 1,
        type: 'ai',
        text: reply,
      };

      setMessages((prev) => [...prev, aiMsg]);
      setIsTyping(false);
    }, 1500);
  };

  const handleSend = () => {
    sendMessage(input);
    setInput('');
  };

  return (
    <SafeAreaView style={styles.container}>
      
      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🌱 Farm AI</Text>
        <Text style={styles.headerSub}>Ask anything about farming</Text>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >

        {/* CHAT */}
        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={styles.chat}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() =>
            scrollRef.current?.scrollToEnd({ animated: true })
          }
        >
          {messages.length === 0 && (
            <Text style={styles.empty}>Start chatting 👇</Text>
          )}

          {messages.map((m) => (
            <View
              key={m.id}
              style={[
                styles.msg,
                m.type === 'user' ? styles.user : styles.ai,
              ]}
            >
              <Text style={m.type === 'user' ? styles.userText : styles.aiText}>
                {m.text}
              </Text>
            </View>
          ))}

          {isTyping && (
            <View style={[styles.msg, styles.ai]}>
              <View style={{ flexDirection: 'row', gap: 5 }}>
                <Animated.View style={[styles.dot, { transform: [{ translateY: dot1 }] }]} />
                <Animated.View style={[styles.dot, { transform: [{ translateY: dot2 }] }]} />
                <Animated.View style={[styles.dot, { transform: [{ translateY: dot3 }] }]} />
              </View>
            </View>
          )}
        </ScrollView>

        {/* QUICK BUTTONS */}
        <View style={styles.quick}>
          {['Crop', 'Weather', 'Soil'].map((item) => (
            <TouchableOpacity
              key={item}
              disabled={isTyping}
              onPress={() => sendMessage(item)}
              style={styles.quickBtn}
            >
              <Text style={styles.quickText}>{item}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* INPUT */}
        <View style={styles.inputRow}>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Ask your question..."
            style={styles.input}
            editable={!isTyping}
          />
          <TouchableOpacity
            onPress={handleSend}
            disabled={isTyping}
            style={styles.send}
          >
            <Text style={{ color: '#fff' }}>➤</Text>
          </TouchableOpacity>
        </View>

      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F7F4' },

  header: {
    padding: 16,
    backgroundColor: '#E8F5E9',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2E7D32',
  },
  headerSub: {
    fontSize: 13,
    color: '#4CAF50',
  },

  chat: { padding: 12, gap: 10 },

  msg: {
    padding: 12,
    borderRadius: 14,
    maxWidth: '75%',
  },
  user: {
    alignSelf: 'flex-end',
    backgroundColor: '#4CAF50',
  },
  ai: {
    alignSelf: 'flex-start',
    backgroundColor: '#fff',
  },

  userText: { color: '#fff' },
  aiText: { color: '#333' },

  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#999',
  },

  quick: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    padding: 10,
  },

  quickBtn: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },

  quickText: {
    color: '#2E7D32',
    fontWeight: '600',
  },

  inputRow: {
    flexDirection: 'row',
    padding: 10,
    backgroundColor: '#F4F7F4',
    borderTopWidth: 1,
    borderTopColor: '#ddd',
  },

  input: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
  },

  send: {
    marginLeft: 8,
    backgroundColor: '#4CAF50',
    paddingHorizontal: 16,
    justifyContent: 'center',
    borderRadius: 12,
  },

  empty: {
    textAlign: 'center',
    marginTop: 40,
    color: '#777',
  },
});