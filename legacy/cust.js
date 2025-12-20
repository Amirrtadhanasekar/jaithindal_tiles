// cust.js
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('customerForm');
  const resetBtn = document.getElementById('resetBtn');

  resetBtn.addEventListener('click', () => {
    form.reset();
    document.getElementById('fullname').focus();
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const fullname = document.getElementById('fullname').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const address = document.getElementById('address').value.trim();
    const attender = document.getElementById('attender').value;

    if (!fullname || !phone || !address || !attender) {
      alert('Please fill all required fields.');
      return;
    }
    if (!/^\d{10}$/.test(phone)) {
      alert('Please enter a valid 10-digit phone number.');
      return;
    }

    const payload = {
      fullname,
      phone,
      address,
      attender,
      createdAt: new Date().toISOString()
    };

    // save & debug log
    sessionStorage.setItem('customer', JSON.stringify(payload));
    console.log('Saved customer -> sessionStorage:', payload);

    // navigate to home dashboard
    window.location.href = 'home-dashboard.html';
  });
});
