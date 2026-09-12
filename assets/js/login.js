document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('login-form');
  const feedback = document.getElementById('login-feedback');
  const submitButton = document.getElementById('login-submit');

  if (!form || !feedback || !submitButton) return;

  const showFeedback = (message, type = 'danger') => {
    feedback.textContent = message;
    feedback.className = `alert alert-${type}`;
  };

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    if (!form.reportValidity()) return;

    const email = form.elements.email.value.trim();
    const password = form.elements.password.value;
    const originalLabel = submitButton.textContent;

    feedback.className = 'alert d-none';
    submitButton.disabled = true;
    submitButton.textContent = 'Signing in...';

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data.token) {
        showFeedback(data.message || 'Unable to sign in. Please check your details.');
        return;
      }

      localStorage.setItem('ibms-auth-token', data.token);
      localStorage.setItem('ibms-auth-user', JSON.stringify(data.user || {}));
      window.location.replace('pages/dashboard.html');
    } catch (error) {
      showFeedback('Unable to reach the server. Please try again shortly.');
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = originalLabel;
    }
  });
});
