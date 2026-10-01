/* CalAdvoc — system shell, case files, client register, court attendance, letterhead */

const SECTION_TITLES = {
  overview: 'Overview',
  cases: 'Case Files',
  clients: 'Client Register',
  court: 'Court Attendance Log',
  income: 'Income',
  expenses: 'Expenses',
  invoices: 'Invoices',
  debtors: 'Debtors',
  creditors: 'Creditors',
  budget: 'Budget Tracker',
  reports: 'Reports',
  settings: 'Firm Settings',
};

const MATTER_TYPES = ['Mention', 'Hearing', 'Ruling', 'Judgment'];
const CURRENCIES = ['KES', 'USD', 'UGX', 'ZAR'];

let currentSection = 'overview';
let toastTimer = null;

function el(id) {
  return document.getElementById(id);
}

function esc(value) {
  return String(value == null ? '' : value).replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[ch]));
}

function mv(id) {
  const node = el(id);
  return node ? String(node.value || '').trim() : '';
}

function mn(id) {
  return Number(mv(id) || 0);
}

function mc(id) {
  const node = el(id);
  return node ? node.checked : false;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function thisMonth() {
  return new Date().toISOString().slice(0, 7);
}

function toast(message) {
  const node = el('sysToast');
  node.textContent = message;
  node.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => node.classList.remove('show'), 2800);
}

async function refreshTable(name) {
  SYS.data[name] = await Store.list(name);
}

function setSection(name) {
  currentSection = name;
  document.querySelectorAll('.sys-section').forEach((node) => node.classList.remove('active'));
  const section = el('sec-' + name);
  if (section) section.classList.add('active');
  document.querySelectorAll('.sys-nav button').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.sec === name);
  });
  el('sysSectionTitle').textContent = SECTION_TITLES[name] || 'CalAdvoc';
  if (name === 'overview') renderOverview();
  if (name === 'cases') renderCases();
  if (name === 'clients') renderClients();
  if (name === 'court') renderCourt();
  if (name === 'income') renderIncome();
  if (name === 'expenses') renderExpenses();
  if (name === 'invoices') renderInvoices();
  if (name === 'debtors') renderDebtors();
  if (name === 'creditors') renderCreditors();
  if (name === 'budget') renderBudget();
  if (name === 'reports') renderReports();
  if (name === 'settings') renderSettings();
}

/* ---------- shared UI helpers ---------- */

function tableHTML(headers, rowsHTML) {
  if (!rowsHTML) {
    return '<div class="sys-empty">Nothing recorded yet.</div>';
  }
  return '<div class="sys-table-wrap"><table class="sys-table"><thead><tr>'
    + headers.map((h) => '<th>' + esc(h) + '</th>').join('')
    + '</tr></thead><tbody>' + rowsHTML + '</tbody></table></div>';
}

function badge(text, tone) {
  return '<span class="sys-badge ' + tone + '">' + esc(text) + '</span>';
}

function metricCard(label, value, sub) {
  return '<article class="metric-card"><small>' + esc(label) + '</small><strong>' + esc(value) + '</strong><span>' + esc(sub || '') + '</span></article>';
}

function openModal(title, bodyHTML, onSubmit) {
  el('modalTitle').textContent = title;
  el('modalBody').innerHTML = bodyHTML;
  el('modalBackdrop').classList.add('open');
  el('modalForm').onsubmit = async (event) => {
    event.preventDefault();
    const done = await onSubmit();
    if (done !== false) closeModal();
  };
}

function closeModal() {
  el('modalBackdrop').classList.remove('open');
  el('modalBody').innerHTML = '';
}

function field(labelText, inputHTML, full) {
  return '<label class="sys-field' + (full ? ' full' : '') + '"><span>' + labelText + '</span>' + inputHTML + '</label>';
}

