import React, { useEffect, useRef } from 'react';
import { StyleSheet, Text, Animated } from 'react-native';
import { FONTS } from '../../lib/voiceStyles';

const STATUS_MESSAGES = {
  idle: 'NeoAgri तैयार है',
  connecting: 'Connecting...',
  listening: '🎙️ सुन रहा हूँ...',
  processing: '🤔 सोच रहा हूँ...',
  speaking: '🔊 NeoAgri बोल रहा है',
  offline: 'ऑफलाइन — Limited mode',
};

export default function StatusBanner({ status = 'idle' }) {
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const lastStatus = useRef(status);
  const [displayStatus, setDisplayStatus] = React.useState(status);

  useEffect(() => {
    if (status !== lastStatus.current) {
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => {
        setDisplayStatus(status);
        lastStatus.current = status;
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }).start();
      });
    } else {
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [status, opacityAnim]);

  return (
    <Animated.View style={[styles.banner, { opacity: opacityAnim }]}>
      <Text style={styles.text}>{STATUS_MESSAGES[displayStatus] || STATUS_MESSAGES.idle}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 60,
    alignSelf: 'center',
    backgroundColor: '#00000088',
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 20,
    zIndex: 10,
  },
  text: {
    ...FONTS.hindiSmall,
    color: '#FFFFFF',
  },
});
