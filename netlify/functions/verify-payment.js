
/**
 * Paystack verification function has been removed.
 */
exports.handler = async () => {
  return {
    statusCode: 410,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    },
    body: JSON.stringify({ 
      success: false,
      message: "This endpoint is no longer active. Payment integration has been removed." 
    })
  };
};