function clientOptions(selectedId, includeNew) {
  let html = '<option value="">— Select client —</option>';
  SYS.data.clients.forEach((c) => {
    html += '<option value="' + c.id + '"' + (c.id === selectedId ? ' selected' : '') + '>' + esc(c.name) + '</option>';
  });
  if (includeNew) {
    html += '<option value="__new__">＋ New client (auto-registers)</option>';
  }
  return html;
}

function caseOptions(selectedId, emptyLabel) {
  let html = '<option value="">' + esc(emptyLabel || '— Select case file —') + '</option>';
  SYS.data.case_files.forEach((f) => {
    html += '<option value="' + f.id + '"' + (f.id === selectedId ? ' selected' : '') + '>'
      + esc(f.file_number + (f.title ? ' — ' + f.title : '')) + '</option>';
  });
  return html;
}

/* ---------- letterhead / printing ---------- */

function signBlock() {
  const s = SYS.settings || {};
  return '<div class="lh-sign"><div>Yours faithfully,</div>'
    + '<div class="lh-sign-name">' + esc(s.advocate || (SYS.profile && SYS.profile.full_name) || '') + '</div>'
    + '<div>' + esc(s.firm_name || (SYS.profile && SYS.profile.firm_name) || '') + '</div></div>';
}

function letterheadHTML(docTitle, innerHTML) {
  const s = SYS.settings || {};
  const firm = s.firm_name || (SYS.profile && SYS.profile.firm_name) || 'CalAdvoc';
  const contact = [s.address, s.phone, s.email].filter(Boolean).join('  •  ');
  return '<div class="lh">'
    + '<div class="lh-head">'
    + '<div class="geometric-strip"></div>'
    + '<div class="lh-firm">' + esc(firm) + '</div>'
    + (s.tagline ? '<div class="lh-tag">' + esc(s.tagline) + '</div>' : '')
    + (contact ? '<div class="lh-contact">' + esc(contact) + '</div>' : '')
    + '<div class="geometric-strip thin"></div>'
    + '</div>'
    + '<div class="lh-title">' + esc(docTitle) + '</div>'
    + innerHTML
    + '<div class="lh-foot"><div class="geometric-strip thin"></div>'
    + '<div>Generated by ' + esc(firm) + ' via CalAdvoc on ' + fmtDate(today()) + '.</div></div>'
    + '</div>';
}

function printDocument(docTitle, innerHTML) {
  el('printArea').innerHTML = letterheadHTML(docTitle, innerHTML);
  window.print();
}

/* ---------- overview ---------- */

function sumAmounts(rows) {
  return rows.reduce((sum, row) => sum + Number(row.amount || 0), 0);
}

function renderOverview() {
  const month = thisMonth();
  const activeCases = SYS.data.case_files.filter((f) => (f.status || 'Open') !== 'Closed').length;
  const income = sumAmounts(SYS.data.income.filter((r) => (r.date || '').startsWith(month)));
  const expenses = sumAmounts(SYS.data.expenses.filter((r) => (r.date || '').startsWith(month)));
  el('overviewCards').innerHTML =
    metricCard('Active Cases', activeCases, 'Currently open')
    + metricCard('Clients', SYS.data.clients.length, 'On the register')
    + metricCard('Income this month', money(income), fmtDate(month + '-01'))
    + metricCard('Expenses this month', money(expenses), fmtDate(month + '-01'));

  const recent = SYS.data.case_files.slice(0, 6);
  el('overviewRecent').innerHTML = recent.length
    ? tableHTML(['File No.', 'Matter', 'Client', 'Status'], recent.map((f) =>
      '<tr><td>' + esc(f.file_number) + '</td><td>' + esc(f.title || f.practice_area) + '</td><td>'
      + esc(clientName(f.client_id)) + '</td><td>' + badge(f.status || 'Open', (f.status === 'Closed') ? 'muted' : 'open') + '</td></tr>').join(''))
    : '<div class="sys-empty">No case files yet — create your first one under Case Files.</div>';
}

/* ---------- case files ---------- */

