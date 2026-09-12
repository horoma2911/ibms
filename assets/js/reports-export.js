(function(){
  function ensureLocalAdminKey() {
    const auth = localStorage.getItem('ibms-auth-token');
    const current = localStorage.getItem('ibms-admin-key');
    if (!auth && !current && (location.hostname === '127.0.0.1' || location.hostname === 'localhost')) {
      localStorage.setItem('ibms-admin-key', 'localtest');
      console.debug('Set local admin key for dev testing');
    }
  }

  document.addEventListener('DOMContentLoaded', function(){
    ensureLocalAdminKey();
    const form = document.querySelector('[data-report-form]');
    if (!form) return;

    form.addEventListener('submit', async function(e){
      e.preventDefault();
      const type = form.querySelector('[name="type"]')?.value || 'performance';
      const category = form.querySelector('select[name="category"]')?.value || 'all';

      try {
        if (type === 'sales') {
          const sales = typeof getSales === 'function' ? getSales() : [];
          const rows = [
            ['Reference', 'Date', 'Payment', 'Total Amount', 'Total kg', 'Items'],
            ...sales.map((sale) => {
              const items = Array.isArray(sale.items) ? sale.items.map((item) => `${item.name || 'Item'} (${item.qty || 0})`).join('; ') : '';
              return [
                sale.reference || sale.id || '',
                sale.created_at ? new Date(sale.created_at).toISOString().slice(0, 10) : '',
                sale.payment_method || '',
                Number(sale.total_amount || 0),
                Number(sale.total_kg || 0),
                items,
              ];
            }),
          ];

          const csv = rows.map((row) => row.map((value) => `"${String(value ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
          const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'sales-report.csv';
          document.body.appendChild(a);
          a.click();
          a.remove();
          URL.revokeObjectURL(url);
          return;
        }

        if (type === 'purchases') {
          const purchases = typeof getPurchases === 'function' ? getPurchases() : [];
          const rows = [
            ['Order ID', 'Supplier', 'Product', 'Qty', 'Amount', 'Status', 'Date'],
            ...purchases.map((purchase) => [
              purchase.id || '',
              purchase.supplier || '',
              purchase.product || '',
              purchase.qty || 0,
              Number(purchase.amount || 0),
              purchase.status || '',
              purchase.created_at ? new Date(purchase.created_at).toISOString().slice(0, 10) : '',
            ]),
          ];

          const csv = rows.map((row) => row.map((value) => `"${String(value ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
          const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'purchases-report.csv';
          document.body.appendChild(a);
          a.click();
          a.remove();
          URL.revokeObjectURL(url);
          return;
        }

        const auth = localStorage.getItem('ibms-auth-token');
        let adminKey = localStorage.getItem('ibms-admin-key');
        if (!auth && !adminKey) {
          ensureLocalAdminKey();
          adminKey = localStorage.getItem('ibms-admin-key');
        }
        if (!auth && !adminKey) {
          if (!confirm('No auth token found. Continue using admin key? This is only for local testing.')) return;
        }

        const reportUrl = '/api/reports/generate?type=' + encodeURIComponent(type) + '&category=' + encodeURIComponent(category);
        const headers = {};
        const token = localStorage.getItem('ibms-auth-token');
        const key = localStorage.getItem('ibms-admin-key');
        if (token) headers['Authorization'] = 'Bearer ' + token;
        else if (key) headers['X-IBMS-ADMIN'] = key;
        headers['Accept'] = 'application/pdf, application/json';

        const resp = await ibmsFetch(reportUrl, { method: 'GET', headers });
        if (!resp.ok) {
          const txt = await resp.text();
          alert('Export failed: ' + (txt || resp.status));
          return;
        }

        const ct = resp.headers.get('content-type') || '';
        if (ct.includes('application/json')) {
          const json = await resp.json();
          alert(json.message || 'Export failed');
          return;
        }

        const blob = await resp.blob();
        const blobUrl = URL.createObjectURL(blob);
        const win = window.open(blobUrl, '_blank');
        if (!win) {
          window.location.href = blobUrl;
        }
      } catch (err) {
        console.error(err);
        alert('Export failed (see console)');
      }
    });
  });
})();
