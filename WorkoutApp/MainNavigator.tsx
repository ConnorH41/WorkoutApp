import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import TodayTab from './screens/TodayTab';
import DaysTab from './screens/DaysTab';
import SplitsTab from './screens/SplitsTab';
import { colors } from './styles/theme';
let IconFeather: any = null;
try { IconFeather = require('@expo/vector-icons').Feather; } catch (e) { IconFeather = null; }

const Tab = createBottomTabNavigator();

export default function MainNavigator() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: '#666',
          tabBarIcon: ({ color, size }) => {
            if (!IconFeather) return null;
            let name = 'circle';
            if (route.name === 'Today') name = 'home';
            else if (route.name === 'Days') name = 'calendar';
            else if (route.name === 'Splits') name = 'layers';
            return <IconFeather name={name} size={20} color={color} />;
          },
        })}
      >
        <Tab.Screen name="Today" component={TodayTab} />
        <Tab.Screen name="Days" component={DaysTab} />
        <Tab.Screen name="Splits" component={SplitsTab} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