function renderCases() {
  const query = (el('caseSearch') ? el('caseSearch').value : '').toLowerCase();
  const files = SYS.data.case_files.filter((f) => !query
    || [f.file_number, f.title, f.practice_area, clientName(f.client_id)].join(' ').toLowerCase().includes(query));
  const rows = files.map((f) => {
    const open = (f.status || 'Open') !== 'Closed';
    return '<tr>'
      + '<td class="strong">' + esc(f.file_number) + '</td>'
      + '<td>' + esc(f.title || '—') + '<div class="sub">' + esc(f.practice_area || '') + '</div></td>'
      + '<td>' + esc(clientName(f.client_id)) + '</td>'
      + '<td>' + esc(f.open_date || '—') + '</td>'
      + '<td>' + esc(f.close_date || '—') + '</td>'
      + '<td>' + esc(f.court_case_number || '—') + '</td>'
      + '<td>' + esc(f.judge || '—') + '</td>'
      + '<td>' + badge(f.status || 'Open', open ? 'open' : 'muted') + (f.outcome ? '<div class="sub">' + esc(f.outcome) + '</div>' : '') + '</td>'
      + '<td class="actions">'
      + '<button type="button" class="sys-btn small" data-court="' + f.id + '">Court Log</button>'
      + (open ? '<button type="button" class="sys-btn small" data-close="' + f.id + '">Close</button>' : '')
      + '<button type="button" class="sys-btn small ghost" data-delcase="' + f.id + '">Delete</button>'
      + '</td></tr>';
  }).join('');
  el('caseFilesTable').innerHTML = tableHTML(
    ['File No.', 'Matter', 'Client', 'Opened', 'Closed', 'Court Case No.', 'Judge', 'Status', ''],
    rows);
  el('caseFilesTable').querySelectorAll('[data-court]').forEach((btn) => {
    btn.addEventListener('click', () => {
      setSection('court');
      el('courtCaseSelect').value = btn.dataset.court;
      renderCourtSessions();
    });
  });
  el('caseFilesTable').querySelectorAll('[data-close]').forEach((btn) => {
    btn.addEventListener('click', () => openCloseCaseModal(btn.dataset.close));
  });
  el('caseFilesTable').querySelectorAll('[data-delcase]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!confirm('Delete this case file?')) return;
      await Store.remove('case_files', btn.dataset.delcase);
      await refreshTable('case_files');
      setSection(currentSection);
      toast('Case file deleted.');
    });
  });
}

function openCaseModal() {
  const areaOptions = PRACTICE_AREAS.map((a) => '<option>' + esc(a.name) + '</option>').join('');
  openModal('New Case File',
    field('Practice Area', '<select id="caseArea" required>' + areaOptions + '</select>')
    + field('Client', '<select id="caseClientId" required>' + clientOptions('', true) + '</select>')
    + '<div id="caseNewClientFields" style="display:none">'
    + field('New Client Name', '<input id="caseClientName" type="text" />', true)
    + field('New Client Phone', '<input id="caseClientPhone" type="tel" />')
    + field('New Client Email', '<input id="caseClientEmail" type="email" />')
    + field('New Client ID No.', '<input id="caseClientIdNumber" type="text" />')
    + field('New Client Address', '<input id="caseClientAddress" type="text" />')
    + field('New Client Company', '<input id="caseClientCompany" type="text" />')
    + '</div>'
    + field('Matter Title', '<input id="caseTitle" type="text" placeholder="e.g. Transfer of Title — LR 209/12345" required />', true)
    + field('Open Date', '<input id="caseOpenDate" type="date" value="' + today() + '" />')
    + field('Court Case Number', '<input id="caseCourtNumber" type="text" placeholder="e.g. ELC/1234/2025" />')
    + field('Judge / Magistrate', '<input id="caseJudge" type="text" />'),
    async () => {
      let clientId = mv('caseClientId');
      if (clientId === '__new__') {
        const name = mv('caseClientName');
        if (!name) {
          alert('Enter the new client name.');
          return false;
        }
        const client = await Store.insert('clients', {
          name,
          phone: mv('caseClientPhone'),
          email: mv('caseClientEmail'),
          id_number: mv('caseClientIdNumber'),
          address: mv('caseClientAddress'),
          company: mv('caseClientCompany'),
        });
        clientId = client.id;
        await refreshTable('clients');
        toast('New client auto-registered: ' + name);
      }
      const practiceArea = mv('caseArea');
      const fileNumber = nextFileNumber(SYS.data.case_files, practiceArea);
      await Store.insert('case_files', {
        file_number: fileNumber,
        practice_area: practiceArea,
        client_id: clientId,
        title: mv('caseTitle'),
        open_date: mv('caseOpenDate') || today(),
        close_date: null,
        status: 'Open',
        outcome: '',
        court_case_number: mv('caseCourtNumber'),
        judge: mv('caseJudge'),
      });
      await refreshTable('case_files');
      setSection(currentSection);
      toast('Case file ' + fileNumber + ' created.');
    });
  el('caseClientId').addEventListener('change', () => {
    el('caseNewClientFields').style.display = el('caseClientId').value === '__new__' ? 'contents' : 'none';
  });
}

