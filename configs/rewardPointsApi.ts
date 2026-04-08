/**
 * Typed entry points for reward-points helpers in api.js.
 * The main api module is JS and very large; TS may not surface late exports — use this from TS screens.
 */
import * as Api from "./api";

export type RewardPointsHistoryResponse = {
  success: boolean;
  data?: {
    data?: Record<string, unknown>[];
    pagination?: { total?: number; totalPages?: number };
  };
  error?: string;
};

export type RewardPointsTotalResponse = {
  success: boolean;
  total?: number;
  error?: string;
};

export type RedeemRewardPointsResponse = {
  success: boolean;
  data?: unknown;
  error?: string;
};

export type RewardCampaignConfigResponse = {
  success: boolean;
  data?: unknown;
  error?: string;
};

type ApiRewardModule = {
  getRewardPointsHistory: (
    accessToken: string,
    page?: number,
    limit?: number,
    type?: string | null,
  ) => Promise<RewardPointsHistoryResponse>;
  getRewardPointsTotal: (accessToken: string) => Promise<RewardPointsTotalResponse>;
  redeemRewardPoints: (
    accessToken: string,
    passcode: string,
  ) => Promise<RedeemRewardPointsResponse>;
  getRewardCampaignConfig: (
    accessToken: string,
  ) => Promise<RewardCampaignConfigResponse>;
};

const api = Api as unknown as ApiRewardModule;

export const getRewardPointsHistory = (
  accessToken: string,
  page?: number,
  limit?: number,
  type?: string | null,
) => api.getRewardPointsHistory(accessToken, page, limit, type);

export const getRewardPointsTotal = (accessToken: string) =>
  api.getRewardPointsTotal(accessToken);

export const redeemRewardPoints = (accessToken: string, passcode: string) =>
  api.redeemRewardPoints(accessToken, passcode);

export const getRewardCampaignConfig = (accessToken: string) =>
  api.getRewardCampaignConfig(accessToken);
