export type NavProp = {
  navigate: (name: string, params?: object) => void;
  replace: (name: string, params?: object) => void;
  goBack: () => void;
  reset: (state: { index: number; routes: { name: string }[] }) => void;
};

export type RootStackParamList = {
  AuthLoader: undefined;
  Welcome: undefined;
  Login: { fromSignOut?: boolean } | undefined;
  Register: undefined;
  CreatePasscode: undefined;
  Passcode: undefined;
  Main: undefined;
  Personal: undefined;
  KYCVerification: undefined;
  KYCcompany: undefined;
  KYCAddressInformation: undefined;
  Notification: undefined;
  Settings: undefined;
  ChangePasscode: undefined;
  Aboutus: undefined;
  DeleteAccount: undefined;
  HelpCenter: undefined;
  PrivacyPolicy: undefined;
  TermsConditions: undefined;
  Transfer: undefined;
  TransferRecipient: { balanceType: string };
  TransferConfirm: {
    balanceType: string;
    accountNumber: string;
    amount: string;
    description?: string;
    recipientName: string;
    recipientId: string;
    mainWalletId?: string;
  };
  Bdo: undefined;
  Message: undefined;
  BankingContactInfo: { selectedBank: string };
  BankingPersonalInfo: { selectedBank: string };
  BankingAddressInfo: { selectedBank: string };
  BankingFinancialInfo: { selectedBank: string };
  BankingRequiredInfo: { selectedBank: string };
  Travel: undefined;
  History: undefined;
  Maya: undefined;
  EwalletService: undefined;
  EwalletContactInfo: { selectedProvider: string };
  EwalletPersonalInfo: { selectedProvider: string };
  EwalletAddressInfo: { selectedProvider: string };
  EwalletFinancialInfo: { selectedProvider: string };
  Stockholder: undefined;
  StockBuy: undefined;
  StockSell: { stockCount: number; totalPortfolioValue: number };
  Task: undefined;
  AgentRequest: undefined;
  PlayEarn: undefined;
  DepositCrypto: undefined;
  DepositCryptoEth: undefined;
  DepositCryptoUSDT: undefined;
  Crypto: undefined;
  Deposit: undefined;
  stockinvestment: undefined;
  StockInvestmentConfirm: { currency: string; amount: string; currencySymbol: string };
  timedeposit: undefined;
  TimeDepositAmount: { depositMethod: string; contractPeriod: string; currency: string };
  TimeDepositConfirm: Record<string, unknown>;
  topup: undefined;
  TopupConfirm: Record<string, unknown>;
  Withdraw: undefined;
  WithdrawMethod: { type?: string };
  WithdrawBank: undefined;
  WithdrawLocalBConfirm: Record<string, unknown>;
  WithdrawEwallet: undefined;
  WithdrawEwalletConfirm: Record<string, unknown>;
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
