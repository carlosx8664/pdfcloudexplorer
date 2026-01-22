/**
 * PayStack Payment Service
 * Handles payment initialization, verification and webhooks
 */

export interface PaystackConfig {
  publicKey: string;
  secretKey?: string; // Only needed for backend operations
}

export interface PaymentData {
  email: string;
  amount: number; // in kobo (GHS * 100)
  currency?: string;
  reference?: string;
  callback_url?: string;
  metadata?: {
    userId: string;
    plan: string;
    [key: string]: any;
  };
}

export interface PaystackResponse {
  status: boolean;
  message: string;
  data: {
    authorization_url: string;
    access_code: string;
    reference: string;
  };
}

export interface VerificationResponse {
  status: boolean;
  message: string;
  data: {
    id: number;
    domain: string;
    status: 'success' | 'failed' | 'abandoned';
    reference: string;
    amount: number;
    message: string | null;
    gateway_response: string;
    paid_at: string;
    created_at: string;
    channel: string;
    currency: string;
    ip_address: string;
    metadata: any;
    customer: {
      id: number;
      first_name: string | null;
      last_name: string | null;
      email: string;
      customer_code: string;
      phone: string | null;
      metadata: any;
      risk_action: string;
    };
    authorization: {
      authorization_code: string;
      bin: string;
      last4: string;
      exp_month: string;
      exp_year: string;
      channel: string;
      card_type: string;
      bank: string;
      country_code: string;
      brand: string;
      reusable: boolean;
      signature: string;
      account_name: string | null;
    };
  };
}

/**
 * Generate a unique payment reference
 */
export function generatePaymentReference(userId: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 9);
  return `PRO_${userId.substring(0, 8)}_${timestamp}_${random}`.toUpperCase();
}

/**
 * Initialize PayStack payment (client-side)
 * Opens PayStack popup for payment
 */
export async function initializePaystackPayment(
  publicKey: string,
  paymentData: PaymentData
): Promise<void> {
  return new Promise((resolve, reject) => {
    // Load PayStack inline script if not already loaded
    if (!window.PaystackPop) {
      const script = document.createElement('script');
      script.src = 'https://js.paystack.co/v1/inline.js';
      script.async = true;
      script.onload = () => initiatePayment();
      script.onerror = () => reject(new Error('Failed to load PayStack script'));
      document.body.appendChild(script);
    } else {
      initiatePayment();
    }

    function initiatePayment() {
      try {
        const handler = window.PaystackPop.setup({
          key: publicKey,
          email: paymentData.email,
          amount: paymentData.amount,
          currency: paymentData.currency || 'GHS',
          ref: paymentData.reference || generatePaymentReference(paymentData.metadata?.userId || 'user'),
          metadata: paymentData.metadata,
          callback: function(response: any) {
            console.log('Payment successful:', response);
            resolve(response);
          },
          onClose: function() {
            console.log('Payment popup closed');
            reject(new Error('Payment cancelled by user'));
          }
        });

        handler.openIframe();
      } catch (error) {
        reject(error);
      }
    }
  });
}

/**
 * Verify payment on the server (requires backend)
 * This should be called from your Netlify function or backend
 */
export async function verifyPayment(
  reference: string,
  secretKey: string
): Promise<VerificationResponse> {
  try {
    const response = await fetch(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${secretKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Payment verification failed: ${response.statusText}`);
    }

    const data: VerificationResponse = await response.json();
    return data;
  } catch (error) {
    console.error('Error verifying payment:', error);
    throw error;
  }
}

/**
 * Initialize payment transaction (backend operation)
 * This should be called from your Netlify function
 */
export async function initializeTransaction(
  paymentData: PaymentData,
  secretKey: string
): Promise<PaystackResponse> {
  try {
    const response = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(paymentData),
    });

    if (!response.ok) {
      throw new Error(`Payment initialization failed: ${response.statusText}`);
    }

    const data: PaystackResponse = await response.json();
    return data;
  } catch (error) {
    console.error('Error initializing transaction:', error);
    throw error;
  }
}

// Type declaration for PayStack popup
declare global {
  interface Window {
    PaystackPop?: {
      setup: (config: {
        key: string;
        email: string;
        amount: number;
        currency?: string;
        ref: string;
        metadata?: any;
        callback: (response: any) => void;
        onClose: () => void;
      }) => {
        openIframe: () => void;
      };
    };
  }
}

/**
 * Format amount from GHS to kobo (GHS * 100)
 */
export function formatAmountToKobo(amountInGHS: number): number {
  return Math.round(amountInGHS * 100);
}

/**
 * Format amount from kobo to GHS (kobo / 100)
 */
export function formatAmountToGHS(amountInKobo: number): number {
  return amountInKobo / 100;
}