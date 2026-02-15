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

    // Handle successful order
    if (eventType === 'order_created') {
      const customerEmail = payload.data.attributes.user_email;
      const variantId = String(payload.data.attributes.first_order_item.variant_id);
      
      console.log('Customer email:', customerEmail);
      console.log('Variant ID received:', variantId);
      console.log('Variant ID type:', typeof variantId);
      
      // Determine plan based on variant
      let plan = 'pro';
      if (variantId === '1301371') {
        plan = 'lifetime';
        console.log('Matched lifetime variant');
      } else if (variantId === '1301327') {
        plan = 'monthly';
        console.log('Matched monthly variant');
      } else {
        console.log('No variant match - defaulting to pro');
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