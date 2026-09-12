(function(){
  function performLogout() {
    localStorage.removeItem('ibms-auth-token');
    localStorage.removeItem('ibms-auth-user');
    localStorage.removeItem('ibms-kiosk-token');
    localStorage.removeItem('ibms-admin-key');
    window.location.href = '/login.html';
  }

  document.addEventListener('DOMContentLoaded', function(){
    if (document.getElementById('ibms-login-toggle')) return;

    const btn = document.createElement('button');
    btn.id = 'ibms-login-toggle';
    btn.className = 'btn btn-sm btn-outline-primary';
    btn.style.position = 'fixed';
    btn.style.right = '12px';
    btn.style.bottom = '12px';
    btn.textContent = 'Login';
    document.body.appendChild(btn);

    const modalHtml = `
      <div class="modal fade" id="ibms-login-modal" tabindex="-1">
        <div class="modal-dialog modal-sm modal-dialog-centered">
          <div class="modal-content">
            <div class="modal-header"><h5 class="modal-title">API Login</h5><button type="button" class="btn-close" data-bs-dismiss="modal"></button></div>
            <div class="modal-body">
              <div class="mb-2"><input class="form-control" id="ibms-login-email" placeholder="email" value="manager@example.com"/></div>
              <div class="mb-2"><input class="form-control" id="ibms-login-password" type="password" placeholder="password" value="secure-password"/></div>
              <div class="text-end"><button id="ibms-login-submit" class="btn btn-primary">Sign in</button></div>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);
    const modalEl = document.getElementById('ibms-login-modal');
    const modal = new bootstrap.Modal(modalEl);

    btn.addEventListener('click', () => modal.show());

    document.getElementById('ibms-login-submit').addEventListener('click', async () => {
      const email = document.getElementById('ibms-login-email').value;
      const password = document.getElementById('ibms-login-password').value;

      try {
        const resp = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify({ email, password })
        });

        if (!resp.ok) {
          const txt = await resp.text();
          alert('Login failed: ' + txt);
          return;
        }

        const json = await resp.json();
        localStorage.setItem('ibms-auth-token', json.token);
        localStorage.setItem('ibms-auth-user', JSON.stringify(json.user));
        modal.hide();
        alert('Login successful');
      } catch (err) {
        console.error(err);
        alert('Login failed (see console)');
      }
    });
  });
})();
