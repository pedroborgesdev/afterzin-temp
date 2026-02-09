/**
 * Pagar.me REST API client.
 * Communicates with the backend's /api/pagarme/* endpoints.
 * These are separate from GraphQL because payment operations
 * (webhooks, PIX flow) are naturally REST-based.
 */

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

async function fetchWithAuth(path: string, options: RequestInit = {}) {
  const token = localStorage.getItem('token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const resp = await fetch(`${API_URL}${path}`, { ...options, headers });
  const data = await resp.json();
  if (!resp.ok) {
    throw new Error(data.error || 'Erro na requisição');
  }
  return data;
}

// ---------- Recipient Management ----------

/** Request body for creating a recipient. */
export interface CreateRecipientRequest {
  document: string;
  documentType: 'CPF' | 'CNPJ';
  type: 'individual' | 'company';
  bankCode: string;
  branchNumber: string;
  branchCheckDigit: string;
  accountNumber: string;
  accountCheckDigit: string;
  accountType: 'checking' | 'savings';
}

/** Creates a Pagar.me recipient for the current producer. */
export async function createRecipient(
  data: CreateRecipientRequest,
): Promise<{ recipientId: string; status: string; message: string }> {
  return fetchWithAuth('/api/pagarme/recipient/create', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/** Gets the current recipient/onboarding status. */
export async function getRecipientStatus(): Promise<{
  hasRecipient: boolean;
  recipientId?: string;
  onboardingComplete: boolean;
  status?: string;
  name?: string;
  error?: string;
}> {
  return fetchWithAuth('/api/pagarme/recipient/status');
}

// ---------- Payment: PIX ----------

/** PIX Payment result from backend */
export interface PixPaymentResult {
  pagarmeOrderId: string;
  pagarmeChargeId: string;
  pixQrCode: string;      // PIX copia-e-cola string
  pixQrCodeUrl: string;   // URL to QR code image
  expiresAt: string;      // ISO timestamp
  status: string;         // pending, paid, etc.
}

/** Creates a PIX payment for an order. Returns QR code + copia-e-cola. */
export async function createPixPayment(
  orderId: string,
): Promise<PixPaymentResult> {
  return fetchWithAuth('/api/pagarme/payment/create', {
    method: 'POST',
    body: JSON.stringify({ orderId }),
  });
}

/** Polls payment status for an order. */
export async function getPaymentStatus(
  orderId: string,
): Promise<{ status: string; paid: boolean; pagarmeOrderId?: string; orderStatus?: string }> {
  return fetchWithAuth(`/api/pagarme/payment/status?orderId=${encodeURIComponent(orderId)}`);
}
