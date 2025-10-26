// Debug script to test Continue Payment functionality
// Run this in browser console on the Orders or OrderDetail page

console.log('=== Continue Payment Debug ===');

// Check current orders data
const checkOrdersData = () => {
  // Look for any order cards
  const orderCards = document.querySelectorAll('[data-order-id]') || document.querySelectorAll('.order-card') || [];
  console.log(`Found ${orderCards.length} order cards on page`);
  
  // Check for continue payment buttons
  const continueButtons = document.querySelectorAll('button:has([data-lucide="external-link"])') || 
                         document.querySelectorAll('button:contains("Lanjutkan Pembayaran")') ||
                         [];
  console.log(`Found ${continueButtons.length} continue payment buttons`);
  
  // Log orders data from React state (if accessible)
  try {
    const reactFiber = document.querySelector('#root')._reactInternalInstance;
    console.log('React component tree available for inspection');
  } catch (e) {
    console.log('React internals not accessible via standard method');
  }
};

// Check localStorage for debug info
const checkLocalStorage = () => {
  console.log('Local Storage cart:', localStorage.getItem('cart'));
};

// Test cases to verify
const testCases = [
  {
    name: 'Pending order with payment_url',
    condition: 'order.status === "pending" && order.payment_url',
    expected: 'Continue Payment button should be visible'
  },
  {
    name: 'Pending order without payment_url',
    condition: 'order.status === "pending" && !order.payment_url',
    expected: 'Continue Payment button should NOT be visible'
  },
  {
    name: 'Paid order',
    condition: 'order.status === "paid"',
    expected: 'Continue Payment button should NOT be visible'
  }
];

console.log('Test Cases:');
testCases.forEach((test, i) => {
  console.log(`${i + 1}. ${test.name}:`);
  console.log(`   Condition: ${test.condition}`);
  console.log(`   Expected: ${test.expected}`);
});

checkOrdersData();
checkLocalStorage();

console.log('=== End Debug ===');