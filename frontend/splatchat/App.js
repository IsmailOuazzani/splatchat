import React, { useContext } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { AuthProvider, AuthContext } from './AuthContext';
import DebugScreen from './screens/DebugScreen';
import CameraScreen from './screens/CameraScreen';
import ConversationsListScreen from './screens/ConversationsListScreen';
import LoginScreen from './screens/LoginScreen';
import ProfileScreen from './screens/ProfileScreen';
import Ionicons from 'react-native-vector-icons/Ionicons';

export const defaultTabBarStyle = {
  backgroundColor: '#fff',
  position: 'absolute',
  bottom: 0,
  left: 0,
  right: 0,
};

export default function App() {
  const Tab = createMaterialTopTabNavigator(); // Use MaterialTopTabNavigator

  const MainApp = () => {
    const { user } = useContext(AuthContext);
    if (!user) {
      return <LoginScreen />;
    }
    return (
      <Tab.Navigator
        initialRouteName="Camera"
        screenOptions={{
          tabBarShowIcon: true,
          tabBarIndicatorStyle: { backgroundColor: 'transparent' },
          tabBarStyle: defaultTabBarStyle,
          swipeEnabled: true,
          tabBarShowLabel: false,
        }}
      >
        {/* <Tab.Screen
          name="Debug"
          component={DebugScreen}
          options={{
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons
                name={focused ? 'code-outline' : 'code-outline'}
                size={size}
                color={color}
              />
            ),
          }}
        /> */}
        <Tab.Screen
          name="Conversations"
          component={ConversationsListScreen}
          options={{
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons
                name={focused ? 'chatbubbles' : 'chatbubbles-outline'}
                size={size}
                color={color}
              />
            ),
          }}
        />
        <Tab.Screen
          name="Camera"
          component={CameraScreen}
          options={{
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons
                name={focused ? 'camera' : 'camera-outline'}
                size={size}
                color={color}
              />
            ),
          }}
        />
        <Tab.Screen
          name="Profile"
          component={ProfileScreen}
          options={{
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons
                name={focused ? 'person' : 'person-outline'}
                size={size}
                color={color}
              />
            ),
          }}
        />
      </Tab.Navigator>
    );
  };

  return (
    <AuthProvider>
      <NavigationContainer>
        <MainApp />
      </NavigationContainer>
    </AuthProvider>
  );
}
