// tile-visualization-setup.js
document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const roomCards = document.querySelectorAll('.room-card');
  const readyRoomEl = document.getElementById('readyRoom');
  const readyAreaEl = document.getElementById('readyArea');
  const readyModelEl = document.getElementById('readyModel');

  const dimRadios = document.querySelectorAll('.dim-radio');
  const widthInput = document.getElementById('width');
  const lengthInput = document.getElementById('length');
  const totalAreaInput = document.getElementById('totalArea');
  const dimTotalWrap = document.querySelector('.dim-total');

  const modelCards = document.querySelectorAll('.model-card');
  const generateBtn = document.getElementById('generateBtn');
  const backBtn = document.getElementById('backBtn');

  // session customer (optional)
  try {
    const cust = JSON.parse(sessionStorage.getItem('customer'));
    if (cust && cust.fullname) {
      // optionally personalize UI later
    }
  } catch (e){}

  // Room selection
  let selectedRoom = null;
  roomCards.forEach(card => {
    card.addEventListener('click', () => {
      roomCards.forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      selectedRoom = card.getAttribute('data-room');
      readyRoomEl.textContent = selectedRoom;
      highlightSelected(card);
    });
  });

  function highlightSelected(card) {
    roomCards.forEach(c => c.style.borderColor = 'rgba(0,0,0,0.06)');
    card.style.borderColor = 'rgba(47,107,75,0.32)';
  }

  // Dimension method selection
  dimRadios.forEach(r => {
    r.addEventListener('click', () => {
      dimRadios.forEach(x => x.classList.remove('selected'));
      r.classList.add('selected');
      const method = r.getAttribute('data-method');
      toggleDimMethod(method);
    });
  });

  function toggleDimMethod(method) {
    if (method === 'total-area') {
      dimTotalWrap.classList.remove('hidden');
      document.querySelector('.dim-inputs').classList.add('hidden');
    } else {
      dimTotalWrap.classList.add('hidden');
      document.querySelector('.dim-inputs').classList.remove('hidden');
    }
    updateReadyArea();
  }

  // Update area calculations
  function updateReadyArea() {
    let area = 0;
    if (!dimTotalWrap.classList.contains('hidden')) {
      const v = parseFloat(totalAreaInput.value);
      area = (isNaN(v) ? 0 : v);
    } else {
      const w = parseFloat(widthInput.value);
      const l = parseFloat(lengthInput.value);
      area = (isNaN(w) || isNaN(l)) ? 0 : (w * l);
    }
    readyAreaEl.textContent = `${area.toFixed(2)} sq. ft`;
    return area;
  }

  [widthInput, lengthInput, totalAreaInput].forEach(inp => {
    if (inp) inp.addEventListener('input', updateReadyArea);
  });

  // Model selection
  modelCards.forEach(card => {
    if (card.classList.contains('disabled')) return;
    card.addEventListener('click', () => {
      modelCards.forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      readyModelEl.textContent = card.getAttribute('data-model');
    });
  });

  // Back to Home
  backBtn.addEventListener('click', () => {
    window.location.href = 'home-dashboard.html';
  });

  // ----------------- NEW: Generate (validation + save + navigate) -----------------
  generateBtn.addEventListener('click', () => {
    const area = updateReadyArea();
    if (!selectedRoom) {
      alert('Please select a Room Type.');
      return;
    }
    if (area <= 0) {
      alert('Please enter valid room dimensions or total area.');
      return;
    }

    // read width/length (may be empty if user entered total area)
    const widthVal = parseFloat(widthInput.value);
    const lengthVal = parseFloat(lengthInput.value);
    const totalAreaVal = parseFloat(totalAreaInput.value);

    // If user used total-area method and didn't input width/length, infer a square approx
    let finalWidth = (!isNaN(widthVal) && widthVal > 0) ? widthVal : null;
    let finalLength = (!isNaN(lengthVal) && lengthVal > 0) ? lengthVal : null;
    let finalArea = (!isNaN(totalAreaVal) && totalAreaVal > 0) ? totalAreaVal : area;

    if (!finalWidth || !finalLength) {
      // try to infer from area if one or both missing: assume square-ish room
      if (finalArea > 0) {
        const side = Math.sqrt(finalArea);
        if (!finalWidth) finalWidth = Math.round(side * 100) / 100;
        if (!finalLength) finalLength = Math.round(side * 100) / 100;
      } else {
        // as fallback, set sensible defaults
        if (!finalWidth) finalWidth = 15;
        if (!finalLength) finalLength = 20;
        finalArea = finalWidth * finalLength;
      }
    }

    const setup = {
      roomType: selectedRoom,
      area: finalArea,
      model: document.querySelector('.model-card.selected')?.getAttribute('data-model') || 'Normal Room',
      width: finalWidth,
      length: finalLength,
      createdAt: new Date().toISOString()
    };

    sessionStorage.setItem('tileSetup', JSON.stringify(setup));

    // navigate to the AI generation page which generates room automatically
    window.location.href = 'ai-generation.html';
  });
  // ----------------- END NEW HANDLER -----------------

  // Default: ensure dim method shows width/length
  toggleDimMethod('width-length');
});
