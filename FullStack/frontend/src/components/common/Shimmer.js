import React from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';

const Shimmer = ({ width = '100%', height = 20, borderRadius = 8, style }) => {
  const { theme, isDark } = useTheme();
  const animatedValue = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(animatedValue, {
        toValue: 1,
        duration: 1500,
        useNativeDriver: true,
      })
    );
    animation.start();
    return () => animation.stop();
  }, []);

  const translateX = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [-200, 200],
  });

  const colors = isDark
    ? ['#3A3A3A', '#2A2A2A', '#3A3A3A']
    : ['#E0E0E0', '#F5F5F5', '#E0E0E0'];

  return (
    <View
      style={[
        styles.container,
        { width, height, borderRadius, backgroundColor: colors[0] },
        style,
      ]}
    >
      <Animated.View
        style={[
          styles.shimmer,
          { transform: [{ translateX }] },
        ]}
      >
        <LinearGradient
          colors={colors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.gradient}
        />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  shimmer: {
    ...StyleSheet.absoluteFillObject,
  },
  gradient: {
    flex: 1,
    width: 200,
  },
});

export default Shimmer;
