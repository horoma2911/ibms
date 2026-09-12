// Global fetch wrapper to standardize headers and auth handling
function resolveApiUrl(input) {
  if (typeof input !== 'string' || !input.startsWith('/api')) {
    return input;
  }

  const baseFromStorage = localStorage.getItem('ibms-api-base-url');
  if (baseFromStorage) {
    return `${baseFromStorage.replace(/\/$/, '')}${input}`;
  }

  const currentOrigin = window.location.origin;
  if (currentOrigin && currentOrigin !== 'null' && currentOrigin !== 'file://') {
    return input;
  }

  const backendCandidates = [
    'http://127.0.0.1:8000',
    'http://localhost:8000',
    'http://127.0.0.1',
    'http://localhost'
  ];

  const selected = backendCandidates.find((candidate) => {
    try {
      const probe = new URL('/api/health', candidate);
      return probe.origin;
    } catch (error) {
      return false;
    }
  }) || backendCandidates[0];

  localStorage.setItem('ibms-api-base-url', selected);
  return `${selected}${input}`;
}

function getProductCategoryKey(value, productName = '') {
  const raw = (value || '').toString().trim().toLowerCase();
  const haystack = `${raw} ${productName || ''}`.toLowerCase();

  if (/(construction|brick|tofali|roufer|roof|cement|block|masonry|concrete)/.test(haystack)) {
    return 'construction';
  }

  if (/(agriculture|rice|maize|grain|seed|fertilizer|crop|farm|plant)/.test(haystack)) {
    return 'agriculture';
  }

  if (/(input|chemical|fertilizer|pesticide|tool|equipment|supplies)/.test(haystack)) {
    return 'inputs';
  }

  return raw || 'all';
}

function getProductCategoryLabel(categoryKey) {
  switch (categoryKey) {
    case 'construction': return 'Construction';
    case 'agriculture': return 'Agriculture';
    case 'inputs': return 'Inputs';
    default: return 'General';
  }
}

function getProductMeasurementUnit(productName = '', categoryValue = '') {
  const categoryKey = getProductCategoryKey(categoryValue || '', productName || '');
  return categoryKey === 'construction' ? 'pieces' : 'kg';
}

window.ibmsFetch = function (input, init = {}) {
  const normalizedInput = resolveApiUrl(input);
  const opts = Object.assign({}, init);
  opts.headers = Object.assign({}, opts.headers || {});

  // Default Accept
  if (!Object.keys(opts.headers).some(h => h.toLowerCase() === 'accept')) {
    opts.headers['Accept'] = 'application/json';
  }

  // If body is present and no content-type, assume JSON
  if (opts.body && !Object.keys(opts.headers).some(h => h.toLowerCase() === 'content-type')) {
    opts.headers['Content-Type'] = 'application/json';
  }

  // Attach tokens: prefer user auth token, fall back to kiosk token
  const auth = localStorage.getItem('ibms-auth-token');
  const kiosk = localStorage.getItem('ibms-kiosk-token');
  const adminKey = localStorage.getItem('ibms-admin-key');

  if (auth) {
    opts.headers['Authorization'] = 'Bearer ' + auth;
  } else if (kiosk) {
    opts.headers['Authorization'] = 'Bearer ' + kiosk;
  }

  if (adminKey && !opts.headers['X-IBMS-ADMIN']) {
    opts.headers['X-IBMS-ADMIN'] = adminKey;
  }

  return fetch(normalizedInput, opts).then((resp) => {
    const requestUrl = typeof input === 'string' ? input : (input && input.url) || '';
    const isReportRequest = /\/api\/(reports|receipts)\//.test(requestUrl) || /\/api\/(reports|receipts)\//.test(normalizedInput || '');

    if (resp.status === 401 && !isReportRequest) {
      // Clear auth and redirect to login for re-auth on protected app endpoints.
      // Report exports should surface an error instead of taking the user to the login page.
      localStorage.removeItem('ibms-auth-token');
      localStorage.removeItem('ibms-auth-user');
      try { window.location.replace('/login.html'); } catch (e) {}
    }
    return resp;
  }).catch((error) => {
    if (typeof input === 'string' && input.startsWith('/api') && normalizedInput !== input) {
      return fetch(input, opts).catch(() => { throw error; });
    }
    throw error;
  });
};

function isDashboardPage() {
  const path = window.location.pathname || '';
  return /(^|\/)(dashboard\.html?)?$/.test(path) || path === '/';
}

function ensureLogoutControls() {
  if (!document.body || !isDashboardPage()) {
    document.querySelectorAll('#ibms-logout-btn, #ibms-logout-btn-topbar, #dashboard-logout-btn').forEach((node) => node.remove());
    return;
  }

  const topbarActions = document.querySelector('.topbar-actions');
  if (!topbarActions) return;

  const existing = document.getElementById('dashboard-logout-btn');
  if (existing) {
    // If the markup provides the button already, ensure it has the logout handler attached.
    if (!existing.dataset.bound) {
      existing.addEventListener('click', () => {
        localStorage.removeItem('ibms-auth-token');
        localStorage.removeItem('ibms-auth-user');
        localStorage.removeItem('ibms-kiosk-token');
        localStorage.removeItem('ibms-admin-key');
        window.location.href = '/login.html';
      });
      existing.dataset.bound = 'true';
    }
    return;
  }

  const dashboardLogout = document.createElement('button');
  dashboardLogout.id = 'dashboard-logout-btn';
  dashboardLogout.type = 'button';
  dashboardLogout.className = 'btn btn-sm btn-outline-danger';
  dashboardLogout.innerHTML = '<i class="fas fa-sign-out-alt me-1"></i>Logout';
  dashboardLogout.addEventListener('click', () => {
    localStorage.removeItem('ibms-auth-token');
    localStorage.removeItem('ibms-auth-user');
    localStorage.removeItem('ibms-kiosk-token');
    localStorage.removeItem('ibms-admin-key');
    window.location.href = '/login.html';
  });

  const firstAction = topbarActions.firstChild;
  if (firstAction) {
    topbarActions.insertBefore(dashboardLogout, firstAction);
  } else {
    topbarActions.appendChild(dashboardLogout);
  }
}

function bindRouteButtons() {
  document.querySelectorAll('[data-route]').forEach((button) => {
    if (button.dataset.routeBound === 'true') {
      return;
    }

    button.dataset.routeBound = 'true';
    button.addEventListener('click', (event) => {
      const target = button.getAttribute('data-route');
      if (!target) {
        return;
      }

      event.preventDefault();
      const isNewTab = button.getAttribute('data-new-tab') === 'true';
      if (isNewTab) {
        window.open(target, '_blank', 'noopener,noreferrer');
        return;
      }

      window.location.href = target;
    });
  });
}

function getSupplierStorageKey() {
  return 'ibms-suppliers';
}

function getDefaultSuppliers() {
  return [
    {
      id: 'supplier-agri-supply',
      company: 'Agri Supply Co.',
      contact: '+254710998877',
      category: 'Seeds & Fertilizer',
      lead_time: '3 days',
      status: 'Reliable',
    },
    {
      id: 'supplier-construction-plus',
      company: 'Construction Plus Ltd.',
      contact: '+254722440011',
      category: 'Construction Materials',
      lead_time: '5 days',
      status: 'Needs Review',
    }
  ];
}

