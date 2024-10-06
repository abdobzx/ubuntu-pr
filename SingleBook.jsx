import React, { useState, useEffect } from 'react';
import { useLoaderData } from 'react-router-dom';
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js';

const SingleBook = () => {
  const { bookTitle, imageUrl, bookDescription, category, authorName, bookPdfUrl } = useLoaderData();
  const [showDownloadLink, setShowDownloadLink] = useState(false); // State to control the display of the download link

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Function to handle payment success
  const handlePaymentSuccess = (details, data) => {
    // Display a thank you message
    alert('Thank you for your purchase! You can now download the book.');
    // Show the download link
    setShowDownloadLink(true);
    console.log(details, data); // Log payment details for debugging/verification
  };

  // Function to handle order creation for PayPal
  const createOrder = async (data, actions) => {
    return fetch('https://ebook.sytes.net:3000/api/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error('Failed to create PayPal order');
        }
        return res.json();
      })
      .then((orderData) => {
        return orderData.id;
      });
  };

  return (
    <div className='mt-20 px-4 lg:px-24 flex flex-col lg:flex-row'>
      <div className='lg:w-1/2 pr-8 mb-4 lg:mb-0'>
        <img src={imageUrl} alt={bookTitle} className='h-110 rounded-lg shadow-md' />
        <div className="mt-4 flex justify-between items-center">
          {showDownloadLink && (
            <button onClick={() => window.open(bookPdfUrl, "_blank")} className='bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline' style={{ minWidth: "200px", height: "48px" }}>
              Download Book
            </button>
          )}
          <span className="text-2xl font-bold">Price : 10 $</span>
        </div>
      </div>
      <div className='lg:w-1/2'>
        <h2 className='text-2xl font-bold mb-2'>{bookTitle}</h2>
        <p className='text-gray-700 mb-2'>{bookDescription}</p>
        <div className='text-sm text-gray-500 mb-2'>
          <span className='font-semibold'>Category:</span> {category}
        </div>
        <div className='text-sm text-gray-500 mb-4'>
          <span className='font-semibold'>Author:</span> {authorName}
        </div>
        
        <PayPalScriptProvider options={{ "client-id": "AdSQOcXbI0U4Dt5DJHZdL3lKI7gHJeOB-pRfsRpsAFvCh5khIDnhr2FJisJXmPs4y1752N5Tzpro5FTS" }}>
          <PayPalButtons 
            style={{ layout: "vertical" }}
            createOrder={createOrder} // Hook to your backend order creation
            onApprove={(data, actions) => {
              return actions.order.capture().then(details => {
                handlePaymentSuccess(details, data);
              });
            }}
            onError={(err) => {
              console.error('Error during PayPal Checkout:', err);
              alert('An error occurred during the transaction.');
            }}
          />
        </PayPalScriptProvider>
      </div>
    </div>
  );
};

export default SingleBook;
