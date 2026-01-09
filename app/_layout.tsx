import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { BibleProvider } from '@/context/BibleContext';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import '../global.css';

import { useColorScheme } from '@/hooks/use-color-scheme';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState, useRef } from 'react';
import { View, Image, Animated, Dimensions } from 'react-native';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [appIsReady, setAppIsReady] = useState(false);
  const fadeAnim = useRef(new Animated.Value(1)).current; // Initial opacity: 1

  useEffect(() => {
    async function prepare() {
      try {
        // Here we can load resources, api calls, etc.
        // Artificially delay for 2 seconds to show the splash (optional, for effect)
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (e) {
        console.warn(e);
      } finally {
        // Tell the application to render
        setAppIsReady(true);
      }
    }

    prepare();
  }, []);

  const onLayoutRootView = async () => {
    if (appIsReady) {
      // Hide the native splash screen immediately
      await SplashScreen.hideAsync();

      // Start the fade out animation of our custom view
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 1000, // 1 second fade out
        useNativeDriver: true,
      }).start();
    }
  };

  if (!appIsReady) {
    return null;
  }

  return (
    <BibleProvider>
      <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <Stack>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
          </Stack>
          <StatusBar style="auto" />
        </ThemeProvider>

        {/* Custom Splash Overlay for the Fade Effect */}
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: Dimensions.get('window').width,
            height: Dimensions.get('window').height,
            backgroundColor: '#ffffff', // Match your splash background color
            opacity: fadeAnim,
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 9999,
          }}
        >
          <Image
            source={require('../assets/images/splash-icon.png')}
            style={{ width: 200, height: 200, resizeMode: 'contain' }}
          />
        </Animated.View>
      </View>
    </BibleProvider>
  );
}
