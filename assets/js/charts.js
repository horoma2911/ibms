function buildChart(ctx, config) {
  if (!ctx || typeof window.Chart === 'undefined') {
    return;
  }
  new window.Chart(ctx, config);
}

function initDashboardCharts() {
  (async function loadAndBuildCharts() {
    try {
      const [productsResponse, salesResponse] = await Promise.all([
        ibmsFetch('/api/products').catch(() => null),
        ibmsFetch('/api/sales').catch(() => null)
      ]);

      const products = productsResponse && productsResponse.ok ? await productsResponse.json().catch(() => []) : [];
      const salesData = salesResponse && salesResponse.ok ? await salesResponse.json().catch(() => ({ sales: [] })) : { sales: [] };

      const productList = Array.isArray(products) ? products : [];
      const sales = Array.isArray(salesData.sales) ? salesData.sales : [];

      // Build Revenue Chart (Monthly Sales)
      const salesCtx = document.getElementById('salesChart');
      if (salesCtx && sales.length > 0) {
        const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const monthlyRevenue = new Array(12).fill(0);
        
        sales.forEach(sale => {
          if (sale.created_at) {
            const saleDate = new Date(sale.created_at);
            const month = saleDate.getMonth();
            monthlyRevenue[month] += Number(sale.total_amount || 0);
          }
        });

        buildChart(salesCtx, {
          type: 'line',
          data: {
            labels: monthLabels,
            datasets: [{
              label: 'Revenue',
              data: monthlyRevenue,
              borderColor: '#013E37',
              backgroundColor: 'rgba(1, 62, 55, 0.16)',
              tension: 0.4,
              fill: true,
              pointRadius: 4,
              pointHoverRadius: 5
            }]
          },
          options: {
            responsive: true,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true } }
          }
        });
      }

      // Build Product Sales Chart (Top Products by Units Sold)
      const productCtx = document.getElementById('productChart');
      if (productCtx && sales.length > 0) {
        const productSalesMap = {};
        sales.forEach(sale => {
          if (sale.items && Array.isArray(sale.items)) {
            sale.items.forEach(item => {
              const productName = item.product_name || item.name || 'Unknown';
              if (!productSalesMap[productName]) {
                productSalesMap[productName] = 0;
              }
              productSalesMap[productName] += Number(item.quantity || 0);
            });
          }
        });

        const topProducts = Object.entries(productSalesMap)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 6)
          .map(([name, qty]) => ({ name, qty }));

        if (topProducts.length > 0) {
          buildChart(productCtx, {
            type: 'bar',
            data: {
              labels: topProducts.map(p => p.name),
              datasets: [{
                label: 'Units Sold',
                data: topProducts.map(p => p.qty),
                backgroundColor: ['#013E37', '#055d4e', '#0b766a', '#FFEFBF', '#1a8270', '#2da39f']
              }]
            },
            options: { responsive: true, plugins: { legend: { display: false } } }
          });
        }
      }

      // Build Expense Chart (Monthly Expense Trend)
      const expenseCtx = document.getElementById('expenseChart');
      if (expenseCtx) {
        const expenseResponse = await ibmsFetch('/api/expenses').catch(() => null);
        const expenseData = expenseResponse && expenseResponse.ok ? await expenseResponse.json().catch(() => ({ expenses: [] })) : { expenses: [] };
        const expenses = Array.isArray(expenseData.expenses) ? expenseData.expenses : [];
        const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const monthlyExpenses = new Array(12).fill(0);

        expenses.forEach((expense) => {
          const date = expense.date ? new Date(expense.date) : null;
          if (!date || Number.isNaN(date.getTime())) return;
          monthlyExpenses[date.getMonth()] += Number(expense.amount || 0);
        });

        if (expenses.length > 0) {
          buildChart(expenseCtx, {
            type: 'line',
            data: {
              labels: monthLabels,
              datasets: [{
                label: 'Expenses',
                data: monthlyExpenses,
                borderColor: '#ffb703',
                backgroundColor: 'rgba(255, 183, 3, 0.14)',
                fill: true,
                tension: 0.35,
                pointRadius: 4,
                pointHoverRadius: 5
              }]
            },
            options: {
              responsive: true,
              plugins: { legend: { display: false } },
              scales: { y: { beginAtZero: true } }
            }
          });
        }
      }

      // Build Stock Availability Chart (All Products)
      const stockCtx = document.getElementById('stockChart');
      if (stockCtx && productList.length > 0) {
        const topStockProducts = productList.slice(0, 6).map(p => ({
          name: p.name,
          stock: Number(p.stock || 0),
          maxStock: Math.max(100, Number(p.stock || 0))
        }));

        buildChart(stockCtx, {
          type: 'radar',
          data: {
            labels: topStockProducts.map(p => p.name),
            datasets: [{
              label: 'Availability',
              data: topStockProducts.map(p => Math.round((p.stock / Math.max(p.maxStock, 100)) * 100)),
              backgroundColor: 'rgba(255, 239, 191, 0.45)',
              borderColor: '#013E37',
              pointBackgroundColor: '#013E37'
            }]
          },
          options: { responsive: true }
        });
      }
    } catch (error) {
      console.error('Failed to load charts with live data', error);
    }
  })();
}

