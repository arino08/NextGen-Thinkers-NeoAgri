import React, { useEffect, useRef } from 'react';
import { StyleSheet, Text, Animated } from 'react-native';
import { FONTS } from '../../lib/voiceStyles';

const STATUS_MESSAGES = {
  idle: 'तैयार है',
  connecting: 'जुड़ रहा है...',
  listening: 'सुन रहा हूँ...',
  processing: 'सोच रहा हूँ...',
  speaking: 'बोल रहा है...',
  offline: 'ऑफ़लाइन',
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
    top: 56,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 16,
    zIndex: 10,
  },
  text: {
    ...FONTS.hindiSmall,
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    letterSpacing: 0.5,
  },
});
