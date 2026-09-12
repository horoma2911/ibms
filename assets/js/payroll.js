(function () {
  document.addEventListener('DOMContentLoaded', function () {
    const employeeSearchInput = document.getElementById('payroll-employee-search');
    const employeeSelectionInput = document.getElementById('payroll-employee-select');
    const employeeDatalist = document.getElementById('payroll-employee-list');
    const basicInput = document.getElementById('basic-salary');
    const bonusInput = document.getElementById('bonus-amount');
    const allowancesInput = document.getElementById('allowances-amount');
    const deductionsInput = document.getElementById('deductions-amount');
    const netSalaryEl = document.getElementById('net-salary-amount');
    const employeeSummaryEl = document.getElementById('payroll-summary-employee');
    const periodEl = document.getElementById('payroll-period');
    const generateBtn = document.getElementById('btn-generate-payslip');
    const bankNameInput = document.getElementById('bank-name');
    const bankAccountNameEl = document.getElementById('bank-account-name');
    const bankAccountNumberEl = document.getElementById('bank-account-number');
    const bankNameDisplayEl = document.getElementById('bank-name-display');
    const salaryDueDayInput = document.getElementById('salary-due-day');
    const salaryAlertEl = document.getElementById('salary-alert');

    let payrollEmployees = [];

    if (!employeeSearchInput || !basicInput || !generateBtn) return;

    function formatMoney(value) {
      const safe = Number.isFinite(value) ? value : 0;
      return `Tshs ${new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(safe)}`;
    }

    function parseMoney(value) {
      const numbersOnly = String(value ?? '').replace(/[^0-9.-]/g, '');
      const parsed = Number(numbersOnly || 0);
      return Number.isFinite(parsed) ? parsed : 0;
    }

    function updateNetPay() {
      const basic = parseMoney(basicInput.value);
      const bonus = parseMoney(bonusInput.value);
      const allowances = parseMoney(allowancesInput.value);
      const deductions = parseMoney(deductionsInput.value);
      const net = basic + bonus + allowances - deductions;

      if (netSalaryEl) {
        netSalaryEl.textContent = formatMoney(net);
      }

      if (periodEl) {
        const monthText = new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' });
        periodEl.textContent = `Month: ${monthText}`;
      }
    }

    function getEmployeeName(employee) {
      const first = employee?.first_name || employee?.name || '';
      const last = employee?.last_name || '';
      const name = [first, last].filter(Boolean).join(' ');
      return name || 'Employee';
    }

    function updateSalaryReminder(employee) {
      if (!salaryAlertEl) return;

      const dueDay = Number(employee?.salary_due_day || salaryDueDayInput?.value || 28);
      const today = new Date();
      const currentMonth = today.getMonth();
      const currentYear = today.getFullYear();
      let dueDate = new Date(currentYear, currentMonth, dueDay);

      if (dueDate < today) {
        dueDate = new Date(currentYear, currentMonth + 1, dueDay);
      }

      const diffDays = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));

      if (employee && employee.bank_name) {
        salaryAlertEl.className = 'salary-alert mb-4 ' + (diffDays <= 3 ? 'salary-alert-warning' : 'salary-alert-info');
      } else {
        salaryAlertEl.className = 'salary-alert mb-4 salary-alert-warning';
      }

      if (diffDays === 0) {
        salaryAlertEl.innerHTML = `<strong>Salary due today.</strong> Prepare payment for ${getEmployeeName(employee)}.`;
      } else if (diffDays <= 3) {
        salaryAlertEl.innerHTML = `<strong>Salary alert:</strong> ${getEmployeeName(employee)} is due in ${diffDays} day(s).`;
      } else {
        salaryAlertEl.innerHTML = `<strong>Salary reminder:</strong> ${getEmployeeName(employee)} is due in ${diffDays} day(s).`;
      }

      if (salaryDueDayInput) {
        salaryDueDayInput.value = String(dueDay);
      }
    }

    function populateEmployee(employee) {
      const employeeName = getEmployeeName(employee);
      const employeeNumber = employee?.employee_number || '';

      if (employeeSummaryEl) {
        employeeSummaryEl.textContent = employeeNumber ? `${employeeName} - ${employeeNumber}` : employeeName;
      }

      const salaryValue = Number(employee?.salary ?? 0);
      basicInput.value = Number.isFinite(salaryValue) ? String(Math.round(salaryValue)) : '0';
      bonusInput.value = '0';
      allowancesInput.value = '0';
      deductionsInput.value = '0';

      if (bankNameInput) {
        bankNameInput.value = employee?.bank_name || '';
      }
      if (bankAccountNameEl) {
        bankAccountNameEl.textContent = employee?.bank_account_name || '-';
      }
      if (bankAccountNumberEl) {
        bankAccountNumberEl.textContent = employee?.bank_account_number || '-';
      }
      if (bankNameDisplayEl) {
        bankNameDisplayEl.textContent = employee?.bank_name || '-';
      }
      if (salaryDueDayInput) {
        salaryDueDayInput.value = employee?.salary_due_day ? String(employee.salary_due_day) : '28';
      }

      updateSalaryReminder(employee);
      updateNetPay();
    }

    [basicInput, bonusInput, allowancesInput, deductionsInput].forEach((field) => {
      field.addEventListener('input', updateNetPay);
    });

    function resolveEmployeeBySearchValue(searchValue) {
      const value = (searchValue || '').trim();
      if (!value) return null;

      return payrollEmployees.find((employee) => {
        const label = `${getEmployeeName(employee)}${employee.employee_number ? ` (${employee.employee_number})` : ''}`;
        const rawValue = value.toLowerCase();
        return label.toLowerCase() === rawValue || employee.employee_number === value || getEmployeeName(employee).toLowerCase() === rawValue;
      }) || null;
    }

    function withLocalAdminFallback(headers = {}) {
      const adminKey = localStorage.getItem('ibms-admin-key');
      if (adminKey && !headers['X-IBMS-ADMIN']) {
        headers['X-IBMS-ADMIN'] = adminKey;
      }
      return headers;
    }

    function refreshEmployeeOptions() {
      if (!employeeDatalist) return;

      const term = (employeeSearchInput?.value || '').trim().toLowerCase();
      const filteredEmployees = term
        ? payrollEmployees.filter((employee) => {
            const haystack = [
              getEmployeeName(employee),
              employee.employee_number,
              employee.department,
              employee.position,
              employee.phone,
            ].filter(Boolean).join(' ').toLowerCase();

            return haystack.includes(term);
          })
        : payrollEmployees;

      employeeDatalist.innerHTML = filteredEmployees.length
        ? filteredEmployees.map((employee) => {
            const label = `${getEmployeeName(employee)}${employee.employee_number ? ` (${employee.employee_number})` : ''}`;
            return `<option value="${label}"></option>`;
          }).join('')
        : '<option value="No matching employees"></option>';
    }

    employeeSearchInput.addEventListener('input', () => {
      if (employeeSelectionInput) {
        employeeSelectionInput.value = '';
      }
      refreshEmployeeOptions();
    });

    employeeSearchInput.addEventListener('change', async function () {
      const searchValue = employeeSearchInput.value.trim();
      if (!searchValue) {
        if (employeeSelectionInput) employeeSelectionInput.value = '';
        employeeSummaryEl.textContent = 'Select an employee';
        return;
      }

      const selectedEmployee = resolveEmployeeBySearchValue(searchValue);
      if (!selectedEmployee) {
        if (employeeSelectionInput) employeeSelectionInput.value = '';
        employeeSummaryEl.textContent = 'No matching employee';
        return;
      }

      if (employeeSelectionInput) {
        employeeSelectionInput.value = String(selectedEmployee.id);
      }

      try {
        const response = await ibmsFetch(`/api/employees/${selectedEmployee.id}`, {
          headers: withLocalAdminFallback(),
        });
        if (!response.ok) throw new Error('Unable to load employee details');
        const employee = await response.json();
        populateEmployee(employee);
      } catch (error) {
        console.error(error);
        employeeSummaryEl.textContent = 'Unable to load employee';
      }
    });

    ibmsFetch('/api/employees')
      .then((response) => response.json())
      .then((employees) => {
        payrollEmployees = Array.isArray(employees) ? employees : [];

        if (payrollEmployees.length === 0) {
          employeeDatalist.innerHTML = '<option value="No employees found"></option>';
          return;
        }

        refreshEmployeeOptions();
      })
      .catch(() => {
        employeeDatalist.innerHTML = '<option value="Unable to load employees"></option>';
      });

    generateBtn.addEventListener('click', async function () {
      const employeeId = employeeSelectionInput?.value || resolveEmployeeBySearchValue(employeeSearchInput.value)?.id;

      if (!employeeId) {
        alert('Please select an employee');
        return;
      }

      const payload = {
        employee_id: Number(employeeId),
        basic: String(basicInput.value || '0'),
        bonus: String(bonusInput.value || '0'),
        allowances: String(allowancesInput.value || '0'),
        deductions: String(deductionsInput.value || '0'),
        period: periodEl ? periodEl.textContent.replace('Month: ', '') : new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' }),
      };

      const auth = localStorage.getItem('ibms-auth-token');
      let adminKey = localStorage.getItem('ibms-admin-key');
      if (!auth && !adminKey && (location.hostname === '127.0.0.1' || location.hostname === 'localhost')) {
        adminKey = 'localtest';
        localStorage.setItem('ibms-admin-key', adminKey);
      }

      try {
        const response = await ibmsFetch('/api/reports/payslip', {
          method: 'POST',
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const text = await response.text();
          alert(`Payslip failed: ${text || response.status}`);
          return;
        }

        const contentType = response.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const json = await response.json();
          alert(json.message || 'Payslip generated successfully.');
          return;
        }

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
      } catch (error) {
        console.error(error);
        alert('Failed to generate payslip.');
      }
    });

    updateNetPay();
  });
})();
