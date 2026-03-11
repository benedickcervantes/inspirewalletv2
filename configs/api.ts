import * as api from "./api.js";

export const submitAccountDeletionRequest = api.submitAccountDeletionRequest;
export const getMyAccountDeletionRequests = api.getMyAccountDeletionRequests;

// Keep existing consumers working (re-export everything else too).
export * from "./api.js";

