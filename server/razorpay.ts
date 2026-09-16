import Razorpay from 'razorpay';
import crypto from 'crypto';

let razorpayInstance: Razorpay | null = null;

/**
 * Lazy initialization of the Razorpay client.
 * Guards against startup crashes when keys are not yet provided.
 */
export function getRazorpayClient(): Razorpay {
  const key_id = process.env.RAZORPAY_KEY_ID;
  const key_secret = process.env.RAZORPAY_KEY_SECRET;

  if (!key_id || !key_secret) {
    throw new Error(
      'Razorpay Test credentials are not configured. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in environment variables.'
    );
  }

  // Strict enforcement: Live Razorpay is forbidden by security specification
  if (key_id.startsWith('rzp_live_')) {
    console.error('[Razorpay Security Alert] Live key detected! Live processing is strictly disabled.');
    throw new Error(
      'Security Policy Violation: Live Razorpay processing is disabled in this environment. Only Razorpay Test Mode (rzp_test_...) is permitted.'
    );
  }

  if (!razorpayInstance) {
    razorpayInstance = new Razorpay({
      key_id,
      key_secret,
    });
  }

  return razorpayInstance;
}

/**
 * Checks whether Razorpay credentials have been supplied
 */
export function isRazorpayConfigured(): boolean {
  return Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
}

/**
 * Returns the public Razorpay Key ID safe for client checkout script
 */
export function getRazorpayPublicKey(): string | null {
  return process.env.RAZORPAY_KEY_ID || null;
}

/**
 * Verifies Razorpay payment signature using HMAC SHA256
 */
export function verifyRazorpaySignature(orderId: string, paymentId: string, signature: string): boolean {
  const key_secret = process.env.RAZORPAY_KEY_SECRET;
  if (!key_secret) return false;

  const generatedSignature = crypto
    .createHmac('sha256', key_secret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');

  return generatedSignature === signature;
}
