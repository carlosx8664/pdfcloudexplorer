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

    // Handle successful order
    if (eventType === 'order_created') {
      const customerEmail = payload.data.attributes.user_email;
      const variantId = payload.data.attributes.first_order_item.variant_id;
      
      // Determine plan based on variant
      let plan = 'pro';
      if (variantId === '1301371') {
        plan = 'lifetime';
      } else if (variantId === '1301327') {
        plan = 'monthly';
      }

      // Find user by email and update subscription
      const usersSnapshot = await db.collection('users')
        .where('email', '==', customerEmail)
        .limit(1)
        .get();

      if (!usersSnapshot.empty) {
        const userDoc = usersSnapshot.docs[0];
        await userDoc.ref.update({
          'subscription.plan': plan,
          'subscription.status': 'active',
          'subscription.expiresAt': plan === 'lifetime' ? null : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days for monthly
        });
        
        console.log(`Updated user ${customerEmail} to ${plan} plan`);
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ received: true })
    };

  } catch (error) {
    console.error('Webhook error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};