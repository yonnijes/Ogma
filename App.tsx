import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useState } from 'react';
import { GlossaryScreen } from './src/screens/GlossaryScreen';
import { LibraryScreen } from './src/screens/LibraryScreen';
import { ReaderScreen } from './src/screens/ReaderScreen';
import type { Book } from './src/types/domain';

export type RootStackParamList = {
  Library: undefined;
  Reader: { book: Book };
  Glossary: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Library"
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen name="Library">
          {(props) => (
            <LibraryScreen
              {...props}
              onOpenBook={(book) => props.navigation.navigate('Reader', { book })}
              onOpenGlossary={() => props.navigation.navigate('Glossary')}
            />
          )}
        </Stack.Screen>
        <Stack.Screen name="Reader">
          {(props) => (
            <ReaderScreen
              {...props}
              book={props.route.params.book}
              onBack={() => props.navigation.goBack()}
            />
          )}
        </Stack.Screen>
        <Stack.Screen name="Glossary" component={GlossaryScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
