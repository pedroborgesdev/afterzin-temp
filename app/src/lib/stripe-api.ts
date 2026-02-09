/**
 * Stripe REST API client.
 * Communicates with the backend's /api/stripe/* endpoints.
 * These are separate from GraphQL because Stripe operations
 * (webhooks, redirects) are naturally REST-based.
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

// ---------- Connect: Account Management ----------

/** Creates a Stripe Connect Express account for the current producer. */
export async function createStripeAccount(): Promise<{ accountId: string; message: string }> {
  return fetchWithAuth('/api/stripe/connect/create-account', { method: 'POST' });
}

/** Creates an onboarding link — redirects producer to Stripe's hosted onboarding. */
export async function createOnboardingLink(): Promise<{ url: string }> {
  return fetchWithAuth('/api/stripe/connect/onboarding-link', { method: 'POST' });
}

/** Gets the current Stripe Connect onboarding status. */
export async function getStripeStatus(): Promise<{
  hasAccount: boolean;
  accountId?: string;
  onboardingComplete: boolean;
  transfersActive?: boolean;
  detailsSubmitted?: boolean;
  payoutsEnabled?: boolean;
  error?: string;
}> {
  return fetchWithAuth('/api/stripe/connect/status');
}

/** Updates the producer's PIX key. All events must be paused first. */
export async function updatePixKey(
  pixKey: string,
  pixKeyType: string,
): Promise<{ message: string }> {
  return fetchWithAuth('/api/stripe/connect/pix-key', {
    method: 'POST',
    body: JSON.stringify({ pixKey, pixKeyType }),
  });
}

// ---------- Payment: PIX ----------

/** PIX Payment result from backend */
export interface PixPaymentResult {
  paymentIntentId: string;
  clientSecret: string;
  pixQrCode: string;      // URL to QR code image (PNG)
  pixCopyPaste: string;   // Copia-e-cola string
  expiresAt: number;      // Unix timestamp
  status: string;         // requires_action, succeeded, etc.
}

/** Creates a PIX PaymentIntent for an order. Returns QR code + copia-e-cola. */
export async function createPixPayment(
  orderId: string,
): Promise<PixPaymentResult> {
  return fetchWithAuth('/api/stripe/payment/create', {
    method: 'POST',
    body: JSON.stringify({ orderId }),
  });
}

/** Polls payment status for an order. */
export async function getPaymentStatus(
  orderId: string,
): Promise<{ status: string; paid: boolean; paymentIntentId?: string; orderStatus?: string }> {
  return fetchWithAuth(`/api/stripe/payment/status?orderId=${encodeURIComponent(orderId)}`);
}
