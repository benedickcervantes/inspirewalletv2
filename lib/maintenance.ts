import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = (process.env.EXPO_PUBLIC_WALLET_BACKEND_URL || 'http://192.168.1.56:3000/').replace(/\/$/, '');

export type ServiceId =
  | 'stock'
  | 'ewallet'
  | 'message'
  | 'task'
  | 'agent'
  | 'trading';

/**
 * Get maintenance status for all services
 */
export async function getMaintenanceStatus(): Promise<Record<ServiceId, boolean>> {
  try {
    const response = await fetch(`${API_BASE_URL}/maintenance/status`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return await response.json();
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
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const data = await response.json();
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
  status: Record<ServiceId, boolean>,
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
export async function getCachedMaintenanceStatus(): Promise<Record<ServiceId, boolean> | null> {
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
