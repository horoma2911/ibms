document.addEventListener('DOMContentLoaded', () => {
  const modalEl = document.getElementById('qrModal');
  const qrImage = document.getElementById('qrImage');
  const qrEmployeeName = document.getElementById('qrEmployeeName');
  const qrEmployeeNumber = document.getElementById('qrEmployeeNumber');
  const btnDownload = document.getElementById('btnDownloadQr');
  const btnRegenerate = document.getElementById('btnRegenerateQr');
  const employeeForm = document.getElementById('employee-form');
  const employeeSaveBtn = document.getElementById('employee-save-btn');
  const employeeCancelEditBtn = document.getElementById('employee-cancel-edit');
  const employeeTableBody = document.getElementById('employee-table-body');
  const employeeSearchInput = document.getElementById('employee-search');
  const employeeNumberInput = employeeForm ? employeeForm.querySelector('input[name="employee_number"]') : null;
  const employeeNumberHelper = document.getElementById('employee-number-helper');
  const idCardModal = document.getElementById('idCardModal');
  const btnPrintIdCard = document.getElementById('btnPrintIdCard');
  const idCardEmployeeName = document.getElementById('idCardEmployeeName');
  const idCardEmployeeNumber = document.getElementById('idCardEmployeeNumber');
  const idCardQrImage = document.getElementById('idCardQrImage');

  let current = { id: null, token: null };
  let allEmployees = [];

  function setEmployeeNumberHelper() {
    if (!employeeNumberHelper) return;
    employeeNumberHelper.textContent = `Next employee ID: ${getNextEmployeeNumber(allEmployees)}`;
  }

  function getNextEmployeeNumber(list = []) {
    const highest = list.reduce((max, employee) => {
      const value = String(employee.employee_number || '').replace(/\D/g, '');
      const parsed = Number(value || 0);
      return Number.isFinite(parsed) ? Math.max(max, parsed) : max;
    }, 0);

    return `EMP-${String(highest + 1).padStart(3, '0')}`;
  }

  function setFormMode(mode = 'create', employee = null) {
    if (!employeeForm) return;

    employeeForm.dataset.mode = mode;
    employeeForm.dataset.employeeId = employee ? String(employee.id) : '';

    if (employeeSaveBtn) {
      employeeSaveBtn.textContent = mode === 'edit' ? 'Update Employee' : 'Save';
    }

    if (employeeCancelEditBtn) {
      employeeCancelEditBtn.classList.toggle('d-none', mode !== 'edit');
    }

    if (mode === 'edit' && employee) {
      const fields = [
        ['employee_number', employee.employee_number || ''],
        ['first_name', employee.first_name || ''],
        ['last_name', employee.last_name || ''],
        ['phone', employee.phone || ''],
        ['salary', employee.salary ?? ''],
        ['bank_name', employee.bank_name || ''],
        ['bank_account_name', employee.bank_account_name || ''],
        ['bank_account_number', employee.bank_account_number || ''],
        ['salary_due_day', employee.salary_due_day ?? 28],
        ['position', employee.position || ''],
        ['department', employee.department || ''],
        ['status', employee.status || 'active'],
      ];

      fields.forEach(([name, value]) => {
        const field = employeeForm.querySelector(`[name="${name}"]`);
        if (field) field.value = value;
      });
    }
  }

  function ensureEmployeeNumber() {
    if (!employeeNumberInput) return;

    if (!employeeNumberInput.value.trim()) {
      employeeNumberInput.value = getNextEmployeeNumber(allEmployees);
    }
  }

  if (employeeNumberInput) {
    employeeNumberInput.placeholder = 'EMP-001';
    employeeNumberInput.value = employeeNumberInput.value.trim() || '';
    setEmployeeNumberHelper();
  }

  function qrUrlFromToken(token) {
    if (!token) return '';
    return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(token)}`;
  }

  function getEmployeeName(employee) {
    return employee.name || [employee.first_name, employee.last_name].filter(Boolean).join(' ') || 'Employee';
  }

  function getEmployeePayloadFromForm() {
    const formData = new FormData(employeeForm);
    const payload = {
      employee_number: (formData.get('employee_number') || '').toString().trim(),
      first_name: (formData.get('first_name') || '').toString().trim(),
      last_name: (formData.get('last_name') || '').toString().trim(),
      department: (formData.get('department') || '').toString().trim(),
      position: (formData.get('position') || '').toString().trim(),
      phone: (formData.get('phone') || '').toString().trim(),
      salary: Number(formData.get('salary') || 0),
      bank_name: (formData.get('bank_name') || '').toString().trim(),
      bank_account_name: (formData.get('bank_account_name') || '').toString().trim(),
      bank_account_number: (formData.get('bank_account_number') || '').toString().trim(),
      salary_due_day: Number(formData.get('salary_due_day') || 28),
      status: (formData.get('status') || 'active').toString().trim(),
    };

    return payload;
  }

  function renderEmployeeRows(list = []) {
    if (!employeeTableBody) return;

    if (!list.length) {
      employeeTableBody.innerHTML = `
        <tr>
          <td colspan="6" class="text-center text-muted py-4">No employees found.</td>
        </tr>
      `;
      return;
    }

    employeeTableBody.innerHTML = list.map((employee) => {
      const employeeName = getEmployeeName(employee);
      const status = (employee.status || 'active').toString();
      const badgeClass = status === 'inactive' ? 'bg-secondary' : status === 'suspended' ? 'bg-warning text-dark' : 'bg-success';
      const salary = Number(employee.salary || 0);
      return `
        <tr>
          <td>${employeeName}</td>
          <td>${employee.position || '—'}</td>
          <td>${employee.department || '—'}</td>
          <td>${salary ? `Tshs ${salary.toLocaleString()}` : '—'}</td>
          <td><span class="badge ${badgeClass}">${status}</span></td>
          <td>
            <div class="d-flex gap-2 flex-wrap">
              <button
                class="btn btn-sm btn-outline-primary btn-show-qr"
                data-employee-id="${employee.id}"
                data-employee-number="${employee.employee_number || 'EMP'}"
                data-employee-name="${employeeName}"
              >
                QR
              </button>
              <button class="btn btn-sm btn-outline-secondary btn-edit-employee" data-employee-id="${employee.id}">Edit</button>
              <button class="btn btn-sm btn-outline-success btn-id-card" data-employee-id="${employee.id}">ID Card</button>
              <button class="btn btn-sm btn-outline-danger btn-delete-employee" data-employee-id="${employee.id}">Delete</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  function filterEmployees(query) {
    if (!allEmployees.length) {
      renderEmployeeRows([]);
      return;
    }

    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      renderEmployeeRows(allEmployees);
      return;
    }

    const filtered = allEmployees.filter((employee) => {
      const haystack = [
        employee.name,
        employee.first_name,
        employee.last_name,
        employee.department,
        employee.position,
        employee.phone,
        employee.employee_number,
      ].filter(Boolean).join(' ').toLowerCase();

      return haystack.includes(normalized);
    });

    renderEmployeeRows(filtered);
  }

  async function fetchEmployees() {
    try {
      const response = await ibmsFetch('/api/employees');
      const list = await response.json().catch(() => []);
      if (!Array.isArray(list)) {
        allEmployees = [];
        renderEmployeeRows([]);
        return;
      }

      allEmployees = list;
      if (employeeNumberInput && !employeeNumberInput.value.trim()) {
        employeeNumberInput.placeholder = getNextEmployeeNumber(allEmployees);
      }
      setEmployeeNumberHelper();
      filterEmployees(employeeSearchInput ? employeeSearchInput.value : '');
    } catch (error) {
      allEmployees = [];
      renderEmployeeRows([]);
      showToast('Unable to load employees.', 'error');
    }
  }

  function showQrModal(employee) {
    const id = employee.id;
    const number = employee.employee_number || 'EMP';
    const name = getEmployeeName(employee);

    current.id = String(id);
    current.token = employee.qr_token || '';
    qrEmployeeName.textContent = name;
    qrEmployeeNumber.textContent = number;
    qrImage.src = qrUrlFromToken(current.token);

    const modal = new bootstrap.Modal(modalEl);
    modal.show();
  }

  function showIdCardModal(employee) {
    if (!idCardModal) return;

    const profileName = getEmployeeName(employee);
    if (idCardEmployeeName) {
      idCardEmployeeName.textContent = profileName;
    }
    if (idCardEmployeeNumber) {
      idCardEmployeeNumber.textContent = employee.employee_number || 'EMP-000';
    }

    const photoEl = document.getElementById('idCardPhoto');
    if (photoEl) {
      photoEl.textContent = (profileName || 'EMP').split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase() || 'EMP';
    }

    if (idCardQrImage) {
      idCardQrImage.src = '';
      ibmsFetch(`/api/employees/${employee.id}`)
        .then(r => r.json())
        .then(body => {
          const token = body.qr_token || '';
          idCardQrImage.src = token ? qrUrlFromToken(token) : '';
        })
        .catch(() => {
          idCardQrImage.src = '';
        });
    }

    const modal = new bootstrap.Modal(idCardModal);
    modal.show();
  }

  function openModalForRow(btn) {
    const id = btn.getAttribute('data-employee-id');
    const number = btn.getAttribute('data-employee-number');
    const name = btn.getAttribute('data-employee-name');

    current.id = id;
    qrEmployeeName.textContent = name;
    qrEmployeeNumber.textContent = number;

    ibmsFetch(`/api/employees/${id}`)
      .then(r => r.json())
      .then(body => {
        const token = body.qr_token || (`EMP:${number}`);
        current.token = token;
        qrImage.src = qrUrlFromToken(token);
      })
      .catch(() => {
        current.token = `EMP:${number}`;
        qrImage.src = qrUrlFromToken(current.token);
      });

    const modal = new bootstrap.Modal(modalEl);
    modal.show();
  }

  if (employeeSearchInput) {
    employeeSearchInput.addEventListener('input', (event) => {
      filterEmployees(event.target.value || '');
    });
  }

  if (employeeTableBody) {
    employeeTableBody.addEventListener('click', async (event) => {
      const qrBtn = event.target.closest('.btn-show-qr');
      if (qrBtn) {
        openModalForRow(qrBtn);
        return;
      }

      const editBtn = event.target.closest('.btn-edit-employee');
      if (editBtn) {
        const employee = allEmployees.find((entry) => String(entry.id) === String(editBtn.dataset.employeeId));
        if (employee) {
          fillEmployeeForm(employee);
          setFormMode('edit', employee);
        }
        return;
      }

      const idCardBtn = event.target.closest('.btn-id-card');
      if (idCardBtn) {
        const employee = allEmployees.find((entry) => String(entry.id) === String(idCardBtn.dataset.employeeId));
        if (employee) {
          showIdCardModal(employee);
        }
        return;
      }

      const deleteBtn = event.target.closest('.btn-delete-employee');
      if (deleteBtn) {
        const employee = allEmployees.find((entry) => String(entry.id) === String(deleteBtn.dataset.employeeId));
        if (!employee) return;

        const shouldDelete = window.confirm(`Delete ${getEmployeeName(employee)} from the employee list?`);
        if (!shouldDelete) return;

        try {
          const response = await ibmsFetch(`/api/employees/${employee.id}`, { method: 'DELETE' });
          if (!response.ok) {
            throw new Error('Unable to delete employee.');
          }
          showToast('Employee deleted successfully.', 'success');
          employeeForm.reset();
          setFormMode('create');
          await fetchEmployees();
        } catch (error) {
          showToast(error.message || 'Unable to delete employee.', 'error');
        }
      }
    });
  }

  function fillEmployeeForm(employee) {
    if (!employeeForm) return;

    const fields = {
      employee_number: employee.employee_number || '',
      first_name: employee.first_name || '',
      last_name: employee.last_name || '',
      phone: employee.phone || '',
      salary: employee.salary ?? '',
      position: employee.position || '',
      department: employee.department || '',
      status: employee.status || 'active',
    };

    Object.entries(fields).forEach(([name, value]) => {
      const field = employeeForm.querySelector(`[name="${name}"]`);
      if (field) field.value = value;
    });
  }

  if (employeeCancelEditBtn && employeeForm) {
    employeeCancelEditBtn.addEventListener('click', () => {
      employeeForm.reset();
      setFormMode('create');
    });
  }

  if (employeeSaveBtn && employeeForm) {
    employeeSaveBtn.addEventListener('click', async () => {
      const payload = getEmployeePayloadFromForm();
      ensureEmployeeNumber();
      payload.employee_number = payload.employee_number || getNextEmployeeNumber(allEmployees);

      const isEdit = employeeForm.dataset.mode === 'edit' && employeeForm.dataset.employeeId;
      const url = isEdit ? `/api/employees/${employeeForm.dataset.employeeId}` : '/api/employees';
      const method = isEdit ? 'PUT' : 'POST';

      employeeSaveBtn.disabled = true;
      employeeSaveBtn.textContent = 'Saving...';

      try {
        const response = await ibmsFetch(url, {
          method,
          body: JSON.stringify(payload),
        });

        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(data.message || (isEdit ? 'Unable to update employee.' : 'Unable to register employee.'));
        }

        showToast(isEdit ? 'Employee updated successfully.' : 'Employee registered successfully and QR generated.', 'success');
        employeeForm.reset();
        setFormMode('create');
        await fetchEmployees();

        if (!isEdit) {
          showQrModal(data);
        }
      } catch (error) {
        showToast(error.message || 'Unable to save employee.', 'error');
      } finally {
        employeeSaveBtn.disabled = false;
        employeeSaveBtn.textContent = employeeForm.dataset.mode === 'edit' ? 'Update Employee' : 'Save';
      }
    });
  }

  if (btnDownload) {
    btnDownload.addEventListener('click', () => {
      if (!current.token) return;
      const url = qrUrlFromToken(current.token);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${current.id || 'employee'}-qr.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    });
  }

  if (btnRegenerate) {
    btnRegenerate.addEventListener('click', () => {
      if (!current.id) return;
      btnRegenerate.disabled = true;
      ibmsFetch(`/api/employees/${current.id}/regenerate-qr`, { method: 'POST' })
        .then(r => r.json())
        .then(body => {
          const token = body.qr_token;
          current.token = token;
          qrImage.src = qrUrlFromToken(token);
          showToast('QR regenerated', 'success');
        })
        .catch(() => showToast('Failed to regenerate QR', 'error'))
        .finally(() => btnRegenerate.disabled = false);
    });
  }

  if (btnPrintIdCard) {
    btnPrintIdCard.addEventListener('click', () => {
      window.print();
    });
  }

  setFormMode('create');
  fetchEmployees();
});
