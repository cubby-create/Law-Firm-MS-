/* CalAdvoc — management system data layer.
   Supabase-first with automatic per-device fallback, so data always
   persists across refreshes and stays isolated per signed-in firm. */

const PRACTICE_AREAS = [
  { name: 'Conveyancing', prefix: 'CONV' },
  { name: 'Succession & Probate', prefix: 'SUC' },
  { name: 'Rent & Tenancy', prefix: 'RENT' },
  { name: 'Employment & Labour', prefix: 'EMP' },
  { name: 'Criminal', prefix: 'CRIM' },
  { name: 'Family Law', prefix: 'FAM' },
  { name: 'Commercial', prefix: 'COMM' },
  { name: 'Land Disputes', prefix: 'LAND' },
  { name: 'Judicial Review', prefix: 'JR' },
  { name: 'Civil Litigation', prefix: 'CIV' },
  { name: 'Constitutional & Human Rights', prefix: 'CONST' },
  { name: 'Corporate & Company', prefix: 'CORP' },
  { name: 'Debt Recovery', prefix: 'DEBT' },
  { name: 'Banking & Finance', prefix: 'BANK' },
  { name: 'Insurance', prefix: 'INS' },
  { name: 'Tax', prefix: 'TAX' },
  { name: 'Intellectual Property', prefix: 'IP' },
  { name: 'Environmental', prefix: 'ENV' },
  { name: 'Immigration', prefix: 'IMM' },
  { name: 'Arbitration & Mediation', prefix: 'ADR' },
  { name: 'Election Petitions', prefix: 'ELEC' },
  { name: 'Admiralty & Maritime', prefix: 'ADM' },
  { name: 'Construction & Engineering', prefix: 'CONSTR' },
  { name: 'Public Procurement', prefix: 'PROC' },
  { name: 'Anti-Corruption', prefix: 'AC' },
  { name: 'Defamation', prefix: 'DEF' },
  { name: 'Consumer Protection', prefix: 'CONS' },
  { name: 'Children Matters', prefix: 'CHD' },
  { name: 'Real Estate Development', prefix: 'RED' },
];

const EXPENSE_CATEGORIES = [
  'Rent & Utilities', 'Salaries & Wages', 'Transport & Fuel', 'Stationery & Printing',
  'Court Fees & Filing', 'Professional Fees', 'Subsistence & Allowances',
  'Communications', 'Equipment', 'Marketing', 'Other',
];

const TABLES = ['clients', 'case_files', 'court_sessions', 'income', 'expenses', 'invoices', 'budgets'];

const SYS = { user: null, profile: null, data: {}, settings: {} };

function uid() {
  return crypto.randomUUID
    ? crypto.randomUUID()
    : 'id-' + Date.now() + '-' + Math.random().toString(16).slice(2);
}

function pad(num, len) {
  return String(num).padStart(len, '0');
}

const Store = {
  user: null,
  mode: 'supabase',

  _localKey() {
    return 'calAdvoc.system.' + (this.user ? this.user.id : 'anon');
  },

  _loadLocal() {
    try {
      return JSON.parse(localStorage.getItem(this._localKey()) || '{}');
    } catch (error) {
      return {};
    }
  },

  _saveLocal(all) {
    localStorage.setItem(this._localKey(), JSON.stringify(all));
  },

  async probe() {
    if (this.mode === 'supabase' && window.supabaseClient) {
      try {
        await window.supabaseClient.from('clients').select('id').limit(1);
        return;
      } catch (error) {
        this.mode = 'local';
      }
    } else if (!window.supabaseClient) {
      this.mode = 'local';
    }
  },

  async list(table) {
    if (this.mode === 'supabase' && window.supabaseClient) {
      try {
        const { data, error } = await window.supabaseClient
          .from(table)
          .select('*')
          .order('created_at', { ascending: false });
        if (error) throw error;
        return data || [];
      } catch (error) {
        this.mode = 'local';
      }
    }
    return this._loadLocal()[table] || [];
  },

  async insert(table, row) {
    row.id = row.id || uid();
    row.created_at = row.created_at || new Date().toISOString();
    if (this.mode === 'supabase' && window.supabaseClient) {
      try {
        const { data, error } = await window.supabaseClient
          .from(table)
          .insert({ ...row, user_id: this.user.id })
          .select();
        if (error) throw error;
        return data[0];
      } catch (error) {
        this.mode = 'local';
      }
    }
    const all = this._loadLocal();
    if (!all[table]) all[table] = [];
    all[table].unshift(row);
    this._saveLocal(all);
    return row;
  },

  async update(table, id, patch) {
    if (this.mode === 'supabase' && window.supabaseClient) {
      try {
        const { data, error } = await window.supabaseClient
          .from(table)
          .update(patch)
          .eq('id', id)
          .select();
        if (error) throw error;
        return data[0];
      } catch (error) {
        this.mode = 'local';
      }
    }
    const all = this._loadLocal();
    (all[table] || []).forEach((row) => {
      if (row.id === id) Object.assign(row, patch);
    });
    this._saveLocal(all);
    const updated = (all[table] || []).find((row) => row.id === id);
    return updated;
  },

  async remove(table, id) {
    if (this.mode === 'supabase' && window.supabaseClient) {
      try {
        const { error } = await window.supabaseClient.from(table).delete().eq('id', id);
        if (error) throw error;
        return;
      } catch (error) {
        this.mode = 'local';
      }
    }
    const all = this._loadLocal();
    all[table] = (all[table] || []).filter((row) => row.id !== id);
    this._saveLocal(all);
  },
};

