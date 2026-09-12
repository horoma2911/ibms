// Simple kiosk scanner integration
document.addEventListener('DOMContentLoaded', () => {
  const scannerContainer = document.getElementById('qr-reader');
  const messageEl = document.getElementById('kiosk-message');
  const employeeInfo = document.getElementById('employee-info');

  function setMessage(text, variant = 'info') {
    messageEl.textContent = text;
  }

  function showEmployee(data) {
    employeeInfo.innerHTML = `
      <img src="${data.photo_path || '../assets/images/logo.svg'}" alt="Employee" style="width:96px;height:96px;border-radius:50%;object-fit:cover" />
      <div>
        <div style="font-weight:700">${data.name || data.employee_number}</div>
        <div style="color:var(--color-muted);">ID: ${data.employee_number}</div>
      </div>
    `;
  }

  function resetToScanner(html5QrcodeScanner) {
    setTimeout(() => {
      employeeInfo.innerHTML = '';
      setMessage(getTranslation('kiosk.scanPrompt') || 'Scan your QR Code');
      html5QrcodeScanner.start({ facingMode: 'environment' });
    }, 2500);
  }

  function getTranslation(key) {
    // small bridge to global language loader
    if (window.getTranslationValue) return window.getTranslationValue(key, document.documentElement.getAttribute('data-lang') || 'en');
    return null;
  }

  if (!scannerContainer) return;

  // Lazy-load html5-qrcode
  const script = document.createElement('script');
  script.src = 'https://unpkg.com/html5-qrcode@2.3.8/minified/html5-qrcode.min.js';
  script.onload = () => {
    const html5QrcodeScanner = new Html5Qrcode(/* element id */ 'qr-reader');

    setMessage(getTranslation('kiosk.scanRetry') || 'Preparing scanner...');

    const config = { fps: 10, qrbox: { width: 280, height: 280 } };

    html5QrcodeScanner.start(
      { facingMode: 'environment' },
      config,
      (decoded) => {
        // Stop scanning while processing
        html5QrcodeScanner.stop().catch(() => {});

        const token = decoded && decoded?.text ? decoded.text.trim() : decoded;

        setMessage('Processing...');

              // include bearer token if available (Sanctum personal access token), else admin header
              const headers = { 'Content-Type': 'application/json' };
              const kioskToken = localStorage.getItem('ibms-kiosk-token');
              if (kioskToken) headers['Authorization'] = 'Bearer ' + kioskToken;
              else {
                const adminKey = localStorage.getItem('ibms-admin-key');
                if (adminKey) headers['X-IBMS-ADMIN'] = adminKey;
              }

              ibmsFetch('/api/attendance/scan', {
                method: 'POST',
                body: JSON.stringify({ token, device_id: 'kiosk-' + (location.hostname || 'local') }),
              })
          .then((r) => r.json().then((body) => ({ ok: r.ok, body })))
          .then(({ ok, body }) => {
            if (!ok) {
              // If network error or 5xx, enqueue for offline sync
              if (!navigator.onLine || (body && body.message && body.status >= 500)) {
                window.IbmsAttendanceQueue.enqueue({ token, device_id: 'kiosk-' + (location.hostname || 'local') });
                setMessage('Network offline — queued');
              } else {
                setMessage(body.message || getTranslation('kiosk.employeeNotFound') || 'Employee not found');
              }
            } else {
              const status = body.status;
              if (status === 'check_in') {
                setMessage(getTranslation('kiosk.checkInSuccess') || 'Check-In Successful');
              } else if (status === 'check_out') {
                setMessage(getTranslation('kiosk.checkOutSuccess') || 'Check-Out Successful');
              }
              showEmployee(body.employee || body.employee || {});
            }
          })
          .catch((err) => {
            console.error(err);
            // enqueue for retry
            window.IbmsAttendanceQueue.enqueue({ token, device_id: 'kiosk-' + (location.hostname || 'local') });
            setMessage('Network error — queued');
          })
          .finally(() => resetToScanner(html5QrcodeScanner));
      },
      (errorMessage) => {
        // scanning failure, ignore
      }
    );
  };
  document.head.appendChild(script);

  // small settings button to set the admin key for kiosk devices
  const settingsBtn = document.createElement('button');
  settingsBtn.className = 'btn btn-sm btn-outline-primary';
  settingsBtn.style.position = 'fixed';
  settingsBtn.style.bottom = '18px';
  settingsBtn.style.left = '18px';
  settingsBtn.textContent = 'Kiosk Key';
  settingsBtn.addEventListener('click', () => {
    const current = localStorage.getItem('ibms-admin-key') || '';
    const val = prompt('Enter Kiosk admin key (provided by admin):', current);
    if (val !== null) {
      if (val.trim() === '') localStorage.removeItem('ibms-admin-key');
      else localStorage.setItem('ibms-admin-key', val.trim());
      alert('Saved');
    }
  });
  document.body.appendChild(settingsBtn);

  // If admin key exists but kiosk token missing, attempt to exchange admin key for a long-lived token
  (function exchangeAdminForToken() {
    const adminKey = localStorage.getItem('ibms-admin-key');
    const existing = localStorage.getItem('ibms-kiosk-token');
    if (!adminKey || existing) return;

    ibmsFetch('/api/kiosks/token', { method: 'POST' })
      .then(r => r.json())
      .then(body => {
        if (body.token) {
          localStorage.setItem('ibms-kiosk-token', body.token);
          alert('Kiosk token stored');
        }
      })
      .catch(() => {
        // ignore
      });
  })();
});
