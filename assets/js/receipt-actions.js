(function () {
  function ensureLocalReceiptAccess() {
    const isLocal = location.hostname === '127.0.0.1' || location.hostname === 'localhost';
    if (isLocal && !localStorage.getItem('ibms-auth-token') && !localStorage.getItem('ibms-admin-key')) {
      localStorage.setItem('ibms-admin-key', 'localtest');
    }
  }

  function showReceiptActions(url) {
    let actions = document.getElementById('receipt-download-actions');
    if (!actions) {
      actions = document.createElement('div');
      actions.id = 'receipt-download-actions';
      actions.className = 'alert alert-success d-flex align-items-center gap-2 flex-wrap mt-3';
      document.querySelector('.page-content')?.prepend(actions);
    }

    actions.innerHTML = [
      '<i class="fas fa-check-circle"></i><span>Receipt is ready.</span>',
      '<a class="btn btn-sm btn-outline-success" target="_blank" rel="noopener">View receipt</a>',
      '<a class="btn btn-sm btn-success" download="receipt.pdf"><i class="fas fa-download me-1"></i>Download receipt</a>'
    ].join('');
    actions.querySelectorAll('a').forEach((link) => { link.href = url; });
  }

  window.ibmsGenerateReceipt = async function (saleId, receiptWindow) {
    if (!saleId) throw new Error('The saved sale ID is missing.');
    ensureLocalReceiptAccess();

    const response = await ibmsFetch('/api/receipts/generate', {
      method: 'POST',
      headers: { Accept: 'application/pdf' },
      body: JSON.stringify({ sale_id: saleId })
    });

    if (!response.ok) {
      const detail = await response.text();
      if (receiptWindow) receiptWindow.close();
      if (response.status === 401) throw new Error('Please sign in before generating a receipt.');
      throw new Error(detail || `Receipt generation failed (${response.status}).`);
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    if (receiptWindow) receiptWindow.location.href = url;
    showReceiptActions(url);
    window.setTimeout(() => URL.revokeObjectURL(url), 300000);
    return url;
  };
})();