async function ensureSystemSession() {
  if (!window.calAdvocSupabase || !window.supabaseClient || !window.supabaseClient.auth) {
    window.location.href = 'account.html';
    return null;
  }

  const { data } = await window.supabaseClient.auth.getSession();
  const user = data && data.session ? data.session.user : null;

  if (!user) {
    window.location.href = 'account.html';
    return null;
  }

  let profile = null;
  const profileResult = await getCurrentUserProfile();
  if (profileResult.ok && profileResult.data) {
    profile = profileResult.data;
  }

  if (isTrialExpired(profile)) {
    alert('Your free trial has expired. Please upgrade to continue using CalAdvoc.');
    await window.supabaseClient.auth.signOut();
    window.location.href = 'account.html';
    return null;
  }

  return {
    user,
    profile: profile || {
      full_name: (user.user_metadata && user.user_metadata.full_name) || 'User',
      firm_name: (user.user_metadata && user.user_metadata.firm_name) || 'My Firm',
      email: user.email || '',
      account_type: (user.user_metadata && user.user_metadata.account_type) || 'trial',
    },
  };
}

function nextFileNumber(files, practiceArea) {
  const area = PRACTICE_AREAS.find((item) => item.name === practiceArea) || { prefix: 'GEN' };
  const year = new Date().getFullYear();
  const seqs = files
    .filter((f) => f.practice_area === practiceArea && (f.file_number || '').includes('/' + year + '/'))
    .map((f) => parseInt((f.file_number || '').split('/').pop(), 10) || 0);
  const seq = (seqs.length ? Math.max.apply(null, seqs) : 0) + 1;
  return 'OCA/' + area.prefix + '/' + year + '/' + pad(seq, 3);
}

function nextNumber(rows, field, prefix) {
  const seqs = rows.map((row) => parseInt(String(row[field] || '').replace(/[^0-9]/g, ''), 10) || 0);
  return prefix + pad((seqs.length ? Math.max.apply(null, seqs) : 0) + 1, 4);
}

function nextInvoiceNumber(rows) {
  return nextNumber(rows, 'invoice_number', 'INV-');
}

function nextReceiptNo(rows) {
  return nextNumber(rows, 'receipt_no', 'RCP-');
}

async function loadSystemData() {
  TABLES.forEach((table) => {
    SYS.data[table] = [];
  });
  await Store.probe();
  for (const table of TABLES) {
    SYS.data[table] = await Store.list(table);
  }
  const settingsKey = 'calAdvoc.letterhead.' + (SYS.user ? SYS.user.id : 'anon');
  try {
    SYS.settings = JSON.parse(localStorage.getItem(settingsKey) || '{}');
  } catch (error) {
    SYS.settings = {};
  }
}

function saveLetterheadSettings() {
  const settingsKey = 'calAdvoc.letterhead.' + (SYS.user ? SYS.user.id : 'anon');
  localStorage.setItem(settingsKey, JSON.stringify(SYS.settings));
}

function money(amount, currency) {
  const value = Number(amount || 0);
  return (currency || 'KES') + ' ' + value.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function fmtDate(value) {
  if (!value) return '—';
  const date = new Date(String(value).length === 10 ? value + 'T00:00:00' : value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

function clientName(id) {
  const client = SYS.data.clients.find((item) => item.id === id);
  return client ? client.name : '—';
}

function caseLabel(id) {
  const file = SYS.data.case_files.find((item) => item.id === id);
  return file ? file.file_number : '—';
}

function hoursBetween(timeIn, timeOut) {
  if (!timeIn || !timeOut) return null;
  const parts1 = timeIn.split(':').map(Number);
  const parts2 = timeOut.split(':').map(Number);
  const minutes = parts2[0] * 60 + parts2[1] - (parts1[0] * 60 + parts1[1]);
  if (Number.isNaN(minutes) || minutes < 0) return null;
  return Math.round((minutes / 60) * 100) / 100;
}
