export type NavProp = {
  navigate: (name: string, params?: object) => void;
  replace: (name: string, params?: object) => void;
  goBack: () => void;
  reset: (state: { index: number; routes: { name: string }[] }) => void;
};

export type RootStackParamList = {
  AuthLoader: undefined;
  Welcome: undefined;
  Login: undefined;
  Register: undefined;
  Passcode: undefined;
  Main: undefined;
  Personal: undefined;
  Notification: undefined;
  Settings: undefined;
  Transfer: undefined;
  TransferRecipient: { balanceType: string };
  TransferConfirm: {
    balanceType: string;
    accountNumber: string;
    amount: string;
    description?: string;
    recipientName: string;
    recipientId: string;
  };
  Bdo: undefined;
  BankingContactInfo: { selectedBank: string };
  Travel: undefined;
  History: undefined;
  Maya: undefined;
  Stockholder: undefined;
  Task: undefined;
  AgentRequest: undefined;
  PlayEarn: undefined;
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
