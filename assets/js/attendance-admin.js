document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('attendance-admin');
  if (!container) return;

  const tableBody = container.querySelector('tbody');
  const stats = container.querySelector('.attendance-stats');

  function renderRow(a) {
    return `<tr>
      <td>${a.employee?.employee_number || ''}</td>
      <td>${a.employee?.user?.name || ''}</td>
      <td>${a.date}</td>
      <td>${a.check_in_time ? new Date(a.check_in_time).toLocaleTimeString() : ''}</td>
      <td>${a.check_out_time ? new Date(a.check_out_time).toLocaleTimeString() : ''}</td>
      <td>${a.status || ''}</td>
      <td>${a.working_minutes || ''}</td>
    </tr>`;
  }

  function load(filter = {}) {
    const params = new URLSearchParams(filter).toString();
    ibmsFetch('/api/attendance?' + params)
      .then(r => r.json())
      .then(data => {
        tableBody.innerHTML = data.data.map(renderRow).join('');
        // basic stats
        stats.innerHTML = `Total: ${data.total}`;
      })
      .catch(err => {
        tableBody.innerHTML = '<tr><td colspan="7">Failed to load</td></tr>';
      });
  }

  // initial load
  load();

  // hook up filters later
});