function openCloseCaseModal(caseId) {
  const file = SYS.data.case_files.find((f) => f.id === caseId);
  if (!file) return;
  openModal('Close Case — ' + file.file_number,
    field('Close Date', '<input id="caseCloseDate" type="date" value="' + today() + '" />')
    + field('Outcome', '<textarea id="caseOutcome" rows="3" placeholder="e.g. Settled out of court / Judgment entered for plaintiff"></textarea>', true),
    async () => {
      await Store.update('case_files', caseId, {
        status: 'Closed',
        close_date: mv('caseCloseDate') || today(),
        outcome: mv('caseOutcome'),
      });
      await refreshTable('case_files');
      setSection(currentSection);
      toast('Case file closed.');
    });
}

/* ---------- clients ---------- */

function renderClients() {
  const query = (el('clientSearch') ? el('clientSearch').value : '').toLowerCase();
  const clients = SYS.data.clients.filter((c) => !query
    || [c.name, c.phone, c.email, c.id_number, c.company].join(' ').toLowerCase().includes(query));
  const rows = clients.map((c) => {
    const fileCount = SYS.data.case_files.filter((f) => f.client_id === c.id).length;
    return '<tr>'
      + '<td class="strong">' + esc(c.name) + '</td>'
      + '<td>' + esc(c.phone || '—') + '</td>'
      + '<td>' + esc(c.email || '—') + '</td>'
      + '<td>' + esc(c.id_number || '—') + '</td>'
      + '<td>' + esc(c.address || '—') + '</td>'
      + '<td>' + esc(c.company || '—') + '</td>'
      + '<td>' + fileCount + '</td>'
      + '<td class="actions"><button type="button" class="sys-btn small ghost" data-delclient="' + c.id + '">Delete</button></td>'
      + '</tr>';
  }).join('');
  el('clientsTable').innerHTML = tableHTML(
    ['Name', 'Phone', 'Email', 'ID No.', 'Address', 'Company', 'Files', ''],
    rows);
  el('clientsTable').querySelectorAll('[data-delclient]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!confirm('Delete this client?')) return;
      await Store.remove('clients', btn.dataset.delclient);
      await refreshTable('clients');
      setSection(currentSection);
      toast('Client deleted.');
    });
  });
}

function openClientModal() {
  openModal('New Client',
    field('Full Name', '<input id="clientNameInput" type="text" required />', true)
    + field('Phone', '<input id="clientPhone" type="tel" />')
    + field('Email', '<input id="clientEmail" type="email" />')
    + field('ID Number', '<input id="clientIdNumber" type="text" />')
    + field('Company', '<input id="clientCompany" type="text" />')
    + field('Address', '<input id="clientAddress" type="text" />', true),
    async () => {
      const name = mv('clientNameInput');
      if (!name) {
        alert('Client name is required.');
        return false;
      }
      await Store.insert('clients', {
        name,
        phone: mv('clientPhone'),
        email: mv('clientEmail'),
        id_number: mv('clientIdNumber'),
        company: mv('clientCompany'),
        address: mv('clientAddress'),
      });
      await refreshTable('clients');
      setSection(currentSection);
      toast('Client added to the register.');
    });
}

