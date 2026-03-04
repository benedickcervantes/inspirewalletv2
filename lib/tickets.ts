/**
 * Ticketing system - API integration with SevenIWalletBackend
 */

export interface TicketMessage {
  id: string;
  ticketId: string;
  senderId: string;
  content: string;
  isCustomer: boolean;
  createdAt: string;
  sender?: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

export interface Ticket {
  id: string;
  userId: string;
  title: string;
  description: string;
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
  priority: "LOW" | "MEDIUM" | "HIGH";
  category?: string;
  assignedAdminId?: string;
  assignedAdmin?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    accountNumber: string;
  };
  notes?: string;
  resolution?: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string | null;
  closedAt?: string | null;
  messageCount: number;
}

export interface TicketsResponse {
  tickets: Ticket[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface TicketResponse {
  id: string;
  title: string;
  description: string;
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
  priority: "LOW" | "MEDIUM" | "HIGH";
  category?: string;
  notes?: string;
  resolution?: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string | null;
  closedAt?: string | null;
  userId: string;
  assignedAdminId?: string;
  assignedAdmin?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    accountNumber: string;
  };
  messageCount: number;
}

export interface CreateTicketDto {
  title: string;
  description: string;
  priority?: "LOW" | "MEDIUM" | "HIGH";
  category?: string;
}

const API_BASE_URL = process.env.EXPO_PUBLIC_WALLET_BACKEND_URL || "http://localhost:3000";
const API_KEY = process.env.EXPO_PUBLIC_API_KEY;

/**
 * Helper to build headers with API key
 */
function buildHeaders(accessToken: string): HeadersInit {
  const headers: HeadersInit = {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  };
  
  if (API_KEY) {
    headers["x-api-key"] = API_KEY;
  }
  
  return headers;
}

/**
 * Create a new support ticket
 */
export async function createTicket(
  accessToken: string,
  data: CreateTicketDto
): Promise<TicketResponse> {
  const url = `${API_BASE_URL}/tickets`;
  console.log("[Tickets API] POST", url);
  console.log("[Tickets API] Payload:", data);
  console.log("[Tickets API] Token:", accessToken ? `${accessToken.substring(0, 20)}...` : "NO TOKEN");

  const response = await fetch(url, {
    method: "POST",
    headers: buildHeaders(accessToken),
    body: JSON.stringify(data),
  });

  console.log("[Tickets API] Response status:", response.status);

  if (!response.ok) {
    const errorText = await response.text();
    console.log("[Tickets API] Error response:", errorText);
    throw new Error(`Failed to create ticket: ${response.status} ${response.statusText} - ${errorText}`);
  }

  return response.json();
}

/**
 * List user's tickets with optional filtering
 */
export async function listUserTickets(
  accessToken: string,
  query?: {
    page?: number;
    limit?: number;
    status?: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
    priority?: "LOW" | "MEDIUM" | "HIGH";
    search?: string;
  }
): Promise<TicketsResponse> {
  const params = new URLSearchParams();
  if (query?.page) params.append("page", query.page.toString());
  if (query?.limit) params.append("limit", query.limit.toString());
  if (query?.status) params.append("status", query.status);
  if (query?.priority) params.append("priority", query.priority);
  if (query?.search) params.append("search", query.search);

  const url = `${API_BASE_URL}/tickets?${params.toString()}`;
  console.log("[Tickets API] GET", url);
  console.log("[Tickets API] Token:", accessToken ? `${accessToken.substring(0, 20)}...` : "NO TOKEN");

  const response = await fetch(url, {
    method: "GET",
    headers: buildHeaders(accessToken),
  });

  console.log("[Tickets API] Response status:", response.status);

  if (!response.ok) {
    const errorText = await response.text();
    console.log("[Tickets API] Error response:", errorText);
    throw new Error(`Failed to fetch tickets: ${response.status} ${response.statusText} - ${errorText}`);
  }

  return response.json();
}

/**
 * Get single ticket with full details
 */
export async function getTicket(
  accessToken: string,
  ticketId: string
): Promise<TicketResponse> {
  const response = await fetch(`${API_BASE_URL}/tickets/${ticketId}`, {
    method: "GET",
    headers: buildHeaders(accessToken),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ticket: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Add message to ticket
 */
export async function addTicketMessage(
  accessToken: string,
  ticketId: string,
  content: string
): Promise<TicketMessage> {
  const response = await fetch(`${API_BASE_URL}/tickets/${ticketId}/messages`, {
    method: "POST",
    headers: buildHeaders(accessToken),
    body: JSON.stringify({ content }),
  });

  if (!response.ok) {
    throw new Error(`Failed to add message: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Get messages for ticket
 */
export async function getTicketMessages(
  accessToken: string,
  ticketId: string,
  query?: {
    page?: number;
    limit?: number;
  }
): Promise<{
  messages: TicketMessage[];
  pagination: { page: number; limit: number; total: number; pages: number };
}> {
  const params = new URLSearchParams();
  if (query?.page) params.append("page", query.page.toString());
  if (query?.limit) params.append("limit", query.limit.toString());

  const response = await fetch(
    `${API_BASE_URL}/tickets/${ticketId}/messages?${params.toString()}`,
    {
      method: "GET",
      headers: buildHeaders(accessToken),
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch messages: ${response.statusText}`);
  }

  return response.json();
}
