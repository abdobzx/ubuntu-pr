import React, { useState } from 'react';
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js';

function Message({ content }) {
  return <p>{content}</p>;
}

const Payo = () => {
  const initialOptions = {
    'client-id': 'AdSQOcXbI0U4Dt5DJHZdL3lKI7gHJeOB-pRfsRpsAFvCh5khIDnhr2FJisJXmPs4y1752N5Tzpro5FTS',
    'enable-funding': 'paylater,venmo,card',
    'data-sdk-integration-source': 'integrationbuilder_sc',
  };

  const [message, setMessage] = useState('');

  const createOrder = async () => {
    try {
      const response = await fetch('https://ebook.sytes.net:3000/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cart: [
            {
              id: 'YOUR_PRODUCT_ID',
              quantity: 'YOUR_PRODUCT_QUANTITY',
            },
          ],
        }),
      });

      if (!response.ok) throw new Error('Network response was not ok');

      const orderData = await response.json();

      if (orderData.id) {
        return orderData.id;
      } else {
        throw new Error('Order ID not found in the response');
      }
    } catch (error) {
      console.error(error);
      setMessage(`Could not initiate PayPal Checkout...${error}`);
    }
  };

  return (
    <div className="App">
      <PayPalScriptProvider options={initialOptions}>
        <PayPalButtons
          style={{
            shape: 'rect',
            layout: 'vertical',
          }}
          createOrder={createOrder}
          onApprove={(data, actions) => {
            // Handle approval logic here
          }}
        />
      </PayPalScriptProvider>
      <Message content={message} />
    </div>
  );
};

export default Payo;
