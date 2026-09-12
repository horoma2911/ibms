document.addEventListener('DOMContentLoaded', async () => {
  const tableBody = document.getElementById('purchases-history-body');
  const emptyState = document.getElementById('purchases-history-empty');
  if (!tableBody) return;

  function renderPurchaseRows(purchases) {
    if (!purchases.length) {
      tableBody.innerHTML = '';
      emptyState.hidden = false;
      return;
    }

    emptyState.hidden = true;
    tableBody.innerHTML = purchases.map((purchase) => {
      const status = purchase.status || 'Pending';
      const statusClass = status === 'Received'
        ? 'bg-success-subtle text-success'
        : status === 'Approved'
          ? 'bg-info-subtle text-info'
          : 'bg-warning-subtle text-warning';
      const createdAt = purchase.created_at ? new Date(purchase.created_at).toLocaleString() : '—';

      return `
        <tr>
          <td>${purchase.id || 'PO-0000'}</td>
          <td>${purchase.supplier || '—'}</td>
          <td>${purchase.product || '—'}</td>
          <td>${purchase.qty || 0}</td>
          <td>Tshs ${Number(purchase.amount || 0).toLocaleString()}</td>
          <td><span class="badge badge-status ${statusClass}">${status}</span></td>
          <td>${createdAt}</td>
          <td>
            <div class="d-flex gap-2">
              <button type="button" class="btn btn-sm btn-outline-primary edit-purchase-history" data-purchase-id="${purchase.id || ''}"><i class="fas fa-edit me-1"></i>Edit</button>
              <button type="button" class="btn btn-sm btn-outline-danger delete-purchase-history" data-purchase-id="${purchase.id || ''}"><i class="fas fa-trash me-1"></i>Delete</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    tableBody.querySelectorAll('.edit-purchase-history').forEach((button) => {
      button.addEventListener('click', () => {
        const purchaseId = button.dataset.purchaseId;
        const purchases = getPurchases();
        const target = purchases.find((purchase) => String(purchase.id) === String(purchaseId));
        if (!target) return;

        const supplier = window.prompt('Supplier name', target.supplier || '');
        if (supplier === null) return;
        const product = window.prompt('Product name', target.product || '');
        if (product === null) return;
        const quantity = Number(window.prompt('Quantity', String(target.qty || 0)));
        const amount = Number(window.prompt('Amount', String(target.amount || 0)));
        const status = window.prompt('Status', target.status || 'Pending');

        const updated = purchases.map((purchase) => {
          if (String(purchase.id) !== String(purchaseId)) return purchase;
          return {
            ...purchase,
            supplier: supplier.trim() || purchase.supplier,
            product: product.trim() || purchase.product,
            qty: Number.isFinite(quantity) && quantity > 0 ? quantity : Number(purchase.qty || 0),
            amount: Number.isFinite(amount) && amount >= 0 ? amount : Number(purchase.amount || 0),
            status: status && status.trim() ? status.trim() : purchase.status,
          };
        });

        persistPurchases(updated);
        renderPurchaseRows(updated);
        if (typeof showToast === 'function') {
          showToast('Purchase updated.', 'success');
        }
      });
    });

    tableBody.querySelectorAll('.delete-purchase-history').forEach((button) => {
      button.addEventListener('click', () => {
        const purchaseId = button.dataset.purchaseId;
        const remaining = getPurchases().filter((purchase) => String(purchase.id) !== String(purchaseId));
        persistPurchases(remaining);
        renderPurchaseRows(remaining);
        if (typeof showToast === 'function') {
          showToast('Purchase deleted.', 'success');
        }
      });
    });
  }

  async function loadPurchaseHistory() {
    try {
      let purchases = [];
      try {
        const resp = await ibmsFetch('/api/purchases');
        if (resp.ok) {
          const data = await resp.json();
          purchases = Array.isArray(data.purchases) ? data.purchases : Array.isArray(data) ? data : [];
        }
      } catch (error) {
        console.warn('Unable to load remote purchases, falling back to local storage.', error);
      }

      if (!purchases.length && typeof getPurchases === 'function') {
        purchases = getPurchases();
      }

      renderPurchaseRows(purchases);
    } catch (error) {
      console.error('Failed to load purchase history', error);
      emptyState.hidden = false;
      emptyState.textContent = 'Unable to load purchase history right now.';
    }
  }

  await loadPurchaseHistory();
});
