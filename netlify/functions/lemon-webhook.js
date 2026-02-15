const admin = require('firebase-admin');
const crypto = require('crypto');

// Initialize Firebase Admin (only once)
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
    })
  });
}

const db = admin.firestore();

exports.handler = async (event, context) => {
  // Only accept POST requests
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    // Verify webhook signature
    const signature = event.headers['x-signature'];
    const secret = process.env.LEMON_SQUEEZY_WEBHOOK_SECRET;
    
    const hmac = crypto.createHmac('sha256', secret);
    const digest = hmac.update(event.body).digest('hex');
    
    if (signature !== digest) {
      console.log('Invalid signature');
      return { statusCode: 401, body: 'Invalid signature' };
    }

    const payload = JSON.parse(event.body);
    const eventType = payload.meta.event_name;

    console.log('Webhook event received:', eventType);

    // Handle initial order creation
    if (eventType === 'order_created') {
      const customerEmail = payload.data.attributes.user_email;
      const variantId = String(payload.data.attributes.first_order_item.variant_id);
      
      console.log('Customer email:', customerEmail);
      console.log('Variant ID received:', variantId);
      
      // Determine plan based on variant
      // Determine plan based on variant
let plan = 'pro';
if (variantId === '1301301') {  // LIVE Lifetime variant
  plan = 'lifetime';
  console.log('Matched lifetime variant');
} else if (variantId === '1301296') {  // LIVE Monthly variant
  plan = 'monthly';
  console.log('Matched monthly variant');
}

      // Find user by email and update subscription
      const usersSnapshot = await db.collection('users')
        .where('email', '==', customerEmail)
        .limit(1)
        .get();

      if (!usersSnapshot.empty) {
        const userDoc = usersSnapshot.docs[0];
        
        const updateData = {
          'subscription.plan': plan,
          'subscription.status': 'active'
        };
        
        // Set expiration date for monthly, null for lifetime
        if (plan === 'lifetime') {
          updateData['subscription.expiresAt'] = null;
        } else if (plan === 'monthly') {
          updateData['subscription.expiresAt'] = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        }
        
        await userDoc.ref.update(updateData);
        
        console.log(`Successfully updated user ${customerEmail} to ${plan} plan`);
      } else {
        console.log(`No user found with email: ${customerEmail}`);
      }
    }

    // Handle successful subscription payment (renewal)
    if (eventType === 'subscription_payment_success') {
      const customerEmail = payload.data.attributes.user_email;
      
      console.log('Successful payment for:', customerEmail);

      const usersSnapshot = await db.collection('users')
        .where('email', '==', customerEmail)
        .limit(1)
        .get();

      if (!usersSnapshot.empty) {
        const userDoc = usersSnapshot.docs[0];
        
        // Extend subscription by 30 days
        await userDoc.ref.update({
          'subscription.status': 'active',
          'subscription.expiresAt': new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        });
        
        console.log(`Renewed subscription for ${customerEmail}`);
      }
    }

    // Handle failed payment
    if (eventType === 'subscription_payment_failed') {
      const customerEmail = payload.data.attributes.user_email;
      
      console.log('Payment failed for:', customerEmail);

      const usersSnapshot = await db.collection('users')
        .where('email', '==', customerEmail)
        .limit(1)
        .get();

      if (!usersSnapshot.empty) {
        const userDoc = usersSnapshot.docs[0];
        
        // Mark as payment_failed (Lemon Squeezy will retry)
        await userDoc.ref.update({
          'subscription.status': 'payment_failed'
        });
        
        console.log(`Marked payment failed for ${customerEmail}`);
      }
    }

    // Handle subscription cancellation
    if (eventType === 'subscription_cancelled') {
      const customerEmail = payload.data.attributes.user_email;
      
      console.log('Subscription cancelled for:', customerEmail);

      const usersSnapshot = await db.collection('users')
        .where('email', '==', customerEmail)
        .limit(1)
        .get();

      if (!usersSnapshot.empty) {
        const userDoc = usersSnapshot.docs[0];
        
        await userDoc.ref.update({
          'subscription.status': 'cancelled'
        });
        
        console.log(`Cancelled subscription for ${customerEmail}`);
      }
    }

    // Handle subscription expiration
    if (eventType === 'subscription_expired') {
      const customerEmail = payload.data.attributes.user_email;
      
      console.log('Subscription expired for:', customerEmail);

      const usersSnapshot = await db.collection('users')
        .where('email', '==', customerEmail)
        .limit(1)
        .get();

      if (!usersSnapshot.empty) {
        const userDoc = usersSnapshot.docs[0];
        
        // Revert to free plan
        await userDoc.ref.update({
          'subscription.plan': 'free',
          'subscription.status': 'expired',
          'subscription.expiresAt': null
        });
        
        console.log(`Reverted ${customerEmail} to free plan`);
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ received: true })
    };

  } catch (error) {
    console.error('Webhook error:', error);
    console.error('Error stack:', error.stack);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};