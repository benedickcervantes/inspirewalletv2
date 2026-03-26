import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-gesture-handler';
import 'react-native-reanimated';
import { navigationRef } from './lib/navigationRef';

import AuthLoader from './app/AuthLoader';
import AgentDashboard from './app/Dashboard/AgentDashboard';
import DepositScreen from './app/Dashboard/deposit/deposit';
import DepositReceipt from './app/Dashboard/deposit/depositReceipt';
import StockInvestment from './app/Dashboard/deposit/stockInvestDepo';
import StockInvestmentConfirm from './app/Dashboard/deposit/stockInvestDepoConfirm';
import TimeDeposit from './app/Dashboard/deposit/timedeposit';
import TimeDepositAmount from './app/Dashboard/deposit/timedepositAmount';
import TimeDepositConfirm from './app/Dashboard/deposit/timedepositConfirm';
import TimeDepositProof from './app/Dashboard/deposit/timedepositProof';
import TopUpBalance from './app/Dashboard/deposit/topupDepoAvailB';
import TopupConfirm from './app/Dashboard/deposit/topupDepoAvailBconfirm';
import Dashboard from './app/Dashboard/main';
import Message from './app/Dashboard/Message';
import WithdrawScreen from './app/Dashboard/withdraw/withdraw';
import EWalletWithdrawal from './app/Dashboard/withdraw/withdrawEwallet';
import EWalletConfirm from './app/Dashboard/withdraw/withdrawEwalletConfirm';
import BankWithdrawal from './app/Dashboard/withdraw/withdrawLocalB';
import WithdrawLocalBConfirm from './app/Dashboard/withdraw/withdrawLocalBconfirm';
import WithdrawMethodScreen from './app/Dashboard/withdraw/withdrawMethod';
import History from './app/History/history';
import KYCAddressInformation from './app/KYC/KYCAddressInformation';
import KYCcompany from './app/KYC/KYCcompany';
import KYCVerification from './app/KYC/KYCVerification';
import NotificationScreen from './app/Notification/notification';
import CreatePasscode from './app/Outside/CreatePasscode';
import Login from './app/Outside/Login';
import OfflineWrapper from './app/Outside/OfflineWrapper';
import Passcode from './app/Outside/passcode';
import Register from './app/Outside/Register';
import Welcome from './app/Outside/Welcome';
import Placeholder from './app/Placeholder';
import BankingAddressInfo from './app/ServicesFunction/Banking/BankingAdressinfo';
import BankingContactInfo from './app/ServicesFunction/Banking/BankingContactInfo';
import BankingFinancialInfo from './app/ServicesFunction/Banking/BankingFinancialInfo';
import BankingPersonalInfo from './app/ServicesFunction/Banking/BankingPersonalInfo';
import BankingRequiredInfo from './app/ServicesFunction/Banking/BankingRequiredInfo';
import BankingService from './app/ServicesFunction/Banking/BankingService';
import EwalletAddressInfo from './app/ServicesFunction/E-Wallet/EwalletAddressInfo';
import EwalletContactInfo from './app/ServicesFunction/E-Wallet/EwalletContactInfo';
import EwalletFinancialInfo from './app/ServicesFunction/E-Wallet/EwalletFinancialinfo';
import EwalletPersonalInfo from './app/ServicesFunction/E-Wallet/EwalletPersonalInfo';
import EwalletService from './app/ServicesFunction/E-Wallet/EwalletService';
import DepositCrypto from './app/ServicesFunction/Play&Earn/depositCrypto';
import DepositCryptoEth from './app/ServicesFunction/Play&Earn/depositCryptoEth';
import DepositCryptoUSDT from './app/ServicesFunction/Play&Earn/depositCryptoUSDT';
import PlayEarnServices from './app/ServicesFunction/Play&Earn/Play&earnServices';
import BlackC from './app/ServicesFunction/Pcards/BlackC';
import StockBuy from './app/ServicesFunction/Stock/StockBuy';
import StockSell from './app/ServicesFunction/Stock/StockSell';
import StockService from './app/ServicesFunction/Stock/StockService';
import TransferConfirm from './app/ServicesFunction/Transfer/TransferConfirm';
import TransferRecipient from './app/ServicesFunction/Transfer/TransferRecipient';
import SendMoney from './app/ServicesFunction/Transfer/TransferService';
import TravelProtection from './app/ServicesFunction/Travel Proctected/TravelProtectServices';
import Aboutus from './app/Settings/Aboutus';
import ChangePasscode from './app/Settings/ChangePasscode';
import CurrencyCalculator from './app/Settings/CurrencyCalculator';
import DeleteAccount from './app/Settings/DeleteAccount';
import HelpCenter from './app/Settings/HelpCenter';
import LanguageModal from './app/Settings/LanguageModal';
import PrivacyPolicy from './app/Settings/PrivacyPolicy';
import Settings from './app/Settings/settings';
import TermsConditions from './app/Settings/TermsConditions';
import { IdleTimeoutProvider } from './context/IdleTimeoutContext';
import { LanguageProvider } from './context/LanguageContext';
import { LanguageModalProvider } from './context/LanguageModalContext';
import { SocketProvider } from './context/SocketContext';
import { UnreadNotificationsProvider } from './context/UnreadNotificationsContext';
import type { RootStackParamList } from './types/navigation';