/* ---------- court attendance ---------- */

function selectedCourtCase() {
  return el('courtCaseSelect') ? el('courtCaseSelect').value : '';
}

function fillCourtDatalists() {
  const courts = new Set();
  const judges = new Set();
  SYS.data.court_sessions.forEach((s) => {
    if (s.court_name) courts.add(s.court_name);
    if (s.judge) judges.add(s.judge);
  });
  SYS.data.case_files.forEach((f) => {
    if (f.judge) judges.add(f.judge);
  });
  el('courtNamesList').innerHTML = Array.from(courts).sort().map((v) => '<option value="' + esc(v) + '"></option>').join('');
  el('judgeNamesList').innerHTML = Array.from(judges).sort().map((v) => '<option value="' + esc(v) + '"></option>').join('');
}

function renderCourt() {
  const select = el('courtCaseSelect');
  const previous = select.value;
  select.innerHTML = caseOptions(previous, '— Select case file —');
  if (!previous && SYS.data.case_files.length) {
    select.value = SYS.data.case_files[0].id;
  }
  fillCourtDatalists();
  renderCourtSessions();
}

function renderCourtSessions() {
  const caseId = selectedCourtCase();
  const sessions = SYS.data.court_sessions
    .filter((s) => s.case_id === caseId)
    .sort((a, b) => String(b.session_date || '').localeCompare(String(a.session_date || '')));
  const rows = sessions.map((s) => '<tr>'
    + '<td class="strong">' + esc(s.session_date || '—') + '</td>'
    + '<td>' + esc(s.court_name || '—') + '</td>'
    + '<td>' + esc(s.judge || '—') + '</td>'
    + '<td>' + badge(s.matter_type || '—', 'open') + '</td>'
    + '<td>' + esc((s.time_in || '—') + ' – ' + (s.time_out || '—')) + '</td>'
    + '<td>' + esc(s.hours != null && s.hours !== '' ? s.hours + ' hrs' : '—') + '</td>'
    + '<td>' + esc(s.outcome || '—') + '</td>'
    + '<td class="actions">'
    + '<button type="button" class="sys-btn small" data-letter="' + s.id + '">Client Update</button>'
    + '<button type="button" class="sys-btn small ghost" data-delsession="' + s.id + '">Delete</button>'
    + '</td></tr>').join('');
  el('courtSessionsTable').innerHTML = caseId
    ? tableHTML(['Date', 'Court', 'Judge/Magistrate', 'Matter Type', 'Time In–Out', 'Hours', 'Outcome', ''], rows)
    : '<div class="sys-empty">Select a case file to view its court attendance log.</div>';
  el('courtSessionsTable').querySelectorAll('[data-letter]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const session = SYS.data.court_sessions.find((s) => s.id === btn.dataset.letter);
      if (session) exportSessionLetter(session);
    });
  });
  el('courtSessionsTable').querySelectorAll('[data-delsession]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!confirm('Delete this court session entry?')) return;
      await Store.remove('court_sessions', btn.dataset.delsession);
      await refreshTable('court_sessions');
      renderCourtSessions();
      toast('Session deleted.');
    });
  });
}

