import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = (process.env.EXPO_PUBLIC_WALLET_BACKEND_URL || 'http://192.168.1.56:3000/').replace(/\/$/, '');
const API_KEY = process.env.EXPO_PUBLIC_API_KEY;

export type ServiceId =
  | 'stock'
  | 'ewallet'
  | 'message'
  | 'task'
  | 'agent'
  | 'trading'
  | 'crypto_deposit'
  | 'reward_points'
  | 'pcard'
  | 'physical_cards';

type MaintenanceStatusMap = Record<ServiceId, boolean>;
export type GlobalMaintenanceMode = {
  isEnabled: boolean;
  message: string;
  updatedAt?: string;
};

/** Keys aligned with admin Operational Security / backend `ServiceId` for deposit & withdrawal flows. */
export type OperationMaintenanceKey =
  | 'op_deposit_time_deposit'
  | 'op_deposit_stock_investment'
  | 'op_deposit_top_up_available_balance'
  | 'op_withdrawal_agent_wallet'
  | 'op_withdrawal_available_balance'
  | 'op_withdrawal_local_bank'
  | 'op_withdrawal_e_wallet';

export type WithdrawalFlowSource = 'agent-withdrawal' | 'available-balance';
export type WithdrawalFlowMethod = 'local_bank' | 'e_wallet';

/**
 * True if the withdrawal source (agent vs available) or payout method (bank vs e-wallet) is offline.
 */
export async function isWithdrawalCombinationUnderMaintenance(params: {
  source: WithdrawalFlowSource;
  method: WithdrawalFlowMethod;
}): Promise<boolean> {
  const sourceKey: OperationMaintenanceKey =
    params.source === 'agent-withdrawal'
      ? 'op_withdrawal_agent_wallet'
      : 'op_withdrawal_available_balance';
  const methodKey: OperationMaintenanceKey =
    params.method === 'local_bank'
      ? 'op_withdrawal_local_bank'
      : 'op_withdrawal_e_wallet';
  const [sourceOff, methodOff] = await Promise.all([
    isOperationUnderMaintenance(sourceKey),
    isOperationUnderMaintenance(methodKey),
  ]);
  return sourceOff || methodOff;
}

/**
 * True when this operation is OFFLINE (blocked) in admin.
 */
export async function isOperationUnderMaintenance(
  key: OperationMaintenanceKey,
): Promise<boolean> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/maintenance/status/${encodeURIComponent(key)}`,
      {
        headers: {
          'x-api-key': API_KEY || '',
        },
      },
    );
    if (!response.ok) {
      return false;
    }
    const data = (await response.json()) as { isUnderMaintenance?: boolean };
    return Boolean(data.isUnderMaintenance);
  } catch (error) {
    console.error(`[Maintenance] Failed to check operation ${key}:`, error);
    return false;
  }
}

/**
 * Get maintenance status for all services
 */
export async function getMaintenanceStatus(): Promise<MaintenanceStatusMap> {
  try {
    const response = await fetch(`${API_BASE_URL}/maintenance/status`, {
      headers: {
        'x-api-key': API_KEY || '',
      },
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const data = (await response.json()) as Record<string, boolean>;
    const physicalCards = Boolean(data.physical_cards ?? data.pcard ?? false);
    return {
      stock: Boolean(data.stock),
      ewallet: Boolean(data.ewallet),
      message: Boolean(data.message),
      task: Boolean(data.task),
      agent: Boolean(data.agent),
      trading: Boolean(data.trading),
      crypto_deposit: Boolean(data.crypto_deposit),
      reward_points: Boolean(data.reward_points),
      physical_cards: physicalCards,
      pcard: physicalCards,
    };
  } catch (error) {
    console.error('[Maintenance] Failed to fetch status:', error);
    // Return all services as online if API fails
    return {
      stock: false,
      ewallet: false,
      message: false,
      task: false,
      agent: false,
      trading: false,
      crypto_deposit: false,
      reward_points: false,
      physical_cards: false,
      pcard: false,
    };
  }
}

/**
 * Get visibility status for all services (true = hidden).
 */
export async function getVisibilityStatus(): Promise<MaintenanceStatusMap> {
  try {
    const response = await fetch(`${API_BASE_URL}/maintenance/visibility`, {
      headers: {
        'x-api-key': API_KEY || '',
      },
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const data = (await response.json()) as Record<string, boolean>;
    const physicalCards = Boolean(data.physical_cards ?? data.pcard ?? false);
    return {
      stock: Boolean(data.stock),
      ewallet: Boolean(data.ewallet),
      message: Boolean(data.message),
      task: Boolean(data.task),
      agent: Boolean(data.agent),
      trading: Boolean(data.trading),
      crypto_deposit: Boolean(data.crypto_deposit),
      reward_points: Boolean(data.reward_points),
      physical_cards: physicalCards,
      pcard: physicalCards,
    };
  } catch (error) {
    console.error('[Maintenance] Failed to fetch visibility status:', error);
    return {
      stock: false,
      ewallet: false,
      message: false,
      task: false,
      agent: false,
      trading: false,
      crypto_deposit: false,
      reward_points: false,
      physical_cards: false,
      pcard: false,
    };
  }
}

/**
 * Check if a specific service is under maintenance
 */
export async function isServiceUnderMaintenance(
  serviceId: ServiceId,
): Promise<boolean> {
  try {
    const url = `${API_BASE_URL}/maintenance/status/${serviceId}`;
    console.log(`[Maintenance] Checking ${serviceId} at ${url}`);
    const response = await fetch(url, {
      headers: {
        'x-api-key': API_KEY || '',
      },
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const data = (await response.json()) as { isUnderMaintenance?: boolean };
    console.log(`[Maintenance] ${serviceId} status:`, data);
    return data.isUnderMaintenance ?? false;
  } catch (error) {
    console.error(`[Maintenance] Failed to check ${serviceId}:`, error);
    return false;
  }
}

/**
 * Cache maintenance status locally for offline support
 */
export async function cacheMaintenanceStatus(
  status: MaintenanceStatusMap,
): Promise<void> {
  try {
    await AsyncStorage.setItem(
      'maintenanceStatus',
      JSON.stringify({
        status,
        timestamp: Date.now(),
      }),
    );
  } catch (error) {
    console.error('[Maintenance] Failed to cache status:', error);
  }
}

/**
 * Get cached maintenance status
 */
export async function getCachedMaintenanceStatus(): Promise<MaintenanceStatusMap | null> {
  try {
    const cached = await AsyncStorage.getItem('maintenanceStatus');
    if (!cached) return null;
    const { status } = JSON.parse(cached);
    return status;
  } catch (error) {
    console.error('[Maintenance] Failed to get cached status:', error);
    return null;
  }
}

/**
 * Check global maintenance mode for mobile app blocking flow.
 */
export async function getGlobalMaintenanceMode(): Promise<GlobalMaintenanceMode> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/settings/maintenance`, {
      method: 'GET',
      headers: {
        'x-api-key': API_KEY || '',
      },
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const payload = (await response.json()) as {
      success?: boolean;
      data?: { isEnabled?: boolean; message?: string; updatedAt?: string };
    };
    const data = payload?.data ?? {};
    return {
      isEnabled: Boolean(data.isEnabled),
      message:
        data.message?.trim() ||
        'The app is currently under maintenance. Please try again later.',
      updatedAt: data.updatedAt,
    };
  } catch (error) {
    console.error('[Maintenance] Failed to fetch global maintenance mode:', error);
    // Network errors should not hard-block users by default.
    return {
      isEnabled: false,
      message: 'The app is currently under maintenance. Please try again later.',
    };
  }
}
