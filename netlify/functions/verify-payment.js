/**
 * Netlify Function: Verify PayStack Payment
 * 
 * This function verifies PayStack payments securely on the server-side
 * and updates the user's subscription in Firestore
 */

const fetch = require('node-fetch');

// Initialize Firebase Admin (you'll need to set this up)
const admin = require('firebase-admin');

// Initialize Firebase Admin only once
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    });
  } catch (error) {
    console.error('Firebase admin initialization error:', error);
  }
}

const db = admin.firestore();

exports.handler = async (event, context) => {
  // Enable CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  // Handle preflight request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const { reference, userId, email } = JSON.parse(event.body);

    // Validate required fields
    if (!reference || !userId || !email) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Missing required fields: reference, userId, email' 
        }),
      };
    }

    // Verify payment with PayStack
    const paystackResponse = await fetch(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!paystackResponse.ok) {
      throw new Error(`PayStack API error: ${paystackResponse.statusText}`);
    }

    const verificationData = await paystackResponse.json();

    // Check if payment was successful
    if (!verificationData.status || verificationData.data.status !== 'success') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          message: 'Payment verification failed',
          data: verificationData,
        }),
      };
    }

    // Verify the amount paid (499 kobo = 4.99 GHS)
    const expectedAmount = 499; // 4.99 GHS in kobo
    if (verificationData.data.amount < expectedAmount) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          message: 'Payment amount mismatch',
        }),
      };
    }

    // Update user subscription in Firestore
    const userRef = db.collection('users').doc(email);
    
    await userRef.set({
      subscription: {
        plan: 'pro',
        status: 'active',
        expiresAt: null, // Lifetime access
        paymentReference: reference,
        amount: verificationData.data.amount / 100, // Convert kobo to GHS
        currency: verificationData.data.currency,
        upgradedAt: admin.firestore.FieldValue.serverTimestamp(),
        paymentData: {
          gateway_response: verificationData.data.gateway_response,
          channel: verificationData.data.channel,
          paid_at: verificationData.data.paid_at,
        },
      },
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    // Initialize AI credits for PRO user
    await userRef.set({
      aiCredits: {
        total: 20, // 10 for summarize + 10 for extract
        used: 0,
        remaining: 20,
        resetAt: null, // Monthly reset - implement if needed
      },
    }, { merge: true });

    console.log(`✅ User ${email} upgraded to PRO successfully`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Payment verified and user upgraded to PRO',
        data: {
          reference: verificationData.data.reference,
          amount: verificationData.data.amount / 100,
          currency: verificationData.data.currency,
          plan: 'pro',
        },
      }),
    };
  } catch (error) {
    console.error('Error verifying payment:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Internal server error',
        message: error.message,
      }),
    };
  }
};