function openSessionModal() {
  const caseId = selectedCourtCase();
  if (!caseId) {
    toast('Select a case file first.');
    return;
  }
  openModal('Log Court Session',
    field('Session Date', '<input id="sessionDate" type="date" value="' + today() + '" required />')
    + field('Matter Type', '<select id="sessionMatter">' + MATTER_TYPES.map((t) => '<option>' + t + '</option>').join('') + '</select>')
    + field('Time In', '<input id="sessionTimeIn" type="time" required />')
    + field('Time Out', '<input id="sessionTimeOut" type="time" required />')
    + field('Court Name', '<input id="sessionCourt" type="text" list="courtNamesList" placeholder="Remembered for reuse" />', true)
    + field('Judge / Magistrate', '<input id="sessionJudge" type="text" list="judgeNamesList" placeholder="Remembered for reuse" />', true)
    + field('Outcome', '<input id="sessionOutcome" type="text" placeholder="e.g. Mentioned, hearing on 12/11" />', true)
    + field('Notes', '<textarea id="sessionNotes" rows="2"></textarea>', true),
    async () => {
      const hours = hoursBetween(mv('sessionTimeIn'), mv('sessionTimeOut'));
      await Store.insert('court_sessions', {
        case_id: caseId,
        session_date: mv('sessionDate') || today(),
        time_in: mv('sessionTimeIn'),
        time_out: mv('sessionTimeOut'),
        hours,
        court_name: mv('sessionCourt'),
        judge: mv('sessionJudge'),
        matter_type: mv('sessionMatter'),
        outcome: mv('sessionOutcome'),
        notes: mv('sessionNotes'),
      });
      await refreshTable('court_sessions');
      fillCourtDatalists();
      renderCourtSessions();
      toast('Court session saved.');
    });
}

function exportSessionLetter(session) {
  const file = SYS.data.case_files.find((f) => f.id === session.case_id);
  const client = file ? SYS.data.clients.find((c) => c.id === file.client_id) : null;
  const rows = [
    ['Case file', (file ? file.file_number : '—') + (file && file.title ? ' — ' + file.title : '')],
    ['Date of session', fmtDate(session.session_date)],
    ['Court', session.court_name],
    ['Judge / Magistrate', session.judge],
    ['Matter type', session.matter_type],
    ['Time in court', (session.time_in || '—') + ' to ' + (session.time_out || '—') + (session.hours ? ' (' + session.hours + ' hrs)' : '')],
    ['Outcome', session.outcome],
    ['Notes', session.notes],
  ];
  const inner =
    '<p class="lh-p">' + esc(fmtDate(today())) + '</p>'
    + '<p class="lh-p">Dear ' + esc(client ? client.name : 'Client') + ',</p>'
    + '<p class="lh-p"><strong>RE: ' + esc(file && file.title ? file.title : 'Legal matter')
    + ' — File No. ' + esc(file ? file.file_number : '') + '</strong></p>'
    + '<p class="lh-p">We write to update you on the proceedings in your matter as follows:</p>'
    + '<table class="lh-table">'
    + rows.map((r) => '<tr><th>' + esc(r[0]) + '</th><td>' + esc(r[1] || '—') + '</td></tr>').join('')
    + '</table>'
    + '<p class="lh-p">We shall continue to keep you informed at every step of this matter. Kindly contact our offices should you require any clarification.</p>'
    + signBlock();
  printDocument('CLIENT UPDATE — ' + (file ? file.file_number : ''), inner);
}