function getSuppliers() {
  try {
    const raw = localStorage.getItem(getSupplierStorageKey());
    if (!raw) {
      const defaults = getDefaultSuppliers();
      localStorage.setItem(getSupplierStorageKey(), JSON.stringify(defaults));
      return defaults;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length ? parsed : getDefaultSuppliers();
  } catch (error) {
    return getDefaultSuppliers();
  }
}

function persistSuppliers(suppliers) {
  localStorage.setItem(getSupplierStorageKey(), JSON.stringify(suppliers));
}

function getCustomerStorageKey() {
  return 'ibms-customers';
}

function getDefaultCustomers() {
  return [
    {
      id: 'customer-hassan-salim',
      name: 'Hassan Salim',
      phone: '+254700112233',
      region: 'Nairobi',
      balance: 140000,
      status: 'Active',
    },
    {
      id: 'customer-mariam-ali',
      name: 'Mariam Ali',
      phone: '+254712334455',
      region: 'Arusha',
      balance: 95000,
      status: 'VIP',
    }
  ];
}

function getCustomers() {
  try {
    const raw = localStorage.getItem(getCustomerStorageKey());
    if (!raw) {
      const defaults = getDefaultCustomers();
      localStorage.setItem(getCustomerStorageKey(), JSON.stringify(defaults));
      return defaults;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length ? parsed : getDefaultCustomers();
  } catch (error) {
    return getDefaultCustomers();
  }
}

function persistCustomers(customers) {
  localStorage.setItem(getCustomerStorageKey(), JSON.stringify(customers));
}

function renderCustomersTable() {
  const tableBody = document.querySelector('#customers-table-body');
  if (!tableBody) return;

  const customers = getCustomers();
  const totalCustomers = document.getElementById('customers-total-count');
  const outstanding = document.getElementById('customers-outstanding');
  const vipCount = document.getElementById('customers-vip-count');

  if (totalCustomers) totalCustomers.textContent = String(customers.length);
  if (outstanding) outstanding.textContent = `Tshs ${customers.reduce((sum, customer) => sum + Number(customer.balance || 0), 0).toLocaleString()}`;
  if (vipCount) vipCount.textContent = String(customers.filter((customer) => (customer.status || 'Active') === 'VIP').length);

  tableBody.innerHTML = customers.map((customer) => {
    const status = customer.status || 'Active';
    const statusClass = status === 'VIP'
      ? 'bg-warning-subtle text-warning'
      : status === 'Inactive'
        ? 'bg-secondary-subtle text-secondary'
        : 'bg-success-subtle text-success';

    return `
      <tr data-customer-id="${customer.id || customer.name}">
        <td>${customer.name || '—'}</td>
        <td>${customer.phone || '—'}</td>
        <td>${customer.region || '—'}</td>
        <td>Tshs ${Number(customer.balance || 0).toLocaleString()}</td>
        <td><span class="badge badge-status ${statusClass}">${status}</span></td>
        <td>
          <div class="d-flex gap-2">
            <button type="button" class="btn btn-sm btn-outline-primary" data-action="edit" data-form-type="customers" data-customer-id="${customer.id || customer.name}"><i class="fas fa-edit me-1"></i>Edit</button>
            <button type="button" class="btn btn-sm btn-outline-danger" data-action="delete" data-form-type="customers" data-customer-id="${customer.id || customer.name}"><i class="fas fa-trash me-1"></i>Delete</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  tableBody.querySelectorAll('[data-action][data-form-type="customers"]').forEach((button) => {
    button.addEventListener('click', async (event) => {
      event.preventDefault();
      const action = button.getAttribute('data-action');
      const customerId = button.getAttribute('data-customer-id') || '';

      if (action === 'delete') {
        const customer = getCustomers().find((entry) => String(entry.id || entry.name) === String(customerId));
        const customerName = customer?.name || 'this customer';
        const shouldDelete = window.confirm(`Delete ${customerName} from the customer list?`);
        if (!shouldDelete) return;

        const customers = getCustomers().filter((entry) => String(entry.id || entry.name) !== String(customerId));
        persistCustomers(customers);
        renderCustomersTable();
        showToast('Customer deleted successfully.', 'success');
        return;
      }

      const modalEl = document.getElementById('ibms-action-modal');
      if (!modalEl) return;
      const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
      const form = document.getElementById('ibms-action-form');
      const titleEl = document.getElementById('ibms-action-title');
      const subtitleEl = document.getElementById('ibms-action-subtitle');
      const bodyEl = document.getElementById('ibms-action-body');
      const config = getActionConfig('customers', action);

      titleEl.textContent = config.title;
      subtitleEl.textContent = config.subtitle;
      bodyEl.innerHTML = config.body;
      form.setAttribute('data-form-type', 'customers');
      form.setAttribute('data-action', action);
      if (customerId) form.setAttribute('data-customer-id', customerId);

      const customer = getCustomers().find((entry) => String(entry.id || entry.name) === String(customerId));
      if (customer) {
        const fields = {
          name: customer.name || '',
          phone: customer.phone || '',
          region: customer.region || '',
          balance: customer.balance || 0,
          status: customer.status || 'Active',
        };
        Object.entries(fields).forEach(([name, value]) => {
          const target = bodyEl.querySelector(`[name="${name}"]`);
          if (target) target.value = value;
        });
      }

      modal.show();
    });
  });
}

function renderSuppliersTable() {
  const tableBody = document.querySelector('#suppliers-table-body');
  if (!tableBody) return;

  const suppliers = getSuppliers();
  tableBody.innerHTML = suppliers.map((supplier) => {
    const status = supplier.status || 'Reliable';
    const statusClass = status === 'Inactive'
      ? 'bg-secondary-subtle text-secondary'
      : status === 'Paused'
        ? 'bg-warning-subtle text-warning'
        : status === 'Needs Review'
          ? 'bg-info-subtle text-info'
          : 'bg-success-subtle text-success';

    return `
      <tr data-supplier-id="${supplier.id || supplier.company}">
        <td>${supplier.company || '—'}</td>
        <td>${supplier.contact || '—'}</td>
        <td>${supplier.category || '—'}</td>
        <td>${supplier.lead_time || '—'}</td>
        <td><span class="badge badge-status ${statusClass}">${status}</span></td>
        <td>
          <div class="d-flex gap-2">
            <button type="button" class="btn btn-sm btn-outline-primary" data-action="edit" data-form-type="suppliers" data-supplier-id="${supplier.id || supplier.company}"><i class="fas fa-edit me-1"></i>Edit</button>
            <button type="button" class="btn btn-sm btn-outline-danger" data-action="delete" data-form-type="suppliers" data-supplier-id="${supplier.id || supplier.company}"><i class="fas fa-trash me-1"></i>Delete</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  tableBody.querySelectorAll('[data-action][data-form-type="suppliers"]').forEach((button) => {
    button.addEventListener('click', async (event) => {
      event.preventDefault();
      const action = button.getAttribute('data-action');
      const supplierId = button.getAttribute('data-supplier-id') || '';

      if (action === 'delete') {
        const supplier = getSuppliers().find((entry) => String(entry.id || entry.company) === String(supplierId));
        const supplierName = supplier?.company || 'this supplier';
        const shouldDelete = window.confirm(`Delete ${supplierName} from the supplier list?`);
        if (!shouldDelete) return;

        const suppliers = getSuppliers().filter((entry) => String(entry.id || entry.company) !== String(supplierId));
        persistSuppliers(suppliers);
        renderSuppliersTable();
        showToast('Supplier deleted successfully.', 'success');
        return;
      }

      const modalEl = document.getElementById('ibms-action-modal');
      if (!modalEl) return;
      const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
      const form = document.getElementById('ibms-action-form');
      const titleEl = document.getElementById('ibms-action-title');
      const subtitleEl = document.getElementById('ibms-action-subtitle');
      const bodyEl = document.getElementById('ibms-action-body');
      const config = getActionConfig('suppliers', action);

      titleEl.textContent = config.title;
      subtitleEl.textContent = config.subtitle;
      bodyEl.innerHTML = config.body;
      form.setAttribute('data-form-type', 'suppliers');
      form.setAttribute('data-action', action);
      if (supplierId) form.setAttribute('data-supplier-id', supplierId);

      const supplier = getSuppliers().find((entry) => String(entry.id || entry.company) === String(supplierId));
      if (supplier) {
        const fields = {
          company: supplier.company || '',
          contact: supplier.contact || '',
          category: supplier.category || '',
          lead_time: supplier.lead_time || '',
          status: supplier.status || 'Reliable',
        };
        Object.entries(fields).forEach(([name, value]) => {
          const target = bodyEl.querySelector(`[name="${name}"]`);
          if (target) target.value = value;
        });
      }

      modal.show();
    });
  });
}

function getPurchaseStorageKey() {
  return 'ibms-purchases';
}

function getSalesStorageKey() {
  return 'ibms-sales';
}

function getDefaultSales() {
  const today = new Date();
  return [
    {
      id: 'S-1047',
      reference: 'INV-1047',
      customer: 'Walk-in Customer',
      total_amount: 820000,
      total_kg: 155,
      payment_method: 'Cash',
      created_at: new Date(today.getTime() - 1000 * 60 * 60 * 24 * 2).toISOString(),
      items: [
        { name: 'Rice Grade 1', qty: 90, package_size: '50kg', category: 'agriculture' },
        { name: 'Cement Bags', qty: 65, package_size: 'pieces', category: 'construction' },
      ],
    },
    {
      id: 'S-1048',
      reference: 'INV-1048',
      customer: 'Amani Traders',
      total_amount: 540000,
      total_kg: 88,
      payment_method: 'Bank Transfer',
      created_at: new Date(today.getTime() - 1000 * 60 * 60 * 12).toISOString(),
      items: [
        { name: 'Rice Grade 2', qty: 50, package_size: '25kg', category: 'agriculture' },
        { name: 'Cement Bags', qty: 38, package_size: 'pieces', category: 'construction' },
      ],
    },
  ];
}

function getSales() {
  try {
    const raw = localStorage.getItem(getSalesStorageKey());
    if (!raw) {
      localStorage.setItem(getSalesStorageKey(), JSON.stringify(getDefaultSales()));
      return getDefaultSales();
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length ? parsed : getDefaultSales();
  } catch (error) {
    return getDefaultSales();
  }
}

function persistSales(sales) {
  localStorage.setItem(getSalesStorageKey(), JSON.stringify(sales));
}

function getDefaultPurchases() {
  return [
    {
      id: 'PO-1042',
      supplier: 'Agri Supply Co.',
      product: 'Rice Grade A',
      qty: 40,
      amount: 100000,
      payment_method: 'Cash',
      status: 'Pending',
      created_at: new Date().toISOString(),
    },
    {
      id: 'PO-1043',
      supplier: 'Construction Plus Ltd.',
      product: 'Cement Bags',
      qty: 20,
      amount: 160000,
      payment_method: 'Bank Transfer',
      status: 'Approved',
      created_at: new Date().toISOString(),
    }
  ];
}

function getPurchases() {
  try {
    const raw = localStorage.getItem(getPurchaseStorageKey());
    if (!raw) {
      localStorage.setItem(getPurchaseStorageKey(), JSON.stringify(getDefaultPurchases()));
      return getDefaultPurchases();
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length ? parsed : getDefaultPurchases();
  } catch (error) {
    return getDefaultPurchases();
  }
}

function persistPurchases(purchases) {
  localStorage.setItem(getPurchaseStorageKey(), JSON.stringify(purchases));
}

function formatCurrency(amount) {
  return `Tshs ${Number(amount || 0).toLocaleString()}`;
}

function setupReportsPage() {
  const salesSummary = document.getElementById('sales-report-summary');
  const purchaseSummary = document.getElementById('purchase-report-summary');
  const salesDetail = document.getElementById('sales-report-detail');
  const purchaseDetail = document.getElementById('purchase-report-detail');

  if (!salesSummary && !purchaseSummary) return;

  const sales = getSales();
  const purchases = getPurchases();

  const salesTotal = sales.reduce((sum, sale) => sum + Number(sale.total_amount || 0), 0);
  const purchaseTotal = purchases.reduce((sum, purchase) => sum + Number(purchase.amount || 0), 0);
  const salesCount = sales.length;
  const purchaseCount = purchases.length;

  if (salesSummary) {
    salesSummary.innerHTML = `<div class="fs-4 fw-bold mb-1">${formatCurrency(salesTotal)}</div><div class="text-muted">${salesCount} sale ${salesCount === 1 ? 'record' : 'records'}</div>`;
  }
  if (purchaseSummary) {
    purchaseSummary.innerHTML = `<div class="fs-4 fw-bold mb-1">${formatCurrency(purchaseTotal)}</div><div class="text-muted">${purchaseCount} purchase ${purchaseCount === 1 ? 'record' : 'records'}</div>`;
  }
  if (salesDetail) {
    salesDetail.textContent = sales.length ? `Latest: ${sales[0].reference || 'INV'} · ${new Date(sales[0].created_at).toLocaleDateString()}` : 'No sales recorded';
  }
  if (purchaseDetail) {
    purchaseDetail.textContent = purchases.length ? `Latest: ${purchases[0].id} · ${new Date(purchases[0].created_at).toLocaleDateString()}` : 'No purchases recorded';
  }
}

function renderPurchasesTable() {
  const tableBody = document.querySelector('#purchases-table-body');
  if (!tableBody) return;

  const purchases = getPurchases();
  tableBody.innerHTML = purchases.map((purchase) => {
    const status = purchase.status || 'Pending';
    const statusClass = status === 'Received'
      ? 'bg-success-subtle text-success'
      : status === 'Approved'
        ? 'bg-info-subtle text-info'
        : 'bg-warning-subtle text-warning';

    return `
      <tr>
        <td>${purchase.id || 'PO-0000'}</td>
        <td>${purchase.supplier || '—'}</td>
        <td>${purchase.product || '—'}</td>
        <td>${purchase.qty || 0}</td>
        <td>${formatCurrency(purchase.amount || 0)}</td>
        <td><span class="badge badge-status ${statusClass}">${status}</span></td>
        <td>
          <div class="d-flex gap-2">
            <button class="btn btn-sm btn-outline-primary edit-purchase" data-purchase-id="${purchase.id || ''}"><i class="fas fa-edit"></i></button>
            <button class="btn btn-sm btn-outline-danger delete-purchase" data-purchase-id="${purchase.id || ''}"><i class="fas fa-trash"></i></button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  tableBody.querySelectorAll('.delete-purchase').forEach((button) => {
    button.addEventListener('click', () => {
      const purchaseId = button.dataset.purchaseId;
      const purchases = getPurchases().filter((purchase) => String(purchase.id) !== String(purchaseId));
      persistPurchases(purchases);
      renderPurchasesTable();
      if (typeof showToast === 'function') {
        showToast('Purchase deleted.', 'success');
      }
    });
  });

  tableBody.querySelectorAll('.edit-purchase').forEach((button) => {
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

      const updatedPurchases = purchases.map((purchase) => {
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

      persistPurchases(updatedPurchases);
      renderPurchasesTable();
      if (typeof showToast === 'function') {
        showToast('Purchase updated.', 'success');
      }
    });
  });
}

function setupPurchasePage() {
  const purchaseProductSelect = document.getElementById('purchase-product-select');
  const purchaseNewProductName = document.getElementById('purchase-new-product-name');
  const purchaseSupplierSelect = document.getElementById('purchase-supplier-select');
  const purchasePackagingSelect = document.getElementById('purchase-packaging-select');
  const qtyInput = document.getElementById('purchase-qty');
  const unitCostInput = document.getElementById('purchase-unit-cost');
  const totalInput = document.getElementById('purchase-total');
  const summarySupplier = document.getElementById('summary-supplier');
  const summaryProduct = document.getElementById('summary-product');
  const summaryQty = document.getElementById('summary-qty');
  const summaryPackage = document.getElementById('summary-package');
  const summaryTotal = document.getElementById('summary-total');
  if (!purchaseProductSelect || !purchaseSupplierSelect) return;

  const suppliers = getSuppliers();
  purchaseSupplierSelect.innerHTML = '<option value="">Select supplier</option>' + suppliers.map((supplier) => {
    const value = supplier.company || supplier.name || 'Supplier';
    return `<option value="${value}">${value}</option>`;
  }).join('');

  const getPurchasedProductName = () => {
    if (purchaseProductSelect.value === '__new__') {
      return (purchaseNewProductName?.value || '').trim();
    }
    return (purchaseProductSelect.value || '').trim();
  };

  const fillProducts = async () => {
    try {
      const resp = await ibmsFetch('/api/products');
      if (!resp.ok) return;
      const products = await resp.json().catch(() => []);
      purchaseProductSelect.innerHTML = '<option value="">Select product</option><option value="__new__">New product (not listed)</option>' + products.map((product) => `
        <option value="${product.name || 'Product'}" data-price="${Number(product.price || 0)}">${product.name || 'Product'} (${product.sku || 'No SKU'})</option>
      `).join('');

      purchaseProductSelect.addEventListener('change', () => {
        const selected = purchaseProductSelect.selectedOptions[0];
        const isCustom = purchaseProductSelect.value === '__new__';
        if (purchaseNewProductName) {
          purchaseNewProductName.disabled = !isCustom;
          if (!isCustom) purchaseNewProductName.value = '';
        }

        const price = Number(selected?.dataset?.price || 0);
        if (!isCustom && unitCostInput) unitCostInput.value = price || 0;
        updatePurchaseSummary();
      });
    } catch (error) {
      console.error('Unable to load purchase products', error);
    }
  };

  purchasePackagingSelect.innerHTML = '<option value="">Select package</option>' + ['5kg', '10kg', '25kg', '50kg', '100kg'].map((size) => `<option value="${size}">${size}</option>`).join('');

  const updatePurchaseSummary = () => {
    const supplier = purchaseSupplierSelect.value || '—';
    const product = getPurchasedProductName() || '—';
    const packageSize = purchasePackagingSelect.value || '—';
    const qty = Number(qtyInput?.value || 0);
    const price = Number(unitCostInput?.value || 0);
    const total = qty * price;

    if (totalInput) totalInput.value = `Tshs ${Number(total).toLocaleString()}`;
    if (summarySupplier) summarySupplier.textContent = supplier;
    if (summaryProduct) summaryProduct.textContent = product;
    if (summaryQty) summaryQty.textContent = String(qty || 0);
    if (summaryPackage) summaryPackage.textContent = packageSize;
    if (summaryTotal) summaryTotal.textContent = `Tshs ${Number(total).toLocaleString()}`;
  };

  [purchaseSupplierSelect, purchaseProductSelect, purchasePackagingSelect, qtyInput, unitCostInput].forEach((element) => {
    if (element) element.addEventListener('input', updatePurchaseSummary);
    if (element) element.addEventListener('change', updatePurchaseSummary);
  });

  const ensureProductExists = async (name) => {
    const trimmed = (name || '').trim();
    if (!trimmed) return null;

    try {
      const lookup = await ibmsFetch(`/api/products?search=${encodeURIComponent(trimmed)}`);
      if (lookup.ok) {
        const products = await lookup.json().catch(() => []);
        if (Array.isArray(products)) {
          const exactMatch = products.find((product) => (product.name || '').toLowerCase() === trimmed.toLowerCase());
          if (exactMatch) return exactMatch;
        }
      }

      const payload = {
        name: trimmed,
        sku: null,
        category_id: null,
        cost: Number(unitCostInput?.value || 0),
        price: Number(unitCostInput?.value || 0),
        stock: 0,
        unit: null,
        packaging: purchasePackagingSelect?.value || null,
      };

      const createResponse = await ibmsFetch('/api/products', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (!createResponse.ok) {
        const errorText = await createResponse.text().catch(() => '');
        throw new Error(errorText || 'Unable to create product');
      }

      const created = await createResponse.json().catch(() => null);
      return created || { name: trimmed };
    } catch (error) {
      console.error('Unable to create missing product while recording purchase', error);
      return { name: trimmed };
    }
  };

  const recordPurchase = async () => {
    const supplier = purchaseSupplierSelect.value || 'Supplier';
    const productName = getPurchasedProductName();
    const qty = Number(qtyInput?.value || 0);
    const unitCost = Number(unitCostInput?.value || 0);
    const amount = unitCost * qty;
    const paymentMethod = document.getElementById('purchase-payment-method')?.value || 'Cash';
    const packageSize = purchasePackagingSelect.value || 'N/A';

    if (!supplier || !productName || qty <= 0 || unitCost <= 0) {
      showToast('Please complete the purchase details before recording.', 'error');
      return;
    }

    try {
      if (purchaseProductSelect.value === '__new__') {
        await ensureProductExists(productName);
      }

      const purchases = getPurchases();
      purchases.unshift({
        id: `PO-${String(Date.now()).slice(-6)}`,
        supplier,
        product: productName,
        qty,
        amount,
        payment_method: paymentMethod,
        status: 'Pending',
        package_size: packageSize,
        created_at: new Date().toISOString(),
      });

      persistPurchases(purchases);
      renderPurchasesTable();
      showToast('Purchase recorded successfully.', 'success');
      updatePurchaseSummary();
    } catch (error) {
      console.error('Failed to record purchase', error);
      showToast('Unable to record purchase.', 'error');
    }
  };

  const recordBtn = document.getElementById('record-purchase-btn');
  const inlineBtn = document.getElementById('record-purchase-inline');
  [recordBtn, inlineBtn].forEach((button) => {
    if (button) button.addEventListener('click', recordPurchase);
  });

  if (purchaseNewProductName) {
    purchaseNewProductName.disabled = true;
    purchaseNewProductName.addEventListener('input', updatePurchaseSummary);
  }

  fillProducts();
  updatePurchaseSummary();
}

function setupExpensesPage() {
  const form = document.getElementById('expense-form');
  const tableBody = document.getElementById('expenses-table-body');
  const amountLabel = document.getElementById('expense-total-label');
  const categoryFilter = document.getElementById('expense-filter-category');
  const monthFilter = document.getElementById('expense-filter-month');
  const filterClear = document.getElementById('expense-filter-clear');
  const submitButton = form?.querySelector('button[type="submit"]');
  if (!form || !tableBody) return;

  let editingExpenseId = null;

  const dateInput = document.getElementById('expense-date');
  if (dateInput && !dateInput.value) {
    dateInput.value = new Date().toISOString().slice(0, 10);
  }

  function getExpenseRequestUrl() {
    const params = new URLSearchParams();
    if (categoryFilter && categoryFilter.value && categoryFilter.value !== 'all') {
      params.set('category', categoryFilter.value);
    }
    if (monthFilter && monthFilter.value) {
      params.set('month', monthFilter.value);
    }
    const suffix = params.toString();
    return suffix ? `/api/expenses?${suffix}` : '/api/expenses';
  }

  async function renderExpenses() {
    try {
      const response = await ibmsFetch(getExpenseRequestUrl());
      if (!response.ok) {
        throw new Error('Unable to load expenses');
      }

      const payload = await response.json().catch(() => ({ expenses: [] }));
      const expenses = Array.isArray(payload.expenses) ? payload.expenses : [];
      const total = expenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0);

      if (amountLabel) {
        amountLabel.textContent = `Tshs ${total.toLocaleString()}`;
      }

      if (!expenses.length) {
        tableBody.innerHTML = '<tr><td colspan="6" class="text-muted text-center py-4">No expenses recorded for the selected filter.</td></tr>';
        return;
      }

      tableBody.innerHTML = expenses.map((expense) => `
        <tr>
          <td>
            <div class="fw-semibold">${(expense.title || 'Expense').replace(/</g, '&lt;')}</div>
            ${expense.notes ? `<small class="text-muted">${(expense.notes || '').replace(/</g, '&lt;')}</small>` : ''}
          </td>
          <td>${(expense.category || 'general').replace(/</g, '&lt;')}</td>
          <td>${expense.date ? new Date(expense.date).toLocaleDateString() : '—'}</td>
          <td>Tshs ${Number(expense.amount || 0).toLocaleString()}</td>
          <td>${(expense.payment_method || 'Cash').replace(/</g, '&lt;')}</td>
          <td>
            <div class="d-flex gap-2">
              <button type="button" class="btn btn-sm btn-outline-primary edit-expense-btn" data-expense-id="${expense.id}"><i class="fas fa-edit me-1"></i>Edit</button>
              <button type="button" class="btn btn-sm btn-outline-danger delete-expense-btn" data-expense-id="${expense.id}"><i class="fas fa-trash me-1"></i>Delete</button>
            </div>
          </td>
        </tr>
      `).join('');

      tableBody.querySelectorAll('.edit-expense-btn').forEach((button) => {
        button.addEventListener('click', () => {
          const id = button.dataset.expenseId;
          const expense = expenses.find((item) => String(item.id) === String(id));
          if (!expense) return;

          editingExpenseId = Number(id);
          document.getElementById('expense-title').value = expense.title || '';
          document.getElementById('expense-category').value = expense.category || 'general';
          document.getElementById('expense-amount').value = Number(expense.amount || 0);
          document.getElementById('expense-date').value = expense.date ? new Date(expense.date).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
          document.getElementById('expense-payment-method').value = expense.payment_method || 'Cash';
          document.getElementById('expense-notes').value = expense.notes || '';
          if (submitButton) {
            submitButton.textContent = 'Update Expense';
          }
          window.scrollTo({ top: 0, behavior: 'smooth' });
        });
      });

      tableBody.querySelectorAll('.delete-expense-btn').forEach((button) => {
        button.addEventListener('click', async () => {
          const id = button.dataset.expenseId;
          if (!id) return;

          const confirmed = window.confirm('Delete this expense record?');
          if (!confirmed) return;

          const resp = await ibmsFetch(`/api/expenses/${id}`, { method: 'DELETE' });
          if (!resp.ok) {
            const payload = await resp.json().catch(() => ({}));
            alert(payload.message || 'Unable to delete expense.');
            return;
          }

          if (editingExpenseId === Number(id)) {
            editingExpenseId = null;
            form.reset();
            if (dateInput) dateInput.value = new Date().toISOString().slice(0, 10);
            if (submitButton) submitButton.textContent = 'Save Expense';
          }

          await renderExpenses();
        });
      });
    } catch (error) {
      console.error('Failed to load expenses', error);
      tableBody.innerHTML = '<tr><td colspan="6" class="text-muted text-center py-4">Unable to load expenses.</td></tr>';
    }
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const payload = {
      title: document.getElementById('expense-title')?.value?.trim(),
      category: document.getElementById('expense-category')?.value || 'general',
      amount: Number(document.getElementById('expense-amount')?.value || 0),
      date: document.getElementById('expense-date')?.value || new Date().toISOString().slice(0, 10),
      payment_method: document.getElementById('expense-payment-method')?.value || 'Cash',
      notes: document.getElementById('expense-notes')?.value?.trim() || null,
    };

    if (!payload.title || payload.amount <= 0) {
      alert('Please provide a title and a valid amount for the expense.');
      return;
    }

    try {
      const isEditing = Boolean(editingExpenseId);
      const url = isEditing ? `/api/expenses/${editingExpenseId}` : '/api/expenses';
      const method = isEditing ? 'PUT' : 'POST';
      const response = await ibmsFetch(url, {
        method,
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => ({}));
        const firstError = Object.values(errorPayload.errors || {})[0];
        throw new Error(firstError ? firstError[0] : 'Unable to save expense.');
      }

      form.reset();
      const successMessage = isEditing ? 'Expense updated successfully.' : 'Expense saved successfully.';
      editingExpenseId = null;
      if (submitButton) submitButton.textContent = 'Save Expense';
      if (dateInput) dateInput.value = new Date().toISOString().slice(0, 10);
      if (typeof showToast === 'function') showToast(successMessage, 'success');
      await renderExpenses();
    } catch (error) {
      alert(error.message || 'Unable to save expense.');
    }
  });

  if (categoryFilter) {
    categoryFilter.addEventListener('change', renderExpenses);
  }
  if (monthFilter) {
    monthFilter.addEventListener('change', renderExpenses);
  }
  if (filterClear) {
    filterClear.addEventListener('click', () => {
      if (categoryFilter) categoryFilter.value = 'all';
      if (monthFilter) monthFilter.value = '';
      renderExpenses();
    });
  }

  renderExpenses();
}

function setupExpenseReportFilters() {
  const categorySelect = document.getElementById('report-expense-category');
  const monthInput = document.getElementById('report-expense-month');
  const summaryBox = document.getElementById('expense-report-summary');
  if (!categorySelect || !monthInput || !summaryBox) return;

  async function refreshExpenseSummary() {
    try {
      const params = new URLSearchParams();
      if (categorySelect.value && categorySelect.value !== 'all') {
        params.set('category', categorySelect.value);
      }
      if (monthInput.value) {
        params.set('month', monthInput.value);
      }

      const response = await ibmsFetch(`/api/expenses${params.toString() ? `?${params.toString()}` : ''}`);
      if (!response.ok) {
        throw new Error('Unable to load expense report');
      }

      const payload = await response.json().catch(() => ({ expenses: [] }));
      const expenses = Array.isArray(payload.expenses) ? payload.expenses : [];
      const total = expenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
      const count = expenses.length;
      const label = categorySelect.value && categorySelect.value !== 'all' ? categorySelect.options[categorySelect.selectedIndex]?.text || 'Selected' : 'All categories';
      const period = monthInput.value ? ` for ${new Date(`${monthInput.value}-01`).toLocaleString('default', { month: 'long', year: 'numeric' })}` : ' for this period';
      summaryBox.innerHTML = `<strong>Tshs ${total.toLocaleString()}</strong> across ${count} expense ${count === 1 ? 'record' : 'records'}<br><span class="text-muted">${label}${period}</span>`;
    } catch (error) {
      console.error('Failed to load expense report summary', error);
      summaryBox.textContent = 'Unable to load the expense report.';
    }
  }

  categorySelect.addEventListener('change', refreshExpenseSummary);
  monthInput.addEventListener('change', refreshExpenseSummary);
  refreshExpenseSummary();
}

function getSystemSettings() {
  try {
    const raw = localStorage.getItem('ibms-system-settings');
    if (!raw) {
      return {
        companyName: 'Green Harvest Enterprises',
        companyEmail: 'ops@greenharvest.co.ke',
        companyAddress: 'Nairobi, Kenya',
        language: 'en',
        receiptMode: 'auto-print',
        backupMode: 'daily',
      };
    }
    return { ...{
      companyName: 'Green Harvest Enterprises',
      companyEmail: 'ops@greenharvest.co.ke',
      companyAddress: 'Nairobi, Kenya',
      language: 'en',
      receiptMode: 'auto-print',
      backupMode: 'daily',
    }, ...JSON.parse(raw) };
  } catch (error) {
    return {
      companyName: 'Green Harvest Enterprises',
      companyEmail: 'ops@greenharvest.co.ke',
      companyAddress: 'Nairobi, Kenya',
      language: 'en',
      receiptMode: 'auto-print',
      backupMode: 'daily',
    };
  }
}

function saveSystemSettings(settings) {
  localStorage.setItem('ibms-system-settings', JSON.stringify(settings));
}

function applySystemSettingsToUI(settings = getSystemSettings()) {
  const brandName = document.querySelector('.brand h4');
  if (brandName) {
    brandName.textContent = settings.companyName || 'HOROMA RICE MILL MANAGEMENT SYSTEM';
  }

  const brandLogo = document.querySelector('.brand img');
  const savedLogo = localStorage.getItem('ibms-brand-logo');
  if (brandLogo && savedLogo) {
    brandLogo.src = savedLogo;
  }

  const companyNameInput = document.getElementById('settings-company-name');
  const companyEmailInput = document.getElementById('settings-company-email');
  const companyAddressInput = document.getElementById('settings-company-address');
  const languageInput = document.getElementById('settings-language');
  const receiptInput = document.getElementById('settings-receipt');
  const backupInput = document.getElementById('settings-backup');

  if (companyNameInput) companyNameInput.value = settings.companyName || '';
  if (companyEmailInput) companyEmailInput.value = settings.companyEmail || '';
  if (companyAddressInput) companyAddressInput.value = settings.companyAddress || '';
  if (languageInput) languageInput.value = settings.language || 'en';
  if (receiptInput) receiptInput.value = settings.receiptMode || 'auto-print';
  if (backupInput) backupInput.value = settings.backupMode || 'daily';

  if (typeof setLanguage === 'function') {
    const locale = settings.language || localStorage.getItem('ibms-language') || 'en';
    setLanguage(locale);
  }
}

function setupSettingsPage() {
  const saveButton = document.getElementById('settings-save-button');
  const companyNameInput = document.getElementById('settings-company-name');
  const companyEmailInput = document.getElementById('settings-company-email');
  const companyAddressInput = document.getElementById('settings-company-address');
  const languageInput = document.getElementById('settings-language');
  const receiptInput = document.getElementById('settings-receipt');
  const backupInput = document.getElementById('settings-backup');
  const logoInput = document.getElementById('settings-company-logo');

  if (!saveButton) return;

  applySystemSettingsToUI();

  const persistSettings = () => {
    const settings = {
      companyName: companyNameInput?.value?.trim() || 'HOROMA RICE MILL MANAGEMENT SYSTEM',
      companyEmail: companyEmailInput?.value?.trim() || '',
      companyAddress: companyAddressInput?.value?.trim() || '',
      language: languageInput?.value || localStorage.getItem('ibms-language') || 'en',
      receiptMode: receiptInput?.value || 'auto-print',
      backupMode: backupInput?.value || 'daily',
    };

    saveSystemSettings(settings);
    applySystemSettingsToUI(settings);
    if (typeof setLanguage === 'function') {
      setLanguage(settings.language);
    }
    if (typeof showToast === 'function') {
      showToast('System settings saved successfully.', 'success');
    }
  };

  saveButton.addEventListener('click', persistSettings);

  if (languageInput) {
    languageInput.addEventListener('change', () => {
      const nextLanguage = languageInput.value || 'en';
      localStorage.setItem('ibms-language', nextLanguage);
      if (typeof setLanguage === 'function') {
        setLanguage(nextLanguage);
      }
    });
  }

  if (logoInput) {
    logoInput.addEventListener('change', (event) => {
      const file = event.target.files && event.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = String(reader.result || '');
        localStorage.setItem('ibms-brand-logo', dataUrl);
        const brandLogo = document.querySelector('.brand img');
        if (brandLogo) {
          brandLogo.src = dataUrl;
        }
      };
      reader.readAsDataURL(file);
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  ensureLogoutControls();
  bindRouteButtons();

  const path = window.location.pathname.split('/').pop() || 'index.html';
  const currentPage = path.replace('.html', '');

  document.querySelectorAll('.sidebar .nav-link').forEach((link) => {
    const href = link.getAttribute('href') || '';
    if (href.includes(currentPage)) {
      link.classList.add('active');
    }
  });

  // Add sidebar toggler button for responsive behavior (desktop collapse / mobile overlay)
  const topbar = document.querySelector('.topbar');
  if (topbar && !document.querySelector('.sidebar-toggle')) {
    const btn = document.createElement('button');
    btn.className = 'sidebar-toggle';
    btn.title = 'Toggle sidebar';
    btn.setAttribute('aria-label', 'Toggle sidebar');
    btn.innerHTML = '<i class="fas fa-bars" aria-hidden="true"></i>';

    function closeMobileSidebar() {
      const sb = document.querySelector('.sidebar');
      sb?.classList.remove('open');
      document.body.classList.remove('has-sidebar-open');
      const ov = document.querySelector('.sidebar-overlay');
      if (ov) ov.remove();
    }

    btn.addEventListener('click', () => {
      const sb = document.querySelector('.sidebar');
      if (!sb) return;
      if (window.innerWidth < 992) {
        // mobile behavior: slide in overlay
        const isOpen = sb.classList.toggle('open');
        if (isOpen) {
          document.body.classList.add('has-sidebar-open');
          const overlay = document.createElement('div');
          overlay.className = 'sidebar-overlay';
          overlay.addEventListener('click', closeMobileSidebar);
          document.body.appendChild(overlay);
        } else {
          closeMobileSidebar();
        }
      } else {
        // desktop: toggle collapsed state
        document.body.classList.toggle('sidebar-collapsed');
      }
    });

    topbar.prepend(btn);
  }

  document.querySelectorAll('[data-date]').forEach((el) => {
    el.textContent = new Date().toLocaleDateString();
  });

  bindProductCategoryFilters();
  initInteractiveActions(currentPage);

  if (currentPage === 'suppliers') {
    renderSuppliersTable();
  }

  if (currentPage === 'customers') {
    renderCustomersTable();
  }

  if (currentPage === 'dashboard') {
    hydrateDashboardStats();
    if (!window.__dashboardRefreshHandle) {
      window.__dashboardRefreshHandle = setInterval(() => {
        if (document.visibilityState !== 'hidden') {
          hydrateDashboardStats();
        }
      }, 30000);
    }
  }

  if (currentPage === 'purchases') {
    renderPurchasesTable();
    setupPurchasePage();
  }

  if (currentPage === 'expenses') {
    setupExpensesPage();
  }

  if (currentPage === 'reports') {
    setupExpenseReportFilters();
    setupReportsPage();
  }

  if (currentPage === 'settings') {
    setupSettingsPage();
  }

  if (currentPage === 'inventory') {
    renderInventorySummary();
    renderInventoryProducts();
  }

  // If on products page, attempt to load product list from API and render cards
  if (currentPage === 'products') {
    (async function loadProducts() {
      try {
        const resp = await ibmsFetch('/api/products');
        if (!resp.ok) return;
        const products = await resp.json().catch(() => []);
        const container = document.getElementById('product-list-row');
        if (!container) return;

        if (!Array.isArray(products) || products.length === 0) {
          bindProductCategoryFilters();
          initInteractiveActions(currentPage);
          return;
        }

        // clear existing sample cards
        container.innerHTML = '';
        products.forEach(p => {
          const productCategory = getProductCategoryKey(p.category?.slug || p.category?.name || p.category_id || '', p.name || '');
          const measurementUnit = getProductMeasurementUnit(p.name || '', p.category?.slug || p.category?.name || p.category_id || '');
          const col = document.createElement('div');
          col.className = 'col-lg-6 product-card-wrapper';
          col.setAttribute('data-category', productCategory);
          col.setAttribute('data-product-id', p.id || p.sku || p.name);
          col.setAttribute('data-name', p.name || '');
          col.setAttribute('data-stock', String(p.stock ?? 0));
          col.setAttribute('data-cost', String(p.cost ?? 0));
          col.setAttribute('data-price', String(p.price ?? 0));
          col.setAttribute('data-unit', p.unit || measurementUnit);
          col.setAttribute('data-packaging', p.packaging || '');
          col.innerHTML = `
            <div class="product-card">
              <div class="product-card-top">
                <div>
                  <span class="product-category">${getProductCategoryLabel(productCategory)}</span>
                  <h5 class="mb-0">${p.name}</h5>
                </div>
                <span class="badge badge-status ${p.stock > 100 ? 'badge-stock-high' : p.stock > 20 ? 'badge-stock-medium' : 'badge-stock-low'}">${p.stock} ${measurementUnit}</span>
              </div>
              <p class="text-muted mb-3">${p.description || ''}</p>
              <div class="product-meta">
                <div><small>Stock</small><strong>${p.stock} ${measurementUnit}</strong></div>
                <div><small>Buying</small><strong>Tshs ${p.cost}</strong></div>
                <div><small>Selling</small><strong>Tshs ${p.price}</strong></div>
              </div>
              <div class="product-footer">
                <div class="stock-meter"><span style="width: ${Math.min(100, (p.stock/200)*100)}%"></span></div>
                <div class="d-flex gap-2">
                  <button class="btn btn-sm btn-outline-success" data-action="receive-packages" data-form-type="products" data-product-id="${p.id||p.sku}">Receive Packages</button>
                  <button class="btn btn-sm btn-outline-primary" data-action="edit" data-form-type="products" data-product-id="${p.id||p.sku}">Edit</button>
                  <button class="btn btn-sm btn-outline-danger" data-action="delete" data-form-type="products" data-product-id="${p.id||p.sku}">Delete</button>
                </div>
              </div>
            </div>
          `;
          container.appendChild(col);
        });
        // re-init actions so newly injected buttons have handlers
        bindProductCategoryFilters();
        initInteractiveActions(currentPage);
      } catch (e) {
        console.error('Failed loading products', e);
      }
    })();
  }
});

function formatCurrencyValue(value) {
  const number = Number(value || 0);
  if (!Number.isFinite(number)) return 'Tshs 0';
  return `Tshs ${number.toLocaleString()}`;
}

function hydrateDashboardStats() {
  const setText = (id, value) => {
    const node = document.getElementById(id);
    if (node) node.textContent = value;
  };

  const setMeta = (id, value) => {
    const node = document.getElementById(id);
    if (node) node.textContent = value;
  };

  (async function loadDashboardStats() {
    try {
      const [productsResponse, salesResponse, employeesResponse, expensesResponse] = await Promise.all([
        ibmsFetch('/api/products').catch(() => null),
        ibmsFetch('/api/sales').catch(() => null),
        ibmsFetch('/api/employees').catch(() => null),
        ibmsFetch('/api/expenses').catch(() => null),
      ]);

      const products = productsResponse && productsResponse.ok ? await productsResponse.json().catch(() => []) : [];
      const salesPayload = salesResponse && salesResponse.ok ? await salesResponse.json().catch(() => ({ sales: [] })) : { sales: [] };
      const employees = employeesResponse && employeesResponse.ok ? await employeesResponse.json().catch(() => []) : [];
      const expensesPayload = expensesResponse && expensesResponse.ok ? await expensesResponse.json().catch(() => ({ expenses: [] })) : { expenses: [] };

      const productList = Array.isArray(products) ? products : [];
      const salesList = Array.isArray(salesPayload.sales) ? salesPayload.sales : [];
      const employeeList = Array.isArray(employees) ? employees : [];
      const expenseList = Array.isArray(expensesPayload.expenses) ? expensesPayload.expenses : [];

      const totalStock = productList.reduce((sum, product) => sum + Number(product.stock || 0), 0);
      const totalRevenue = salesList.reduce((sum, sale) => sum + Number(sale.total_amount || 0), 0);
      const monthlyRevenue = salesList.filter((sale) => {
        const created = sale.created_at ? new Date(sale.created_at) : null;
        if (!created || Number.isNaN(created.getTime())) return false;
        const now = new Date();
        return created.getFullYear() === now.getFullYear() && created.getMonth() === now.getMonth();
      }).reduce((sum, sale) => sum + Number(sale.total_amount || 0), 0);

      const today = new Date();
      const todaysSales = salesList.filter((sale) => {
        const created = sale.created_at ? new Date(sale.created_at) : null;
        if (!created || Number.isNaN(created.getTime())) return false;
        return created.toDateString() === today.toDateString();
      }).reduce((sum, sale) => sum + Number(sale.total_amount || 0), 0);

      const purchases = getPurchases();
      const expensesFromPurchases = purchases.reduce((sum, purchase) => sum + Number(purchase.amount || 0), 0);
      const expenses = expenseList.length ? expenseList.reduce((sum, expense) => sum + Number(expense.amount || 0), 0) : expensesFromPurchases;
      const profit = monthlyRevenue - expenses;

      setText('stat-todays-sales', formatCurrencyValue(todaysSales));
      setMeta('stat-todays-sales-meta', salesList.filter((sale) => {
        const created = sale.created_at ? new Date(sale.created_at) : null;
        if (!created || Number.isNaN(created.getTime())) return false;
        return created.toDateString() === today.toDateString();
      }).length ? `${salesList.filter((sale) => {
        const created = sale.created_at ? new Date(sale.created_at) : null;
        if (!created || Number.isNaN(created.getTime())) return false;
        return created.toDateString() === today.toDateString();
      }).length} entries today` : 'No sales recorded today');

      setText('stat-monthly-revenue', formatCurrencyValue(monthlyRevenue));
      setMeta('stat-monthly-revenue-meta', `${salesList.length} sales entries tracked`);

      setText('stat-expenses', formatCurrencyValue(expenses));
      setMeta('stat-expenses-meta', expenseList.length ? `${expenseList.length} expense records` : `${purchases.length} purchase records`);

      setText('stat-profit', formatCurrencyValue(profit));
      setMeta('stat-profit-meta', profit >= 0 ? 'Positive operating margin' : 'Review margins');

      setText('stat-stock', `${totalStock.toLocaleString()} units`);
      setMeta('stat-stock-meta', productList.length ? `${productList.length} active products` : 'No products available');

      setText('stat-employees', `${employeeList.length} Staff`);
      setMeta('stat-employees-meta', employeeList.length ? 'Live employee roster' : 'No employee records loaded');
    } catch (error) {
      console.error('Failed to load dashboard stats', error);
      setText('stat-todays-sales', 'Tshs 0');
      setText('stat-monthly-revenue', 'Tshs 0');
      setText('stat-expenses', 'Tshs 0');
      setText('stat-profit', 'Tshs 0');
      setText('stat-stock', '0 units');
      setText('stat-employees', '0 Staff');
      setMeta('stat-todays-sales-meta', 'Unable to load live sales');
      setMeta('stat-monthly-revenue-meta', 'Unable to load live revenue');
      setMeta('stat-expenses-meta', 'Unable to load live expenses');
      setMeta('stat-profit-meta', 'Unable to load live margin');
      setMeta('stat-stock-meta', 'Unable to load live stock');
      setMeta('stat-employees-meta', 'Unable to load live staff');
    }
  })();
}

function renderInventorySummary() {
  const list = document.getElementById('stock-movement-list');
  const alerts = document.getElementById('reorder-alerts');
  if (!list && !alerts) return;

  (async function loadInventorySummary() {
    try {
      const resp = await ibmsFetch('/api/products');
      if (!resp.ok) {
        if (list) list.innerHTML = '<li class="list-group-item d-flex justify-content-between"><span>Inventory</span><strong>Unavailable</strong></li>';
        if (alerts) alerts.innerHTML = '<p class="mb-0 text-muted"><i class="fas fa-exclamation-triangle me-2"></i>Stock data unavailable.</p>';
        return;
      }

      const products = await resp.json().catch(() => []);
      const data = Array.isArray(products) && products.length ? products : [
        { name: 'Rice Grade A', stock: 380, category: { name: 'Agriculture' }, price: 290, cost: 240 },
        { name: 'Cement Bags', stock: 120, category: { name: 'Construction' }, price: 9500, cost: 8200 },
        { name: 'Fertilizer Blend', stock: 60, category: { name: 'Inputs' }, price: 12000, cost: 9700 }
      ];

      const totalUnits = data.reduce((sum, product) => sum + Number(product.stock ?? 0), 0);
      const lowStock = data.filter((product) => Number(product.stock ?? 0) <= 20).length;
      const healthy = data.filter((product) => Number(product.stock ?? 0) > 100).length;
      const topProduct = data.reduce((winner, current) => {
        const currentStock = Number(current.stock ?? 0);
        return currentStock > Number(winner.stock ?? 0) ? current : winner;
      }, data[0] || { name: 'No products', stock: 0 });

      if (list) {
        list.innerHTML = `
          <li class="list-group-item d-flex justify-content-between"><span>Total available stock</span><strong>${totalUnits} units</strong></li>
          <li class="list-group-item d-flex justify-content-between"><span>Low stock products</span><strong>${lowStock}</strong></li>
          <li class="list-group-item d-flex justify-content-between"><span>Healthy stock items</span><strong>${healthy}</strong></li>
          <li class="list-group-item d-flex justify-content-between"><span>Top stock item</span><strong>${topProduct.name || 'N/A'}</strong></li>
        `;
      }

      const reorderItems = data.filter((product) => Number(product.stock ?? 0) <= 30);
      if (alerts) {
        if (!reorderItems.length) {
          alerts.innerHTML = '<p class="mb-0 text-success"><i class="fas fa-check-circle me-2"></i>No urgent replenishment needed.</p>';
          return;
        }

        alerts.innerHTML = `
          <div class="d-flex flex-column gap-2">
            ${reorderItems.map((product) => `
              <div class="d-flex justify-content-between align-items-center border rounded px-3 py-2">
                <span><i class="fas fa-exclamation-triangle me-2 text-warning"></i>${product.name || 'Product'}</span>
                <strong>${Number(product.stock ?? 0)} units</strong>
              </div>
            `).join('')}
            <button class="btn btn-secondary-custom mt-2">View Orders</button>
          </div>
        `;
      }
    } catch (error) {
      console.error('Failed loading inventory summary', error);
      if (list) list.innerHTML = '<li class="list-group-item d-flex justify-content-between"><span>Inventory</span><strong>Unavailable</strong></li>';
      if (alerts) alerts.innerHTML = '<p class="mb-0 text-muted"><i class="fas fa-exclamation-triangle me-2"></i>Unable to load reorder alerts.</p>';
    }
  })();
}

function renderInventoryProducts() {
  const container = document.getElementById('inventory-stock-grid');
  if (!container) return;

  (async function loadInventoryProducts() {
    try {
      const resp = await ibmsFetch('/api/products');
      if (!resp.ok) {
        container.innerHTML = '<div class="col-12"><div class="panel-card text-muted">Unable to load stock data right now.</div></div>';
        return;
      }

      const products = await resp.json().catch(() => []);
      const list = Array.isArray(products) && products.length ? products : [
        { name: 'Rice Grade A', stock: 380, category: { name: 'Agriculture' }, price: 290, cost: 240 },
        { name: 'Cement Bags', stock: 120, category: { name: 'Construction' }, price: 9500, cost: 8200 },
        { name: 'Fertilizer Blend', stock: 60, category: { name: 'Inputs' }, price: 12000, cost: 9700 }
      ];

      container.innerHTML = list.map((product) => {
        const productName = product.name || 'Product';
        const stock = Number(product.stock ?? 0);
        const category = product.category?.name || product.category || getProductCategoryLabel(getProductCategoryKey(product.category?.slug || product.category || '', productName));
        const statusClass = stock > 100 ? 'badge-stock-high' : stock > 20 ? 'badge-stock-medium' : 'badge-stock-low';
        const statusText = stock > 100 ? 'Healthy' : stock > 20 ? 'Moderate' : 'Low';

        return `
          <div class="col-lg-4 col-md-6">
            <div class="product-card h-100">
              <div class="product-card-top">
                <div>
                  <span class="product-category">${category}</span>
                  <h5 class="mb-0">${productName}</h5>
                </div>
                <span class="badge badge-status ${statusClass}">${statusText}</span>
              </div>
              <div class="product-meta mt-3">
                <div><small>Stock</small><strong>${stock} units</strong></div>
                <div><small>Buying</small><strong>Tshs ${Number(product.cost || 0).toLocaleString()}</strong></div>
                <div><small>Selling</small><strong>Tshs ${Number(product.price || 0).toLocaleString()}</strong></div>
              </div>
              <div class="product-footer mt-3">
                <div class="stock-meter"><span style="width: ${Math.min(100, (stock / Math.max(200, stock || 1)) * 100)}%"></span></div>
                <div class="text-muted small mt-2">Available stock: ${stock} units</div>
              </div>
            </div>
          </div>
        `;
      }).join('');
    } catch (error) {
      console.error('Failed loading inventory products', error);
      container.innerHTML = '<div class="col-12"><div class="panel-card text-muted">The stock list could not be loaded.</div></div>';
    }
  })();
}

function bindProductCategoryFilters() {
  const buttons = document.querySelectorAll('.category-pill');
  const cards = document.querySelectorAll('.product-card-wrapper');

  if (!buttons.length || !cards.length) {
    return;
  }

  const applyFilter = (selectedCategory) => {
    cards.forEach((card) => {
      const category = getProductCategoryKey(card.getAttribute('data-category') || '', card.querySelector('h5')?.textContent || '');
      const isMatch = selectedCategory === 'all' || category === selectedCategory.toLowerCase();
      card.style.display = isMatch ? '' : 'none';
    });
  };

  buttons.forEach((button) => {
    button.onclick = () => {
      buttons.forEach((item) => item.classList.toggle('active', item === button));
      applyFilter(button.getAttribute('data-category') || 'all');
    };
  });

  const activeButton = document.querySelector('.category-pill.active');
  applyFilter(activeButton ? (activeButton.getAttribute('data-category') || 'all') : 'all');
}

function initInteractiveActions(currentPage) {
  if (currentPage === 'sales') {
    (async function loadSalesProducts(){
      try {
        const resp = await ibmsFetch('/api/products');
        if (!resp.ok) return;
        const products = await resp.json().catch(() => []);
        const prodSelect = document.getElementById('sales-product-select');
        const packSelect = document.getElementById('sales-packaging-select');
        if (!prodSelect) return;
        prodSelect.innerHTML = '<option value="">Select product</option>';
        products.forEach(p => {
          const opt = document.createElement('option');
          const categoryKey = getProductCategoryKey(p.category?.slug || p.category?.name || p.category_id || '', p.name || '');
          opt.value = p.id || p.sku || p.name;
          opt.textContent = p.name + (p.sku ? ' ('+p.sku+')' : '');
          opt.dataset.category = categoryKey;
          opt.dataset.packaging = JSON.stringify(p.packaging_counts || {});
          opt.dataset.price = p.price || 0;
          prodSelect.appendChild(opt);
        });

        const populatePackagingOptions = () => {
          const selected = prodSelect.options[prodSelect.selectedIndex];
          const counts = selected ? JSON.parse(selected.dataset.packaging || '{}') : {};
          const categoryKey = getProductCategoryKey(selected?.dataset?.category || '', selected?.textContent || '');
          const unitLabel = categoryKey === 'construction' ? 'pieces' : 'kg';
          const defaultSizes = categoryKey === 'construction' ? [1, 5, 10, 25, 50, 100] : [5, 10, 25, 50, 100];

          packSelect.innerHTML = '<option value="">Select package</option>';
          const sizes = Object.keys(counts).map(k => Number(k)).sort((a,b)=>a-b);
          if (sizes.length === 0) {
            defaultSizes.forEach(s => {
              const o = document.createElement('option');
              o.value = s;
              o.textContent = s + ' ' + unitLabel;
              packSelect.appendChild(o);
            });
          } else {
            sizes.forEach(s => {
              const o = document.createElement('option');
              o.value = s;
              o.textContent = s + ' ' + unitLabel + ' (' + (counts[s] || 0) + ' units)';
              packSelect.appendChild(o);
            });
          }
          if (packSelect.options.length > 1) packSelect.selectedIndex = 1;
        };

        prodSelect.addEventListener('change', populatePackagingOptions);
        prodSelect.addEventListener('change', function(){
          const selected = prodSelect.options[prodSelect.selectedIndex];
          try {
            const priceVal = Number(selected?.dataset?.price || 0);
            const priceInput = document.querySelector('.panel-card input[type="text"]');
            if (priceInput) priceInput.value = priceVal ? ('Tshs ' + priceVal) : '';
          } catch (e) {}
        });

        populatePackagingOptions();
      } catch(e){ console.error('Failed loading sales products', e); }
    })();
  }

  const modalId = 'ibms-action-modal';
  const existingModal = document.getElementById(modalId);
  if (existingModal) {
    existingModal.remove();
  }

  document.body.insertAdjacentHTML(
    'beforeend',
    `
      <div class="modal fade" id="${modalId}" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered modal-lg">
          <div class="modal-content">
            <div class="modal-header">
              <div>
                <h5 class="modal-title fw-bold" id="ibms-action-title">Action</h5>
                <p class="text-muted mb-0" id="ibms-action-subtitle">Complete the form to save the entry.</p>
              </div>
              <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <form id="ibms-action-form">
              <div class="modal-body" id="ibms-action-body"></div>
              <div class="modal-footer">
                <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Cancel</button>
                <button type="submit" class="btn btn-primary-custom">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    `
  );

  const modal = new bootstrap.Modal(document.getElementById(modalId));
  const form = document.getElementById('ibms-action-form');
  const titleEl = document.getElementById('ibms-action-title');
  const subtitleEl = document.getElementById('ibms-action-subtitle');
  const bodyEl = document.getElementById('ibms-action-body');

  document.querySelectorAll('[data-action], .product-card .btn-outline-primary').forEach((button) => {
    button.addEventListener('click', async (event) => {
      event.preventDefault();
      const action = button.getAttribute('data-action') || 'add';
      const formType = button.getAttribute('data-form-type') || currentPage;
      const productId = button.getAttribute('data-product-id') || button.closest('.product-card-wrapper')?.getAttribute('data-product-id') || '';
      const supplierId = button.getAttribute('data-supplier-id') || button.closest('[data-supplier-id]')?.getAttribute('data-supplier-id') || '';

      if (formType === 'products' && action === 'delete') {
        if (!productId) {
          showToast('Missing product identifier.', 'error');
          return;
        }

        const productName = button.closest('.product-card-wrapper')?.getAttribute('data-name') || 'this product';
        const shouldDelete = window.confirm(`Delete ${productName} from the product list?`);
        if (!shouldDelete) return;

        try {
          const resp = await ibmsFetch(`/api/products/${productId}`, { method: 'DELETE' });
          if (!resp.ok) {
            const payload = await resp.json().catch(() => ({}));
            throw new Error(payload.message || 'Unable to delete product.');
          }

          const wrapper = button.closest('.product-card-wrapper');
          if (wrapper) {
            wrapper.remove();
          }
          showToast('Product deleted successfully.', 'success');
        } catch (error) {
          showToast(error.message || 'Unable to delete product.', 'error');
        }
        return;
      }

      if (formType === 'suppliers' && action === 'delete') {
        if (!supplierId) {
          showToast('Missing supplier identifier.', 'error');
          return;
        }

        const supplier = getSuppliers().find((entry) => String(entry.id || entry.company) === String(supplierId));
        const supplierName = supplier?.company || 'this supplier';
        const shouldDelete = window.confirm(`Delete ${supplierName} from the supplier list?`);
        if (!shouldDelete) return;

        try {
          const suppliers = getSuppliers().filter((entry) => String(entry.id || entry.company) !== String(supplierId));
          persistSuppliers(suppliers);
          renderSuppliersTable();
          showToast('Supplier deleted successfully.', 'success');
        } catch (error) {
          showToast(error.message || 'Unable to delete supplier.', 'error');
        }
        return;
      }

      if (formType === 'customers' && action === 'delete') {
        const customerId = button.getAttribute('data-customer-id') || '';
        if (!customerId) {
          showToast('Missing customer identifier.', 'error');
          return;
        }

        const customer = getCustomers().find((entry) => String(entry.id || entry.name) === String(customerId));
        const customerName = customer?.name || 'this customer';
        const shouldDelete = window.confirm(`Delete ${customerName} from the customer list?`);
        if (!shouldDelete) return;

        try {
          const customers = getCustomers().filter((entry) => String(entry.id || entry.name) !== String(customerId));
          persistCustomers(customers);
          renderCustomersTable();
          showToast('Customer deleted successfully.', 'success');
        } catch (error) {
          showToast(error.message || 'Unable to delete customer.', 'error');
        }
        return;
      }

      const config = getActionConfig(formType, action);

      titleEl.textContent = config.title;
      subtitleEl.textContent = config.subtitle;
      bodyEl.innerHTML = config.body;
      form.setAttribute('data-form-type', formType);
      form.setAttribute('data-action', action);
      if (productId) form.setAttribute('data-product-id', productId);
      if (supplierId) form.setAttribute('data-supplier-id', supplierId);
      form.setAttribute('data-action', action);
      form.setAttribute('data-form-type', formType);

      if (formType === 'products' && action === 'edit') {
        const card = button.closest('.product-card-wrapper');
        if (card) {
          const fieldNames = ['name', 'stock', 'cost', 'price', 'unit', 'category'];
          const values = {
            name: card.getAttribute('data-name') || card.querySelector('h5')?.textContent || '',
            stock: card.getAttribute('data-stock') || '0',
            cost: card.getAttribute('data-cost') || '0',
            price: card.getAttribute('data-price') || '0',
            unit: card.getAttribute('data-unit') || '',
            category: card.getAttribute('data-category') || ''
          };

          fieldNames.forEach((field) => {
            const target = bodyEl.querySelector(`[name="${field}"]`);
            if (target) {
              if (field === 'category') {
                target.value = values.category || '';
              } else {
                target.value = values[field] ?? '';
              }
            }
          });
        }
      }

      if (formType === 'suppliers' && action === 'edit') {
        const supplier = getSuppliers().find((entry) => String(entry.id || entry.company) === String(supplierId));
        if (supplier) {
          const fields = {
            company: supplier.company || '',
            contact: supplier.contact || '',
            category: supplier.category || '',
            lead_time: supplier.lead_time || '',
            status: supplier.status || 'Reliable',
          };

          Object.entries(fields).forEach(([name, value]) => {
            const target = bodyEl.querySelector(`[name="${name}"]`);
            if (target) target.value = value;
          });
        }
      }

      if (formType === 'customers' && action === 'edit') {
        const customerId = button.getAttribute('data-customer-id') || '';
        const customer = getCustomers().find((entry) => String(entry.id || entry.name) === String(customerId));
        if (customer) {
          const fields = {
            name: customer.name || '',
            phone: customer.phone || '',
            region: customer.region || '',
            balance: customer.balance || 0,
            status: customer.status || 'Active',
          };

          Object.entries(fields).forEach(([name, value]) => {
            const target = bodyEl.querySelector(`[name="${name}"]`);
            if (target) target.value = value;
          });
        }
      }

      modal.show();
    });
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const formType = form.getAttribute('data-form-type') || '';
    const formAction = form.getAttribute('data-action') || '';

    if (formType === 'products' && formAction === 'receive-packages') {
      const productId = form.getAttribute('data-product-id') || '';
      if (!productId) {
        showToast('Missing product identifier.', 'error');
        return;
      }

      const inputs = Array.from(bodyEl.querySelectorAll('input[data-size]'));
      const packages = inputs.map(i => ({ size: Number(i.getAttribute('data-size')), count: Math.max(0, parseInt(i.value || '0', 10) || 0) }));
      const payload = { packages: packages.filter(p => p.count > 0) };

      if (payload.packages.length === 0) {
        showToast('No packages entered.', 'error');
        return;
      }

      try {
        // resolve product id: try direct GET, otherwise search by sku/name
        let resolvedId = productId;
        try {
          const probe = await ibmsFetch(`/api/products/${productId}`);
          if (!probe.ok) {
            // try search
            const list = await ibmsFetch(`/api/products?search=${encodeURIComponent(productId)}`);
            if (list.ok) {
              const arr = await list.json().catch(() => []);
              if (Array.isArray(arr) && arr.length) resolvedId = arr[0].id || resolvedId;
              else throw new Error('Product not found');
            } else {
              throw new Error('Product lookup failed');
            }
          }
        } catch (e) {
          // fallback: attempt search
          const list = await ibmsFetch(`/api/products?search=${encodeURIComponent(productId)}`);
          if (list.ok) {
            const arr = await list.json().catch(() => []);
            if (Array.isArray(arr) && arr.length) resolvedId = arr[0].id || resolvedId;
            else throw new Error('Product not found');
          } else {
            throw new Error('Product lookup failed');
          }
        }

        const resp = await ibmsFetch(`/api/products/${resolvedId}/receive-packages`, { method: 'POST', body: JSON.stringify(payload) });
        if (!resp.ok) {
          const txt = await resp.text();
          throw new Error(txt || resp.statusText || 'Failed to record packages');
        }
        await resp.json().catch(() => null);
        modal.hide();
        showToast('Packages recorded successfully.', 'success');
        setTimeout(() => location.reload(), 400);
      } catch (err) {
        showToast(err.message || 'Failed to record packages', 'error');
      }

      return;
    }

    if (formType === 'products') {
      const isEdit = formAction === 'edit';
      const name = (bodyEl.querySelector('input[name="name"]')?.value || '').trim();
      const stock = Number(bodyEl.querySelector('input[name="stock"]')?.value || 0);
      const unit = (bodyEl.querySelector('input[name="unit"]')?.value || '').trim() || null;
      const cost = parseFloat((bodyEl.querySelector('input[name="cost"]')?.value || 0) || 0);
      const price = parseFloat((bodyEl.querySelector('input[name="price"]')?.value || 0) || 0);
      const packagingSelect = bodyEl.querySelector('select[name="packaging"]') || bodyEl.querySelector('#product-packaging');
      let packaging = packagingSelect ? (packagingSelect.value || '') : '';
      if (packaging === 'other') {
        const other = bodyEl.querySelector('input[name="packaging_other"]') || bodyEl.querySelector('#product-packaging-other');
        packaging = other ? other.value.trim() : packaging;
      }

      const payload = {
        name,
        sku: null,
        category_id: null,
        cost: Number.isFinite(cost) ? cost : 0,
        price: Number.isFinite(price) ? price : 0,
        stock: Number.isFinite(stock) ? stock : 0,
        unit,
        packaging: packaging || null,
      };

      try {
        const productId = form.getAttribute('data-product-id') || '';
        const url = isEdit && productId ? `/api/products/${productId}` : '/api/products';
        const method = isEdit && productId ? 'PUT' : 'POST';
        const resp = await ibmsFetch(url, { method, body: JSON.stringify(payload) });
        if (!resp.ok) {
          const txt = await resp.text();
          throw new Error(txt || resp.statusText || (isEdit ? 'Failed to update product' : 'Failed to create product'));
        }
        await resp.json().catch(() => null);
        modal.hide();
        showToast(isEdit ? 'Product updated successfully.' : 'Product created successfully.', 'success');
        setTimeout(() => location.reload(), 400);
      } catch (err) {
        showToast(err.message || (isEdit ? 'Failed to update product' : 'Failed to create product'), 'error');
      }

      return;
    }

    if (formType === 'suppliers') {
      const isEdit = formAction === 'edit';
      const company = (bodyEl.querySelector('input[name="company"]')?.value || '').trim();
      const contact = (bodyEl.querySelector('input[name="contact"]')?.value || '').trim();
      const category = (bodyEl.querySelector('input[name="category"]')?.value || '').trim();
      const leadTime = (bodyEl.querySelector('input[name="lead_time"]')?.value || '').trim();
      const status = (bodyEl.querySelector('select[name="status"]')?.value || 'Reliable').trim();

      if (!company) {
        showToast('Supplier company is required.', 'error');
        return;
      }

      const suppliers = getSuppliers();
      const supplierId = form.getAttribute('data-supplier-id') || '';
      const payload = { company, contact, category, lead_time: leadTime, status };

      if (isEdit && supplierId) {
        const index = suppliers.findIndex((entry) => String(entry.id || entry.company) === String(supplierId));
        if (index >= 0) {
          suppliers[index] = { ...suppliers[index], ...payload };
        }
      } else {
        suppliers.unshift({
          id: `supplier-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
          ...payload,
        });
      }

      persistSuppliers(suppliers);
      renderSuppliersTable();
      modal.hide();
      showToast(isEdit ? 'Supplier updated successfully.' : 'Supplier added successfully.', 'success');
      return;
    }

    if (formType === 'customers') {
      const isEdit = formAction === 'edit';
      const name = (bodyEl.querySelector('input[name="name"]')?.value || '').trim();
      const phone = (bodyEl.querySelector('input[name="phone"]')?.value || '').trim();
      const region = (bodyEl.querySelector('input[name="region"]')?.value || '').trim();
      const balance = Number(bodyEl.querySelector('input[name="balance"]')?.value || 0);
      const status = (bodyEl.querySelector('select[name="status"]')?.value || 'Active').trim();

      if (!name) {
        showToast('Customer name is required.', 'error');
        return;
      }

      const customers = getCustomers();
      const customerId = form.getAttribute('data-customer-id') || '';
      const payload = { name, phone, region, balance: Number.isFinite(balance) ? balance : 0, status };

      if (isEdit && customerId) {
        const index = customers.findIndex((entry) => String(entry.id || entry.name) === String(customerId));
        if (index >= 0) {
          customers[index] = { ...customers[index], ...payload };
        }
      } else {
        customers.unshift({
          id: `customer-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
          ...payload,
        });
      }

      persistCustomers(customers);
      renderCustomersTable();
      modal.hide();
      showToast(isEdit ? 'Customer updated successfully.' : 'Customer added successfully.', 'success');
      return;
    }

    modal.hide();
    showFeedback('Changes saved successfully.');
  });
}

function getActionConfig(formType, action) {
  const actionTitle = action === 'edit' ? 'Edit record' : 'Add new record';

  switch (formType) {
    case 'products':
      if (action === 'receive-packages') {
        return {
          title: 'Receive Packages',
          subtitle: 'Record incoming package batches and update stock.',
          body: `
          <div class="row g-3">
            <div class="col-12">
              <label class="form-label">Product</label>
              <div><strong id="receive-product-name">Selected product</strong></div>
            </div>
            <div class="col-md-6">
              <label class="form-label">100kg packages (count)</label>
              <input class="form-control" type="number" min="0" value="0" data-size="100" />
            </div>
            <div class="col-md-6">
              <label class="form-label">50kg packages (count)</label>
              <input class="form-control" type="number" min="0" value="0" data-size="50" />
            </div>
            <div class="col-md-6">
              <label class="form-label">10kg packages (count)</label>
              <input class="form-control" type="number" min="0" value="0" data-size="10" />
            </div>
            <div class="col-md-6">
              <label class="form-label">25kg packages (count)</label>
              <input class="form-control" type="number" min="0" value="0" data-size="25" />
            </div>
            <div class="col-md-6">
              <label class="form-label">5kg packages (count)</label>
              <input class="form-control" type="number" min="0" value="0" data-size="5" />
            </div>
            <div class="col-12">
              <small class="text-muted">When you save, the system will add total kilograms (size × count) to the product stock and record package counts.</small>
            </div>
            <script>
              (function(){
                // fill product name from form attribute
                setTimeout(function(){
                  try {
                    var form = document.getElementById('ibms-action-form');
                    var pid = form?.getAttribute('data-product-id');
                    if (pid) {
                      var wrapper = document.querySelector('.product-card-wrapper[data-product-id="'+pid+'"]');
                      var name = wrapper?.querySelector('h5')?.textContent || pid;
                      var el = document.getElementById('receive-product-name');
                      if (el) el.textContent = name;
                    }
                  } catch(e){}
                },50);
              })();
            </script>
          </div>
        `
        };
      }
      return {
        title: action === 'edit' ? 'Edit product' : 'Add product',
        subtitle: action === 'edit' ? 'Update the product details below.' : 'Create a new product entry for your catalogue.',
        body: `
          <div class="row g-3">
            <div class="col-md-6">
              <label class="form-label">Product name</label>
              <input name="name" class="form-control" placeholder="e.g. Rice Grade A" />
            </div>
            <div class="col-md-6">
              <label class="form-label">Category</label>
              <select id="product-category" name="category" class="form-select">
                <option value="">Select category</option>
                <option value="agriculture">Agriculture</option>
                <option value="construction">Construction</option>
                <option value="inputs">Inputs</option>
              </select>
            </div>
            <div class="col-md-4">
              <label class="form-label">Quantity</label>
              <input name="stock" class="form-control" type="number" value="120" />
            </div>
            <div class="col-md-4">
              <label class="form-label">Unit</label>
              <input name="unit" class="form-control" placeholder="e.g. unit, bag" />
            </div>
            <div class="col-md-4">
              <label class="form-label">Buying price</label>
              <input name="cost" class="form-control" value="240" />
            </div>
            <div class="col-md-4">
              <label class="form-label">Selling price</label>
              <input name="price" class="form-control" value="290" />
            </div>
            <div class="col-12">
              <label class="form-label">Notes</label>
              <textarea name="notes" class="form-control" rows="3" placeholder="Add stock, supplier or handling notes"></textarea>
            </div>
            <div id="packaging-row" class="col-md-12">
              <label class="form-label">Packaging</label>
              <div class="d-flex gap-2 align-items-center">
                <select id="product-packaging" name="packaging" class="form-select" style="max-width:220px;">
                  <option value="">Select packaging</option>
                  <option value="5kg">5kg</option>
                  <option value="25kg">25kg</option>
                  <option value="50kg">50kg</option>
                  <option value="other">Other</option>
                </select>
                <input id="product-packaging-other" name="packaging_other" class="form-control" placeholder="Custom packaging" style="display:none; max-width:220px;" />
              </div>
            </div>
            <script>
              (function(){
                const packSelect = document.getElementById('product-packaging');
                const packOther = document.getElementById('product-packaging-other');
                packSelect?.addEventListener('change', function(){
                  if (packSelect.value === 'other') packOther.style.display = '';
                  else if (packOther) packOther.style.display = 'none';
                });
              })();
            </script>
          </div>
        `
      };
    case 'customers':
      return {
        title: action === 'edit' ? 'Edit customer' : 'Add customer',
        subtitle: action === 'edit' ? 'Update customer details.' : 'Create a new customer account.',
        body: `
          <div class="row g-3">
            <div class="col-md-6">
              <label class="form-label">Full name</label>
              <input name="name" class="form-control" placeholder="Customer name" />
            </div>
            <div class="col-md-6">
              <label class="form-label">Phone</label>
              <input name="phone" class="form-control" placeholder="Phone number" />
            </div>
            <div class="col-md-6">
              <label class="form-label">Region</label>
              <input name="region" class="form-control" placeholder="Region" />
            </div>
            <div class="col-md-6">
              <label class="form-label">Balance</label>
              <input name="balance" type="number" class="form-control" placeholder="500000" />
            </div>
            <div class="col-md-12">
              <label class="form-label">Status</label>
              <select name="status" class="form-select">
                <option value="Active">Active</option>
                <option value="VIP">VIP</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>
        `
      };
    case 'suppliers':
      return {
        title: action === 'edit' ? 'Edit supplier' : 'Add supplier',
        subtitle: action === 'edit' ? 'Adjust supplier record details.' : 'Register a new supplier partner.',
        body: `
          <div class="row g-3">
            <div class="col-md-6">
              <label class="form-label">Company name</label>
              <input name="company" class="form-control" placeholder="Supplier company" />
            </div>
            <div class="col-md-6">
              <label class="form-label">Contact</label>
              <input name="contact" class="form-control" placeholder="Phone or manager name" />
            </div>
            <div class="col-md-6">
              <label class="form-label">Category</label>
              <input name="category" class="form-control" placeholder="Seeds, cement, fertilizer" />
            </div>
            <div class="col-md-6">
              <label class="form-label">Lead time</label>
              <input name="lead_time" class="form-control" placeholder="3 days" />
            </div>
            <div class="col-md-12">
              <label class="form-label">Status</label>
              <select name="status" class="form-select">
                <option value="Reliable">Reliable</option>
                <option value="Needs Review">Needs Review</option>
                <option value="Paused">Paused</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>
        `
      };
    case 'employees':
      return {
        title: action === 'edit' ? 'Edit employee' : 'Add employee',
        subtitle: action === 'edit' ? 'Update employee profile details.' : 'Create a new employee profile.',
        body: `
          <div class="row g-3">
            <div class="col-md-6">
              <label class="form-label">Full name</label>
              <input class="form-control" placeholder="Employee name" />
            </div>
            <div class="col-md-6">
              <label class="form-label">Role</label>
              <input class="form-control" placeholder="Supervisor, driver, accountant" />
            </div>
            <div class="col-md-6">
              <label class="form-label">Department</label>
              <input class="form-control" placeholder="Operations, Finance" />
            </div>
            <div class="col-md-6">
              <label class="form-label">Salary</label>
              <input class="form-control" placeholder="Tshs 95,000" />
            </div>
          </div>
        `
      };
    case 'purchases':
      return {
        title: action === 'edit' ? 'Edit purchase' : 'Add purchase',
        subtitle: action === 'edit' ? 'Update the purchase order details.' : 'Record a new purchase order.',
        body: `
          <div class="row g-3">
            <div class="col-md-6">
              <label class="form-label">Order ID</label>
              <input class="form-control" placeholder="PO-1043" />
            </div>
            <div class="col-md-6">
              <label class="form-label">Supplier</label>
              <input class="form-control" placeholder="Supplier name" />
            </div>
            <div class="col-md-6">
              <label class="form-label">Amount</label>
              <input class="form-control" placeholder="Tshs 900,000" />
            </div>
            <div class="col-md-6">
              <label class="form-label">Status</label>
              <select class="form-select">
                <option>Pending</option>
                <option>Approved</option>
                <option>Received</option>
              </select>
            </div>
          </div>
        `
      };
    default:
      return {
        title: actionTitle,
        subtitle: 'Complete the entry details to continue.',
        body: `
          <div class="row g-3">
            <div class="col-12">
              <label class="form-label">Entry name</label>
              <input class="form-control" placeholder="Type a name" />
            </div>
            <div class="col-12">
              <label class="form-label">Description</label>
              <textarea class="form-control" rows="3" placeholder="Describe the entry"></textarea>
            </div>
          </div>
        `
      };
  }
}

function showFeedback(message) {
  showToast(message, 'success');
}

function ensureToastContainer() {
  let container = document.querySelector('.ibms-toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'ibms-toast-container';
    document.body.appendChild(container);
  }
  return container;
}

function showToast(message, type = 'info', ttl = 4000) {
  const container = ensureToastContainer();

  const toast = document.createElement('div');
  toast.className = `ibms-toast ${type}`;
  toast.setAttribute('role', 'status');
  toast.setAttribute('aria-live', 'polite');
  toast.innerHTML = `
    <div class="toast-icon"><i class="fas fa-info-circle"></i></div>
    <div class="toast-message">${message}</div>
    <button class="toast-close" aria-label="Close">&times;</button>
  `;

  const closeBtn = toast.querySelector('.toast-close');
  closeBtn.addEventListener('click', () => {
    toast.remove();
  });

  container.appendChild(toast);

  setTimeout(() => {
    try { toast.remove(); } catch (e) {}
  }, ttl);
}