const Stack = createNativeStackNavigator<RootStackParamList>();
const EwalletReview = require('./app/ServicesFunction/E-Wallet/EwalletReview').default;

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <LanguageProvider>
        <LanguageModalProvider>
          <SocketProvider>
            <UnreadNotificationsProvider>
              <IdleTimeoutProvider>
                <OfflineWrapper>
                  <NavigationContainer ref={navigationRef}>
                    <Stack.Navigator
                      initialRouteName="AuthLoader"
                      screenOptions={{ headerShown: false }}
                    >
              <Stack.Screen name="AuthLoader" component={AuthLoader} />
              <Stack.Screen name="Welcome" component={Welcome} />
              <Stack.Screen name="Login" component={Login} />
              <Stack.Screen name="Register" component={Register} />
              <Stack.Screen
                name="CreatePasscode"
                component={CreatePasscode}
                options={{ gestureEnabled: false }}
              />
              <Stack.Screen
                name="Passcode"
                component={Passcode}
                options={{ gestureEnabled: false }}
              />
              <Stack.Screen
                name="Main"
                component={Dashboard}
                options={{
                  animation: 'simple_push',
                  animationDuration: 350,
                }}
              />
              <Stack.Screen name="Personal" component={Placeholder} />
              <Stack.Screen name="KYCVerification" component={KYCVerification} />
              <Stack.Screen name="KYCcompany" component={KYCcompany} />
              <Stack.Screen name="KYCAddressInformation" component={KYCAddressInformation} />
              <Stack.Screen name="Notification" component={NotificationScreen} />
              <Stack.Screen name="Settings" component={Settings} />
              <Stack.Screen name="ChangePasscode" component={ChangePasscode} />
              <Stack.Screen name="Aboutus" component={Aboutus} />
              <Stack.Screen name="CurrencyCalculator" component={CurrencyCalculator} />
              <Stack.Screen name="DeleteAccount" component={DeleteAccount} />
              <Stack.Screen name="HelpCenter" component={HelpCenter} />
              <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicy} />
              <Stack.Screen name="TermsConditions" component={TermsConditions} />
              <Stack.Screen name="Transfer" component={SendMoney} />
              <Stack.Screen name="TransferRecipient" component={TransferRecipient} />
              <Stack.Screen name="TransferConfirm" component={TransferConfirm} />
              <Stack.Screen name="Bdo" component={BankingService} />
              <Stack.Screen name="Message" component={Message} />
              <Stack.Screen name="BankingContactInfo" component={BankingContactInfo} />
              <Stack.Screen name="BankingPersonalInfo" component={BankingPersonalInfo} />
              <Stack.Screen name="BankingAddressInfo" component={BankingAddressInfo} />
              <Stack.Screen name="BankingFinancialInfo" component={BankingFinancialInfo} />
              <Stack.Screen name="BankingRequiredInfo" component={BankingRequiredInfo} />
              <Stack.Screen name="Travel" component={TravelProtection} />
              <Stack.Screen name="History" component={History} />
              <Stack.Screen name="Maya" component={Placeholder} />
              <Stack.Screen name="EwalletService" component={EwalletService} />
              <Stack.Screen name="EwalletContactInfo" component={EwalletContactInfo} />
              <Stack.Screen name="EwalletPersonalInfo" component={EwalletPersonalInfo} />
              <Stack.Screen name="EwalletAddressInfo" component={EwalletAddressInfo} />
              <Stack.Screen name="EwalletFinancialInfo" component={EwalletFinancialInfo} />
              <Stack.Screen name="EwalletReview" component={EwalletReview} />
              <Stack.Screen name="Stockholder" component={StockService} />
              <Stack.Screen name="StockBuy" component={StockBuy} />
              <Stack.Screen name="StockSell" component={StockSell} />
              <Stack.Screen name="AgentRequest" component={AgentDashboard} />
              <Stack.Screen
                name="PlayEarn"
                component={PlayEarnServices}
                options={{ animation: 'none' }}
              />
              <Stack.Screen name="PCard" component={BlackC} />
              <Stack.Screen
                name="DepositCrypto"
                component={DepositCrypto}
                options={{ animation: 'none' }}
              />
              <Stack.Screen
                name="DepositCryptoEth"
                component={DepositCryptoEth}
                options={{ animation: 'none' }}
              />
              <Stack.Screen
                name="DepositCryptoUSDT"
                component={DepositCryptoUSDT}
                options={{ animation: 'none' }}
              />
              <Stack.Screen name="Crypto" component={Placeholder} />
              <Stack.Screen name="Deposit" component={DepositScreen} />
              <Stack.Screen name="stockinvestment" component={StockInvestment} />
              <Stack.Screen name="StockInvestmentConfirm" component={StockInvestmentConfirm} />
              <Stack.Screen name="timedeposit" component={TimeDeposit} />
              <Stack.Screen name="TimeDepositAmount" component={TimeDepositAmount} />
              <Stack.Screen name="TimeDepositConfirm" component={TimeDepositConfirm} />
              <Stack.Screen name="TimeDepositProof" component={TimeDepositProof} />
              <Stack.Screen name="topup" component={TopUpBalance} />
              <Stack.Screen name="TopupConfirm" component={TopupConfirm} />
              <Stack.Screen name="depositReceipt" component={DepositReceipt} />
              <Stack.Screen name="Withdraw" component={WithdrawScreen} />
              <Stack.Screen name="WithdrawMethod" component={WithdrawMethodScreen} />
              <Stack.Screen name="WithdrawBank" component={BankWithdrawal} />
              <Stack.Screen name="WithdrawLocalBConfirm" component={WithdrawLocalBConfirm} />
              <Stack.Screen name="WithdrawEwallet" component={EWalletWithdrawal} />
              <Stack.Screen name="WithdrawEwalletConfirm" component={EWalletConfirm} />
                    </Stack.Navigator>
                    <StatusBar style="auto" />
                  </NavigationContainer>
                  <LanguageModal />
                </OfflineWrapper>
              </IdleTimeoutProvider>
            </UnreadNotificationsProvider>
          </SocketProvider>
        </LanguageModalProvider>
      </LanguageProvider>
    </GestureHandlerRootView>
  );
}
