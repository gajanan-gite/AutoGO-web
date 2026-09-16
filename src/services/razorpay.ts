import { Booking, Payment } from '../types';
import { auth } from './auth';

export interface RazorpayOrderResponse {
  success: boolean;
  orderId: string;
  amount: number;
  currency: string;
  keyId: string;
  bookingId: string;
  estimate: {
    baseRate: number;
    serviceFee: number;
    insuranceFee: number;
    totalAmount: number;
    days: number;
    hours: number;
    totalHours: number;
  };
  prefill: {
    name: string;
    email: string;
    contact: string;
  };
  vehicle: {
    id: string;
    make: string;
    model: string;
    year: number;
    image: string | null;
  };
  error?: string;
}

export interface RazorpayVerifyResponse {
  success: boolean;
  isDuplicate?: boolean;
  message?: string;
  booking?: Booking;
  payment?: Payment;
  error?: string;
}

/**
 * Dynamically loads the Razorpay checkout script if not already present in the DOM
 */
export function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window !== 'undefined' && (window as any).Razorpay) {
      resolve(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => {
      console.error('Failed to load Razorpay checkout script.');
      resolve(false);
    };
    document.body.appendChild(script);
  });
}

/**
 * Checks server-side Razorpay test mode configuration
 */
export async function getRazorpayConfig(): Promise<{ mode: string; configured: boolean; keyId: string | null }> {
  try {
    const res = await fetch('/api/payments/razorpay/config');
    if (!res.ok) throw new Error('Failed to fetch config');
    return await res.json();
  } catch {
    return { mode: 'test', configured: false, keyId: null };
  }
}

/**
 * Calls backend to validate booking, calculate authoritative pricing, and create Razorpay test order
 */
export async function createRazorpayBookingOrder(params: {
  customerId: string;
  vehicleId: string;
  startDateTime: string;
  endDateTime: string;
  notes?: string;
  pickupLocation?: string;
  currency?: string;
}): Promise<RazorpayOrderResponse> {
  const res = await fetch('/api/bookings/razorpay/create-order', {
    method: 'POST',
    credentials: 'include',
    headers: auth.getAuthHeaders(),
    body: JSON.stringify(params),
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to initiate Razorpay test order');
  }

  return data;
}

/**
 * Verifies the payment cryptographic signature on the backend and completes the booking
 */
export async function verifyRazorpayPayment(params: {
  bookingId: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
  paymentMethod?: string;
}): Promise<RazorpayVerifyResponse> {
  const res = await fetch('/api/bookings/razorpay/verify', {
    method: 'POST',
    credentials: 'include',
    headers: auth.getAuthHeaders(),
    body: JSON.stringify(params),
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Payment signature verification failed.');
  }

  return data;
}

/**
 * Notifies the backend if the user explicitly closed or dismissed the Razorpay checkout window
 */
export async function cancelRazorpayOrder(bookingId: string, reason?: string): Promise<void> {
  try {
    await fetch('/api/bookings/razorpay/cancel', {
      method: 'POST',
      credentials: 'include',
      headers: auth.getAuthHeaders(),
      body: JSON.stringify({ bookingId, reason }),
    });
  } catch (err) {
    console.warn('Failed to notify backend of order cancellation:', err);
  }
}

/**
 * Notifies the backend of a payment failure event
 */
export async function failRazorpayOrder(
  bookingId: string,
  errorDescription: string,
  errorCode?: string
): Promise<void> {
  try {
    await fetch('/api/bookings/razorpay/failure', {
      method: 'POST',
      credentials: 'include',
      headers: auth.getAuthHeaders(),
      body: JSON.stringify({ bookingId, errorDescription, errorCode }),
    });
  } catch (err) {
    console.warn('Failed to notify backend of payment failure:', err);
  }
}

/**
 * Launches the official Razorpay Checkout popup in Test Mode
 */
export function openRazorpayCheckout(
  order: RazorpayOrderResponse,
  callbacks: {
    onSuccess: (response: {
      razorpay_payment_id: string;
      razorpay_order_id: string;
      razorpay_signature: string;
    }) => void;
    onDismiss?: () => void;
    onFailure?: (error: { code: string; description: string; source: string; step: string; reason: string }) => void;
  }
): void {
  if (typeof window === 'undefined' || !(window as any).Razorpay) {
    throw new Error('Razorpay Checkout SDK is not available. Please refresh or check your internet connection.');
  }

  const options = {
    key: order.keyId,
    amount: order.amount,
    currency: order.currency,
    name: 'AutoGO Car Rental',
    description: `Rental: ${order.vehicle.make} ${order.vehicle.model} (${order.estimate.days}d ${order.estimate.hours}h)`,
    image: order.vehicle.image || undefined,
    order_id: order.orderId,
    prefill: {
      name: order.prefill.name,
      email: order.prefill.email,
      contact: order.prefill.contact,
    },
    notes: {
      bookingId: order.bookingId,
      environment: 'development-test-mode',
    },
    theme: {
      color: '#2563eb', // AutoGO Blue theme
    },
    handler: (response: {
      razorpay_payment_id: string;
      razorpay_order_id: string;
      razorpay_signature: string;
    }) => {
      callbacks.onSuccess(response);
    },
    modal: {
      ondismiss: () => {
        if (callbacks.onDismiss) {
          callbacks.onDismiss();
        }
      },
    },
  };

  const rzp = new (window as any).Razorpay(options);

  rzp.on('payment.failed', (response: any) => {
    if (callbacks.onFailure && response?.error) {
      callbacks.onFailure(response.error);
    }
  });

  rzp.open();
}
