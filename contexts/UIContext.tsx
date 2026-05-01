import React, { createContext, useContext, useState, useCallback } from 'react';
import { useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

interface UIContextType {
  tabBarOffset: any; // SharedValue<number>
  hideTabBar: () => void;
  showTabBar: () => void;
  isTabBarVisible: boolean;
}

const UIContext = createContext<UIContextType | undefined>(undefined);

export function UIProvider({ children }: { children: React.ReactNode }) {
  const tabBarOffset = useSharedValue(0);
  const [isTabBarVisible, setIsTabBarVisible] = useState(true);

  const hideTabBar = useCallback(() => {
    if (isTabBarVisible) {
      tabBarOffset.value = withTiming(150, { duration: 300 });
      setIsTabBarVisible(false);
    }
  }, [isTabBarVisible]);

  const showTabBar = useCallback(() => {
    if (!isTabBarVisible) {
      tabBarOffset.value = withSpring(0, { damping: 20, stiffness: 90 });
      setIsTabBarVisible(true);
    }
  }, [isTabBarVisible]);

  return (
    <UIContext.Provider value={{ tabBarOffset, hideTabBar, showTabBar, isTabBarVisible }}>
      {children}
    </UIContext.Provider>
  );
}

export function useUI() {
  const context = useContext(UIContext);
  if (context === undefined) {
    throw new Error('useUI must be used within a UIProvider');
  }
  return context;
}
