import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import 'react-native-gesture-handler';
import 'react-native-reanimated';

import AuthLoader from './app/AuthLoader';
import Dashboard from './app/Dashboard/main';
import Login from './app/Outside/Login';
import Passcode from './app/Outside/passcode';
import Register from './app/Outside/Register';
import Welcome from './app/Outside/Welcome';
import Placeholder from './app/Placeholder';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="AuthLoader"
        screenOptions={{ headerShown: false }}
      >
        <Stack.Screen name="AuthLoader" component={AuthLoader} />
        <Stack.Screen name="Welcome" component={Welcome} />
        <Stack.Screen name="Login" component={Login} />
        <Stack.Screen name="Register" component={Register} />
        <Stack.Screen name="Passcode" component={Passcode} />
        <Stack.Screen name="Main" component={Dashboard} />
        <Stack.Screen name="Personal" component={Placeholder} />
        <Stack.Screen name="Notification" component={Placeholder} />
        <Stack.Screen name="Settings" component={Placeholder} />
        <Stack.Screen name="Transfer" component={Placeholder} />
        <Stack.Screen name="Bdo" component={Placeholder} />
        <Stack.Screen name="Travel" component={Placeholder} />
        <Stack.Screen name="History" component={Placeholder} />
        <Stack.Screen name="Maya" component={Placeholder} />
        <Stack.Screen name="Stockholder" component={Placeholder} />
        <Stack.Screen name="Task" component={Placeholder} />
        <Stack.Screen name="AgentRequest" component={Placeholder} />
        <Stack.Screen name="PlayEarn" component={Placeholder} />
        <Stack.Screen name="Crypto" component={Placeholder} />
        <Stack.Screen name="Deposit" component={Placeholder} />
        <Stack.Screen name="Withdraw" component={Placeholder} />
      </Stack.Navigator>
      <StatusBar style="auto" />
    </NavigationContainer>
  );
}
