import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import TodayTab from './screens/TodayTab';
import DaysTab from './screens/DaysTab';
import SplitsTab from './screens/SplitsTab';

const Tab = createBottomTabNavigator();

export default function MainNavigator() {
  return (
    <NavigationContainer>
      <Tab.Navigator>
        <Tab.Screen name="Today" component={TodayTab} />
        <Tab.Screen name="Days" component={DaysTab} />
        <Tab.Screen name="Splits" component={SplitsTab} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
