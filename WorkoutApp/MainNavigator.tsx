import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import TodayTab from './screens/TodayTab';
// import other tabs as you build them

const Tab = createBottomTabNavigator();

export default function MainNavigator() {
  return (
    <NavigationContainer>
      <Tab.Navigator>
        <Tab.Screen name="Today" component={TodayTab} />
        {/* Add more tabs here */}
      </Tab.Navigator>
    </NavigationContainer>
  );
}
