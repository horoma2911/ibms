document.addEventListener('DOMContentLoaded', async () => {
  const tableBody = document.getElementById('sales-history-body');
  const emptyState = document.getElementById('sales-history-empty');
  if (!tableBody) return;

  async function loadSalesHistory() {
    try {
      let sales = [];
      try {
        const resp = await ibmsFetch('/api/sales');
        if (resp.ok) {
          const data = await resp.json();
          sales = Array.isArray(data.sales) ? data.sales : [];
        }
      } catch (error) {
        console.warn('Falling back to local sales data.', error);
      }

      if (!sales.length && typeof getSales === 'function') {
        sales = getSales();
      }

      if (!sales.length) {
        tableBody.innerHTML = '';
        emptyState.hidden = false;
        return;
      }

      emptyState.hidden = true;
      tableBody.innerHTML = sales.map((sale) => {
        const itemText = (sale.items || []).map(item => `${item.name} (${item.qty}x${item.package_size || 'unit'})`).join('<br>');
        const created = sale.created_at ? new Date(sale.created_at).toLocaleString() : '—';
        const hasConstruction = (sale.items || []).some(item => getProductCategoryKey(item.category || '', item.name || '') === 'construction');
        const quantityLabel = hasConstruction ? 'pieces' : 'kg';
        return `
          <tr>
            <td>${sale.reference || '—'}</td>
            <td>${created}</td>
            <td>${sale.payment_method || 'Cash'}</td>
            <td>${Number(sale.total_kg || 0).toFixed(1)} ${quantityLabel}</td>
            <td>Tshs ${Number(sale.total_amount || 0).toLocaleString()}</td>
            <td>${itemText || '—'}</td>
            <td><button type="button" class="btn btn-sm btn-primary generate-sale-receipt" data-sale-id="${sale.id}"><i class="fas fa-receipt me-1"></i>Receipt</button></td>
            <td><button type="button" class="btn btn-sm btn-outline-danger delete-sale-history" data-sale-id="${sale.id}" data-sale-reference="${(sale.reference || 'sale').replace(/"/g, '&quot;')}"><i class="fas fa-trash me-1"></i>Delete</button></td>
          </tr>
        `;
      }).join('');

      tableBody.querySelectorAll('.generate-sale-receipt').forEach((button) => {
        button.addEventListener('click', async () => {
          const receiptWindow = window.open('', '_blank');
          button.disabled = true;
          try {
            await window.ibmsGenerateReceipt(button.dataset.saleId, receiptWindow);
          } catch (error) {
            if (receiptWindow) receiptWindow.close();
            alert(error.message || 'Unable to generate receipt.');
          } finally {
            button.disabled = false;
          }
        });
      });

      tableBody.querySelectorAll('.delete-sale-history').forEach((button) => {
        button.addEventListener('click', async () => {
          const saleId = button.dataset.saleId;
          const reference = button.dataset.saleReference || 'this sale';
          const shouldDelete = window.confirm(`Delete ${reference} from sales history?`);
          if (!shouldDelete) return;

          button.disabled = true;
          try {
            const resp = await ibmsFetch(`/api/sales/${saleId}`, { method: 'DELETE' });
            if (!resp.ok) {
              const payload = await resp.json().catch(() => ({}));
              throw new Error(payload.message || 'Unable to delete sale.');
            }

            await loadSalesHistory();
          } catch (error) {
            alert(error.message || 'Unable to delete sale.');
          } finally {
            button.disabled = false;
          }
        });
      });
    } catch (error) {
      console.error('Failed to load sales history', error);
      emptyState.hidden = false;
      emptyState.textContent = 'Unable to load sales history right now.';
    }
  }

  await loadSalesHistory();
});
