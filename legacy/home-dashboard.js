// home-dashboard.js (updated: navigate to tile visualization setup + tile collection)
document.addEventListener('DOMContentLoaded', () => {
  const sessionDateEl = document.getElementById('sessionDate');
  const currentTimeEl = document.getElementById('currentTime');
  const greetingEl = document.getElementById('greeting');
  const attenderNameEl = document.getElementById('attenderName');

  const now = new Date();
  const dateOptions = { day: '2-digit', month: 'short', year: 'numeric' };
  sessionDateEl.textContent = now.toLocaleDateString(undefined, dateOptions);

  function formatTime(d) {
    let hrs = d.getHours();
    let mins = d.getMinutes();
    const ampm = hrs >= 12 ? 'pm' : 'am';
    hrs = hrs % 12;
    hrs = hrs ? hrs : 12;
    mins = String(mins).padStart(2, '0');
    return `${hrs}:${mins} ${ampm}`;
  }

  currentTimeEl.textContent = formatTime(now);

  setInterval(() => { 
    currentTimeEl.textContent = formatTime(new Date()); 
  }, 60 * 1000);

  // Greeting logic
  const hour = now.getHours();
  if (hour < 12) greetingEl.textContent = 'Good Morning, Valued Customer!';
  else if (hour < 17) greetingEl.textContent = 'Good Afternoon, Valued Customer!';
  else greetingEl.textContent = 'Good Evening, Valued Customer!';

  // Load customer data from sessionStorage
  try {
    const cust = JSON.parse(sessionStorage.getItem('customer'));
    if (cust && cust.attender) {
      attenderNameEl.textContent = cust.attender;
      if (cust.fullname) {
        greetingEl.textContent = `Good Morning, ${cust.fullname.split(' ')[0]}!`;
      }
    }
  } catch (err) { /* ignore */ }


  // -----------------------------
  // BUTTON NAVIGATION HANDLERS
  // -----------------------------

  // ✅ Tile Visualization
  const vizBtn = document.getElementById('vizBtn');
  if (vizBtn) vizBtn.addEventListener('click', () => {
    window.location.href = 'tile-visualization-setup.html';
  });

  // ✅ Cost Estimation
  const costBtn = document.getElementById('costBtn');
  if (costBtn) costBtn.addEventListener('click', () => {
    window.location.href = 'cost-estimation.html'; // update if needed
  });

  // ✅ NEW: Tile Collection Button
  const tileCollectionBtn = document.getElementById('tileCollectionBtn');
  if (tileCollectionBtn) tileCollectionBtn.addEventListener('click', () => {
    window.location.href = 'tile-collection.html';
  });

});
