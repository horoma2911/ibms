 (function(){
   document.addEventListener('DOMContentLoaded', function(){
     const recordInline = document.getElementById('record-sale-inline');
     const recordBtn = document.getElementById('record-sale-btn');
     const genBtn = document.getElementById('generate-receipt-btn');

     function readFormItem() {
       const prodSelect = document.getElementById('sales-product-select');
       const packSelect = document.getElementById('sales-packaging-select');
       const qtyInput = document.querySelector('.panel-card input[type="number"]');
       const priceInput = document.querySelector('.panel-card input[type="text"]');

       const selected = prodSelect?.options[prodSelect.selectedIndex];
       if (!selected || !selected.value) return null;

       const product_id = selected.value;
       const name = selected.textContent.trim();
       const package_size = parseInt(packSelect?.value || '0', 10) || 0;
       const qty = Math.max(1, parseInt(qtyInput?.value || '1', 10));
       const price = parseFloat((priceInput?.value || '').toString().replace(/[^0-9.]/g,'')) || 0;

       if (!package_size) {
         const productCategory = getProductCategoryKey(selected?.dataset?.category || '', selected?.textContent || '');
         const unitLabel = productCategory === 'construction' ? 'pieces' : 'kg';
         alert(`Please select a package size so the receipt can calculate total ${unitLabel}.`);
         return null;
       }
       if (price <= 0) {
         alert('This product has no unit price. Add its selling price before recording the sale.');
         return null;
       }

       return { product_id, sku: selected.value, name, qty, price, package_size, total_kg: package_size * qty };
     }

     async function recordSingle(shouldGenerateReceipt = false) {
       const item = readFormItem();
       if (!item) { alert('Please select a product'); return; }

       const payload = { items: [item], payment_method: 'Cash' };
       // This must run during the click event. Otherwise a browser can block
       // the receipt tab after the sale request has completed.
       const receiptWindow = shouldGenerateReceipt ? window.open('', '_blank') : null;

       try {
         const resp = await ibmsFetch('/api/sales', { method: 'POST', body: JSON.stringify(payload) });
         if (!resp.ok) { const txt = await resp.text(); alert('Failed to record sale: ' + (txt || resp.status)); return; }
         const json = await resp.json().catch(() => null);

         if (shouldGenerateReceipt) {
           await window.ibmsGenerateReceipt(json?.sale?.id, receiptWindow);
         }

         // clear inputs
         try {
           document.getElementById('sales-product-select').selectedIndex = 0;
           const pack = document.getElementById('sales-packaging-select'); if (pack) pack.selectedIndex = 0;
           const q = document.querySelector('.panel-card input[type="number"]'); if (q) q.value = 1;
           const p = document.querySelector('.panel-card input[type="text"]'); if (p) p.value = '';
           if (typeof showToast === 'function') showToast(shouldGenerateReceipt ? 'Sale recorded and receipt generated.' : 'Sale recorded successfully.', 'success');
         } catch(e){}
       } catch (err) {
         if (receiptWindow) receiptWindow.close();
         console.error(err);
         alert('Failed to record sale');
       }
     }

     // Sales are recorded without automatically generating a receipt.
     // Use the dedicated "Generate Receipt" action only when the user explicitly wants it.
     if (recordInline) recordInline.addEventListener('click', () => recordSingle(false));
     if (recordBtn) recordBtn.addEventListener('click', () => recordSingle(false));
     if (genBtn) genBtn.addEventListener('click', () => recordSingle(true));
   });
})();