function initReportsCharts() {
  (async function loadReportsChart() {
    try {
      const [productsResponse, salesResponse] = await Promise.all([
        ibmsFetch('/api/products').catch(() => null),
        ibmsFetch('/api/sales').catch(() => null)
      ]);

      const products = productsResponse && productsResponse.ok ? await productsResponse.json().catch(() => []) : [];
      const salesData = salesResponse && salesResponse.ok ? await salesResponse.json().catch(() => ({ sales: [] })) : { sales: [] };

      const productList = Array.isArray(products) ? products : [];
      const sales = Array.isArray(salesData.sales) ? salesData.sales : [];

      const reportCtx = document.getElementById('reportsChart');
      if (reportCtx) {
        const totalSales = sales.length;
        const totalRevenue = sales.reduce((sum, sale) => sum + Number(sale.total_amount || 0), 0);
        const purchases = typeof getPurchases === 'function' ? getPurchases() : [];
        const totalExpenses = purchases.reduce((sum, purchase) => sum + Number(purchase.amount || 0), 0);
        const totalProfit = totalRevenue - totalExpenses;
        const totalInventory = productList.reduce((sum, product) => sum + Number(product.stock || 0), 0);

        if (typeof window.Chart === 'undefined') {
          const fallback = document.createElement('div');
          fallback.className = 'mt-3';
          fallback.innerHTML = `
            <div class="row g-2">
              <div class="col-md-3">
                <div class="border rounded p-3 bg-light h-100">
                  <div class="small text-muted">Sales</div>
                  <div class="fw-bold">${totalSales}</div>
                </div>
              </div>
              <div class="col-md-3">
                <div class="border rounded p-3 bg-light h-100">
                  <div class="small text-muted">Revenue</div>
                  <div class="fw-bold">Tshs ${Number(totalRevenue).toLocaleString()}</div>
                </div>
              </div>
              <div class="col-md-3">
                <div class="border rounded p-3 bg-light h-100">
                  <div class="small text-muted">Profit</div>
                  <div class="fw-bold">Tshs ${Number(totalProfit).toLocaleString()}</div>
                </div>
              </div>
              <div class="col-md-3">
                <div class="border rounded p-3 bg-light h-100">
                  <div class="small text-muted">Inventory</div>
                  <div class="fw-bold">${totalInventory}</div>
                </div>
              </div>
            </div>
          `;
          reportCtx.replaceWith(fallback);
          return;
        }

        buildChart(reportCtx, {
          type: 'bar',
          data: {
            labels: ['Sales', 'Profit', 'Expenses', 'Inventory'],
            datasets: [{
              label: 'Performance',
              data: [totalSales, Math.max(0, totalProfit), totalExpenses, totalInventory],
              backgroundColor: ['#013E37', '#055d4e', '#0b766a', '#FFEFBF']
            }]
          },
          options: { responsive: true, plugins: { legend: { display: false } } }
        });
      }
    } catch (error) {
      console.error('Failed to load reports chart with live data', error);
    }
  })();
}

window.addEventListener('DOMContentLoaded', () => {
  initDashboardCharts();
  initReportsCharts();
});