function exportCourtLog() {
  const caseId = selectedCourtCase();
  if (!caseId) {
    toast('Select a case file first.');
    return;
  }
  const file = SYS.data.case_files.find((f) => f.id === caseId);
  const client = file ? SYS.data.clients.find((c) => c.id === file.client_id) : null;
  const sessions = SYS.data.court_sessions
    .filter((s) => s.case_id === caseId)
    .sort((a, b) => String(a.session_date || '').localeCompare(String(b.session_date || '')));
  const inner =
    '<p class="lh-p">' + esc(fmtDate(today())) + '</p>'
    + '<p class="lh-p"><strong>RE: ' + esc(file && file.title ? file.title : 'Legal matter')
    + ' — File No. ' + esc(file ? file.file_number : '')
    + (client ? ' — Client: ' + client.name : '') + '</strong></p>'
    + '<p class="lh-p">Below is the complete record of court attendance for this matter:</p>'
    + (sessions.length
      ? '<table class="lh-table"><thead><tr><th>Date</th><th>Court</th><th>Judge</th><th>Matter</th><th>Time</th><th>Hrs</th><th>Outcome</th></tr></thead><tbody>'
        + sessions.map((s) => '<tr><td>' + esc(s.session_date || '—') + '</td><td>' + esc(s.court_name || '—') + '</td><td>'
          + esc(s.judge || '—') + '</td><td>' + esc(s.matter_type || '—') + '</td><td>'
          + esc((s.time_in || '—') + '–' + (s.time_out || '—')) + '</td><td>' + esc(s.hours != null ? s.hours : '—') + '</td><td>'
          + esc(s.outcome || '—') + '</td></tr>').join('')
        + '</tbody></table>'
      : '<p class="lh-p">No sessions recorded for this matter yet.</p>')
    + '<p class="lh-p">Total time in court: <strong>'
    + esc(sessions.reduce((sum, s) => sum + Number(s.hours || 0), 0)) + ' hours</strong>.</p>'
    + signBlock();
  printDocument('COURT ATTENDANCE LOG — ' + (file ? file.file_number : ''), inner);
}

/* ---------- settings ---------- */

function renderSettings() {
  const s = SYS.settings || {};
  el('settingsFirmName').value = s.firm_name || (SYS.profile && SYS.profile.firm_name) || '';
  el('settingsTagline').value = s.tagline || '';
  el('settingsPhone').value = s.phone || '';
  el('settingsEmail').value = s.email || (SYS.profile && SYS.profile.email) || '';
  el('settingsAddress').value = s.address || '';
  el('settingsAdvocate').value = s.advocate || (SYS.profile && SYS.profile.full_name) || '';
}

/* ---------- boot ---------- */

function bindSystemShell() {
  document.querySelectorAll('.sys-nav button').forEach((btn) => {
    btn.addEventListener('click', () => setSection(btn.dataset.sec));
  });
  el('btnNewCase').addEventListener('click', openCaseModal);
  el('caseSearch').addEventListener('input', renderCases);
  el('btnNewClient').addEventListener('click', openClientModal);
  el('clientSearch').addEventListener('input', renderClients);
  el('courtCaseSelect').addEventListener('change', renderCourtSessions);
  el('btnLogSession').addEventListener('click', openSessionModal);
  el('btnExportLog').addEventListener('click', exportCourtLog);
  el('modalCancel').addEventListener('click', closeModal);
  el('modalBackdrop').addEventListener('click', (event) => {
    if (event.target === el('modalBackdrop')) closeModal();
  });
  el('settingsForm').addEventListener('submit', (event) => {
    event.preventDefault();
    SYS.settings = {
      firm_name: mv('settingsFirmName'),
      tagline: mv('settingsTagline'),
      phone: mv('settingsPhone'),
      email: mv('settingsEmail'),
      address: mv('settingsAddress'),
      advocate: mv('settingsAdvocate'),
    };
    saveLetterheadSettings();
    el('sysFirmName').textContent = SYS.settings.firm_name || 'CalAdvoc';
    toast('Letterhead settings saved.');
  });
  el('sysSignOut').addEventListener('click', async () => {
    if (window.supabaseClient) await window.supabaseClient.auth.signOut();
    window.location.href = 'account.html';
  });
}

window.addEventListener('DOMContentLoaded', async () => {
  const session = await ensureSystemSession();
  if (!session) return;

  SYS.user = session.user;
  SYS.profile = session.profile;
  Store.user = session.user;

  await loadSystemData();

  el('sysFirmName').textContent = SYS.settings.firm_name || SYS.profile.firm_name || 'CalAdvoc';
  el('sysUserName').textContent = SYS.profile.full_name || 'User';
  el('sysStorageBadge').textContent = Store.mode === 'supabase'
    ? 'Saved to cloud (Supabase)'
    : 'Saved on this device';
  el('budgetMonth').value = thisMonth();
  el('reportMonth').value = thisMonth();

  bindSystemShell();
  renderOverview();
});
