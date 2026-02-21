import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import 'react-native-gesture-handler';
import 'react-native-reanimated';

import AuthLoader from './app/AuthLoader';
import DepositScreen from './app/Dashboard/deposit/deposit';
import StockInvestment from './app/Dashboard/deposit/stockInvestDepo';
import StockInvestmentConfirm from './app/Dashboard/deposit/stockInvestDepoConfirm';
import TimeDeposit from './app/Dashboard/deposit/timedeposit';
import TimeDepositAmount from './app/Dashboard/deposit/timedepositAmount';
import TimeDepositConfirm from './app/Dashboard/deposit/timedepositConfirm';
import TopUpBalance from './app/Dashboard/deposit/topupDepoAvailB';
import TopupConfirm from './app/Dashboard/deposit/topupDepoAvailBconfirm';
import Dashboard from './app/Dashboard/main';
import WithdrawScreen from './app/Dashboard/withdraw/withdraw';
import EWalletWithdrawal from './app/Dashboard/withdraw/withdrawEwallet';
import EWalletConfirm from './app/Dashboard/withdraw/withdrawEwalletConfirm';
import BankWithdrawal from './app/Dashboard/withdraw/withdrawLocalB';
import WithdrawLocalBConfirm from './app/Dashboard/withdraw/withdrawLocalBconfirm';
import WithdrawMethodScreen from './app/Dashboard/withdraw/withdrawMethod';
import NotificationScreen from './app/Notification/notification';
import Login from './app/Outside/Login';
import Passcode from './app/Outside/passcode';
import Register from './app/Outside/Register';
import Welcome from './app/Outside/Welcome';
import AgentDashboard from './app/Dashboard/AgentDashboard';
import Placeholder from './app/Placeholder';
import TransferConfirm from './app/ServicesFunction/Transfer/TransferConfirm';
import TransferRecipient from './app/ServicesFunction/Transfer/TransferRecipient';
import SendMoney from './app/ServicesFunction/Transfer/TransferService';
import Settings from './app/Settings/settings';
import type { RootStackParamList } from './types/navigation';

const Stack = createNativeStackNavigator<RootStackParamList>();

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
        <Stack.Screen name="Notification" component={NotificationScreen} />
        <Stack.Screen name="Settings" component={Settings} />
        <Stack.Screen name="Transfer" component={SendMoney} />
        <Stack.Screen name="TransferRecipient" component={TransferRecipient} />
        <Stack.Screen name="TransferConfirm" component={TransferConfirm} />
        <Stack.Screen name="Bdo" component={Placeholder} />
        <Stack.Screen name="Travel" component={Placeholder} />
        <Stack.Screen name="History" component={Placeholder} />
        <Stack.Screen name="Maya" component={Placeholder} />
        <Stack.Screen name="Stockholder" component={Placeholder} />
        <Stack.Screen name="Task" component={Placeholder} />
        <Stack.Screen name="AgentRequest" component={AgentDashboard} />
        <Stack.Screen name="PlayEarn" component={Placeholder} />
        <Stack.Screen name="Crypto" component={Placeholder} />
        <Stack.Screen name="Deposit" component={DepositScreen} />
        <Stack.Screen name="stockinvestment" component={StockInvestment} />
        <Stack.Screen name="StockInvestmentConfirm" component={StockInvestmentConfirm} />
        <Stack.Screen name="timedeposit" component={TimeDeposit} />
        <Stack.Screen name="TimeDepositAmount" component={TimeDepositAmount} />
        <Stack.Screen name="TimeDepositConfirm" component={TimeDepositConfirm} />
        <Stack.Screen name="topup" component={TopUpBalance} />
        <Stack.Screen name="TopupConfirm" component={TopupConfirm} />
        <Stack.Screen name="Withdraw" component={WithdrawScreen} />
        <Stack.Screen name="WithdrawMethod" component={WithdrawMethodScreen} />
        <Stack.Screen name="WithdrawBank" component={BankWithdrawal} />
        <Stack.Screen name="WithdrawLocalBConfirm" component={WithdrawLocalBConfirm} />
        <Stack.Screen name="WithdrawEwallet" component={EWalletWithdrawal} />
        <Stack.Screen name="WithdrawEwalletConfirm" component={EWalletConfirm} />
      </Stack.Navigator>
      <StatusBar style="auto" />
    </NavigationContainer>
  );
}
