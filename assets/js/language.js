// Load translations from /lang/*.json where possible; keep inline fallback for robustness
let translations = null;

async function loadTranslations() {
  try {
    const [enRes, swRes] = await Promise.all([
      fetch('/lang/en.json'),
      fetch('/lang/sw.json')
    ]);
    if (enRes.ok && swRes.ok) {
      const en = await enRes.json();
      const sw = await swRes.json();
      translations = { en, sw };
      return;
    }
  } catch (e) {
    // network or file access may fail when opened via file://; fall back to embedded object below
  }

  // Embedded fallback translations (smaller subset) to ensure functionality offline
  translations = {
    en: {
      appName: 'HOROMA RICE MILL MANAGEMENT SYSTEM',
      appSubtitle: 'Horoma Rice Mill Management System',
      login: { welcome: 'Welcome Back', subtitle: 'Access your business operations with confidence.', username: 'Email Address', password: 'Password', loginButton: 'Login', languageLabel: 'Language' },
      sidebar: { dashboard: 'Dashboard', products: 'Products', inventory: 'Inventory', sales: 'Sales', purchases: 'Purchases', customers: 'Customers', suppliers: 'Suppliers', employees: 'Employees', attendance: 'Attendance', payroll: 'Payroll', reports: 'Reports', settings: 'Settings' },
      topbar: { searchPlaceholder: 'Search modules, reports or staff', notifications: 'Notifications', profile: 'Operations Lead' },
      dashboard: { heading: 'Executive Overview', subheading: 'Monitor operations across procurement, sales, staffing and inventory.', todaysSales: "Today's Sales", monthlyRevenue: 'Monthly Revenue', expenses: 'Expenses', profit: 'Profit', stock: 'Available Stock', employees: 'Employees', salesChart: 'Monthly Sales', productChart: 'Top Performing Products', expensesChart: 'Expenses', stockChart: 'Stock Overview' }
    },
    sw: {
      appName: 'HOROMA RICE MILL MANAGEMENT SYSTEM',
      appSubtitle: 'Mfumo wa Usimamizi wa Horoma Rice Mill',
      login: { welcome: 'Karibu Tena', subtitle: 'Pata ufikiaji wa shughuli zako za biashara kwa ujasiri.', username: 'Barua pepe', password: 'Neno la siri', loginButton: 'Ingia', languageLabel: 'Lugha' },
      sidebar: { dashboard: 'Dashibodi', products: 'Bidhaa', inventory: 'Stock', sales: 'Mauzo', purchases: 'Manunuzi', customers: 'Wateja', suppliers: 'Wasambazaji', employees: 'Wafanyakazi', attendance: 'Mahudhurio', payroll: 'Mishahara', reports: 'Ripoti', settings: 'Mipangilio' },
      topbar: { searchPlaceholder: 'Tafuta moduli, ripoti au wafanyakazi', notifications: 'Arifa', profile: 'Msimamizi wa Uendeshaji' },
      dashboard: { heading: 'Muhtasari wa Uendeshaji', subheading: 'Fuatilia shughuli za ununuzi, mauzo, wafanyakazi na hesabu.', todaysSales: 'Mauzo ya Leo', monthlyRevenue: 'Mapato ya Mwezi', expenses: 'Matumizi', profit: 'Faida', stock: 'Stock Iliyopo', employees: 'Wafanyakazi', salesChart: 'Mauzo kwa Mwezi', productChart: 'Bidhaa Zinazouzwa Zaidi', expensesChart: 'Matumizi', stockChart: 'Muhtasari wa Stock' }
    }
  };
}

let currentLanguage = localStorage.getItem('ibms-language') || 'en';

function setLanguage(lang) {
  if (!translations) return;
  currentLanguage = lang;
  localStorage.setItem('ibms-language', lang);
  document.documentElement.lang = lang;
  document.documentElement.setAttribute('data-lang', lang);

  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    const value = getTranslationValue(key, lang);
    if (value !== null && value !== undefined) {
      el.textContent = value;
    }
  });

  document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
    const key = el.getAttribute('data-i18n-placeholder');
    const value = getTranslationValue(key, lang);
    if (value !== null && value !== undefined) {
      el.setAttribute('placeholder', value);
    }
  });

  document.querySelectorAll('.language-select').forEach((select) => {
    select.value = lang;
    select.setAttribute('aria-label', getTranslationValue('login.languageLabel', lang) || 'Language');
  });
}

function getTranslationValue(key, lang) {
  if (!translations) return null;
  const parts = key.split('.');
  let value = translations[lang];
  for (const part of parts) {
    if (!value || !Object.prototype.hasOwnProperty.call(value, part)) {
      value = null;
      break;
    }
    value = value[part];
  }
  if (value === null || value === undefined) {
    const fallback = translations.en;
    let fallbackValue = fallback;
    for (const part of parts) {
      if (!fallbackValue || !Object.prototype.hasOwnProperty.call(fallbackValue, part)) {
        fallbackValue = null;
        break;
      }
      fallbackValue = fallbackValue[part];
    }
    return fallbackValue;
  }
  return value;
}

async function initLanguageSwitcher() {
  await loadTranslations();
  document.querySelectorAll('.language-switcher').forEach((switcher) => switcher.remove());

  document.querySelectorAll('.topbar-actions, .d-flex.justify-content-end').forEach((container) => {
    const buttons = Array.from(container.querySelectorAll('[data-lang-switch]'));
    if (!buttons.length) {
      return;
    }

    const switcher = document.createElement('div');
    switcher.className = 'language-switcher';

    const select = document.createElement('select');
    select.className = 'form-select form-select-sm language-select';
    select.setAttribute('aria-label', getTranslationValue('login.languageLabel', currentLanguage) || 'Language');
    select.innerHTML = `
      <option value="en">English</option>
      <option value="sw">Kiswahili</option>
    `;

    select.addEventListener('change', (event) => setLanguage(event.target.value));

    buttons.forEach((btn) => btn.remove());
    switcher.appendChild(select);
    container.prepend(switcher);
  });

  setLanguage(currentLanguage);
}

window.addEventListener('DOMContentLoaded', initLanguageSwitcher);
