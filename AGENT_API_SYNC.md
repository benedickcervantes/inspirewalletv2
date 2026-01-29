# Agent API Sync Documentation

## Overview
This document explains how the registration system syncs agent data with the API, particularly for master agents (agents without referrers).

## Agent Code Format

### Master Agent (No Referrer)
- Format: `agentNumber-00000-00000`
- Example: `ABC12-00000-00000`
- The agent number is the first 5 characters
- Two `00000` segments indicate this is a top-level master agent

### Sub-Agent (With Referrer)
- Format: Hierarchical based on parent agent's code
- Example: `ABC12-XYZ34-00000` (sub-agent under ABC12-00000-00000)
- Replaces the first `00000` in the parent's code with the new agent number

## Registration Flow for Master Agents (No Referrer)

### 1. Agent Code Generation
- When a user selects "Yes, I'm an agent" and clicks "Generate"
- System generates a unique 5-character alphanumeric code (e.g., "ABC12")
- If no referrer is selected, creates master agent code: `ABC12-00000-00000`
- User sees confirmation: "Your Master Agent Code is: ABC12-00000-00000"

### 2. Registration Process
When a master agent registers, the system:

1. **Creates Firestore Account**
   - Stores `agentNumber: "ABC12"`
   - Stores `agentCode: "ABC12-00000-00000"`
   - Sets `agent: true` flag
   - No `pendingReferral` object is created

2. **Syncs with API**
   - Calls `registerAgentInAPI()` function
   - Sends payload to API:
     ```json
     {
       "referrerCode": "ABC12-00000-00000",
       "agentNumber": "ABC12"
     }
     ```
   - For master agents, the `referrerCode` is their full master agent code
   - This creates the agent entry in the API JSON structure

3. **API Response Handling**
   - If API returns a different agent code, Firestore is updated
   - Success logs confirm the master agent is synced
   - If API fails, registration continues with local data (non-blocking)

### 3. Success Message
Master agents receive a detailed success message showing:
- Account Number
- Agent Number (5 characters)
- Agent Code (full format: ABC12-00000-00000)
- Confirmation of API sync

## Registration Flow for Agents With Referrers

### 1. Pending Status
When an agent registers **with a referrer**, the system:
- Sets `agentCode: "pending"`
- Creates a `pendingReferral` object with referrer details
- **Does NOT sync with API** until referrer confirms

### 2. Confirmation Process
- Referrer receives a notification
- Upon confirmation, the agent code is updated
- **Then** the API sync occurs with the proper hierarchical structure

## Code Structure

### Key Functions

#### `registerAgentInAPI(agentNumber, agentCode, referrerCode)`
- Handles API registration for agents
- Determines if agent is root or sub-agent
- Sends appropriate payload to API
- Returns API response data

#### `generateUniqueAgentCode()`
- Generates random 5-character code
- Checks for uniqueness in Firestore
- For root agents, uses the code directly
- For sub-agents, generates hierarchical code via API

### Error Handling
- API failures are non-blocking
- Users can still register even if API is down
- Warning modal shown if API sync fails
- Detailed console logs for debugging

## Benefits

### For Master Agents (No Referrer)
✅ Immediate API sync upon registration
✅ Master agent code format: `agentNumber-00000-00000`
✅ Can start referring others immediately
✅ Full agent functionality from day one
✅ Forms the root of their own agent hierarchy

### For Sub Agents (With Referrer)
✅ Proper hierarchical structure maintained
✅ Referrer approval ensures data accuracy
✅ API sync happens after confirmation
✅ Prevents unauthorized agent registrations
✅ Code reflects parent relationship

## API Payload Examples

### Master Agent Registration
```json
{
  "referrerCode": "ABC12-00000-00000",  // Full master agent code
  "agentNumber": "ABC12"                 // Base agent number
}
```

### Sub Agent Registration (After Confirmation)
```json
{
  "referrerCode": "ABC12-00000-00000",   // Parent agent's code
  "agentNumber": "XYZ34"                 // New agent number
}
```

Result: New agent code becomes `ABC12-XYZ34-00000`

## Monitoring and Debugging

### Console Logs
The system provides detailed logs:
- 📤 API request initiation
- 📦 Payload structure
- 🏷️ Agent type identification
- ✅ Success confirmations
- ❌ Error details with full stack trace

### Firestore Fields
Monitor these fields in the `users` collection:
- `agentNumber`: The unique agent identifier
- `agentCode`: The hierarchical agent code
- `agent`: Boolean flag for agent accounts
- `pendingReferral`: Object containing referral request details (if applicable)

## Future Enhancements
- [ ] Add retry logic for failed API syncs
- [ ] Implement background sync for offline registrations
- [ ] Add admin dashboard to view API sync status
- [ ] Create batch sync utility for migrating existing agents

## Last Updated
November 4, 2025
