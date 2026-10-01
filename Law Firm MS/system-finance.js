/* CalAdvoc — income, expenses, invoices, debtors, creditors, budget, reports */

/* ---------- income ---------- */

function renderIncome() {
  const rows = SYS.data.income
    .slice()
    .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
  const html = rows.map((r) => '<tr>'
    + '<td>' + esc(r.date || '—') + '</td>'
    + '<td class="strong">' + esc(r.receipt_no || '—') + '</td>'
    + '<td>' + esc(money(r.amount, r.currency)) + '</td>'
    + '<td>' + esc(r.source || '—') + '</td>'
    + '<td>' + esc(clientName(r.client_id)) + '</td>'
    + '<td>' + esc(caseLabel(r.case_id)) + '</td>'
    + '<td>' + esc(r.reference || '—') + '</td>'
    + '<td>' + (r.is_credit ? badge('Credit', 'credit') : '') + '</td>'
    + '<td class="actions">'
    + '<button type="button" class="sys-btn small" data-receipt="' + r.id + '">Receipt</button>'
    + '<button type="button" class="sys-btn small ghost" data-delincome="' + r.id + '">Delete</button>'
    + '</td></tr>').join('');
  el('incomeTable').innerHTML = tableHTML(
    ['Date', 'Receipt', 'Amount', 'Source', 'Client', 'Case File', 'Reference', '', ''], html);
  el('incomeTable').querySelectorAll('[data-receipt]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const row = SYS.data.income.find((r) => r.id === btn.dataset.receipt);
      if (row) printReceipt(row);
    });
  });
  el('incomeTable').querySelectorAll('[data-delincome]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!confirm('Delete this income entry?')) return;
      await Store.remove('income', btn.dataset.delincome);
      await refreshTable('income');
      setSection(currentSection);
      toast('Income entry deleted.');
    });
  });
}

function openIncomeModal() {
  openModal('Record Income',
    field('Date', '<input id="incomeDate" type="date" value="' + today() + '" required />')
    + field('Currency', '<select id="incomeCurrency">' + CURRENCIES.map((c) => '<option>' + c + '</option>').join('') + '</select>')
    + field('Amount', '<input id="incomeAmount" type="number" min="0" step="0.01" required />')
    + field('Source', '<input id="incomeSource" type="text" placeholder="e.g. Legal fees, Filing refund" required />', true)
    + field('Client', '<select id="incomeClientId"><option value="">— None —</option>' + SYS.data.clients.map((c) => '<option value="' + c.id + '">' + esc(c.name) + '</option>').join('') + '</select>')
    + field('Case File', '<select id="incomeCaseId"><option value="">— None —</option>' + SYS.data.case_files.map((f) => '<option value="' + f.id + '">' + esc(f.file_number) + '</option>').join('') + '</select>')
    + field('Reference', '<input id="incomeReference" type="text" />')
    + '<label class="sys-field full check"><input id="incomeIsCredit" type="checkbox" /><span>Mark as credit (appears in the Creditors List)</span></label>',
    async () => {
      const amount = mn('incomeAmount');
      if (!amount) {
        alert('Enter an amount.');
        return false;
      }
      await Store.insert('income', {
        date: mv('incomeDate') || today(),
        currency: mv('incomeCurrency'),
        amount,
        source: mv('incomeSource'),
        client_id: mv('incomeClientId') || null,
        case_id: mv('incomeCaseId') || null,
        reference: mv('incomeReference'),
        is_credit: mc('incomeIsCredit'),
        receipt_no: nextReceiptNo(SYS.data.income),
      });
      await refreshTable('income');
      setSection(currentSection);
      toast('Income recorded.');
    });
}

function printReceipt(incomeRow) {
  const inner =
    '<p class="lh-p">Receipt No: <strong>' + esc(incomeRow.receipt_no || '—') + '</strong></p>'
    + '<table class="lh-table">'
    + '<tr><th>Date</th><td>' + esc(fmtDate(incomeRow.date)) + '</td></tr>'
    + '<tr><th>Received from</th><td>' + esc(clientName(incomeRow.client_id)) + '</td></tr>'
    + '<tr><th>Amount</th><td><strong>' + esc(money(incomeRow.amount, incomeRow.currency)) + '</strong></td></tr>'
    + '<tr><th>Being</th><td>' + esc(incomeRow.source || 'Payment on account') + '</td></tr>'
    + (incomeRow.case_id ? '<tr><th>Case file</th><td>' + esc(caseLabel(incomeRow.case_id)) + '</td></tr>' : '')
    + (incomeRow.reference ? '<tr><th>Reference</th><td>' + esc(incomeRow.reference) + '</td></tr>' : '')
    + '</table>'
    + '<p class="lh-p">Thank you for your payment.</p>'
    + signBlock();
  printDocument('OFFICIAL RECEIPT — ' + (incomeRow.receipt_no || ''), inner);
}

/* ---------- expenses ---------- */

function renderExpenses() {
  const rows = SYS.data.expenses
    .slice()
    .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
  const html = rows.map((r) => {
    const remaining = Math.max(0, Number(r.amount || 0) - Number(r.paid_amount || 0));
    return '<tr>'
      + '<td>' + esc(r.date || '—') + '</td>'
      + '<td>' + esc(r.category || '—') + '</td>'
      + '<td>' + esc(r.payee || '—') + '</td>'
      + '<td>' + esc(r.reason || '—') + (r.items ? '<div class="sub">' + esc(r.items) + '</div>' : '') + '</td>'
      + '<td>' + esc(money(r.amount, r.currency)) + '</td>'
      + '<td>' + (r.is_debt ? badge('Debt', 'debt') + '<div class="sub">Paid ' + esc(money(r.paid_amount, r.currency)) + ' · Remaining ' + esc(money(remaining, r.currency)) + '</div>' : '') + '</td>'
      + '<td class="actions">'
      + (r.is_debt && remaining > 0 ? '<button type="button" class="sys-btn small" data-paydebt="' + r.id + '">Record Payment</button>' : '')
      + '<button type="button" class="sys-btn small ghost" data-delexpense="' + r.id + '">Delete</button>'
      + '</td></tr>';
  }).join('');
  el('expensesTable').innerHTML = tableHTML(
    ['Date', 'Category', 'Payee', 'Reason', 'Amount', 'Debt Tracking', ''], html);
  el('expensesTable').querySelectorAll('[data-paydebt]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const row = SYS.data.expenses.find((r) => r.id === btn.dataset.paydebt);
      if (row) openDebtPaymentModal(row);
    });
  });
  el('expensesTable').querySelectorAll('[data-delexpense]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!confirm('Delete this expense?')) return;
      await Store.remove('expenses', btn.dataset.delexpense);
      await refreshTable('expenses');
      setSection(currentSection);
      toast('Expense deleted.');
    });
  });
}

function openExpenseModal() {
  const payees = Array.from(new Set(SYS.data.expenses.map((r) => r.payee).filter(Boolean)))
    .map((p) => '<option value="' + esc(p) + '"></option>').join('');
  const categories = EXPENSE_CATEGORIES.map((c) => '<option value="' + esc(c) + '">' + esc(c) + '</option>').join('');
  openModal('Log Expense',
    field('Date', '<input id="expenseDate" type="date" value="' + today() + '" required />')
    + field('Currency', '<select id="expenseCurrency">' + CURRENCIES.map((c) => '<option>' + c + '</option>').join('') + '</select>')
    + field('Amount', '<input id="expenseAmount" type="number" min="0" step="0.01" required />')
    + field('Category', '<input id="expenseCategory" list="expenseCategoryList" required /><datalist id="expenseCategoryList">' + categories + '</datalist>', true)
    + field('Payee', '<input id="expensePayee" type="text" list="payeeNames" placeholder="Remembered for reuse" /><datalist id="payeeNames">' + payees + '</datalist>', true)
    + field('Reason', '<input id="expenseReason" type="text" />', true)
    + field('Items', '<input id="expenseItems" type="text" placeholder="e.g. 2 reams paper, ink cartridge" />', true)
    + '<label class="sys-field full check"><input id="expenseIsDebt" type="checkbox" /><span>Mark as debt (appears in the Debtors List)</span></label>'
    + '<div id="expenseDebtFields" style="display:none">'
    + field('Amount Already Paid', '<input id="expensePaid" type="number" min="0" step="0.01" value="0" />', true)
    + '</div>',
    async () => {
      const amount = mn('expenseAmount');
      if (!amount) {
        alert('Enter an amount.');
        return false;
      }
      await Store.insert('expenses', {
        date: mv('expenseDate') || today(),
        category: mv('expenseCategory'),
        payee: mv('expensePayee'),
        reason: mv('expenseReason'),
        items: mv('expenseItems'),
        amount,
        currency: mv('expenseCurrency'),
        is_debt: mc('expenseIsDebt'),
        paid_amount: mc('expenseIsDebt') ? mn('expensePaid') : 0,
      });
      await refreshTable('expenses');
      setSection(currentSection);
      toast('Expense recorded.');
    });
  el('expenseIsDebt').addEventListener('change', () => {
    el('expenseDebtFields').style.display = mc('expenseIsDebt') ? 'contents' : 'none';
  });
}

function openDebtPaymentModal(expense) {
  const remaining = Math.max(0, Number(expense.amount || 0) - Number(expense.paid_amount || 0));
  openModal('Record Part Payment — ' + esc(expense.payee || 'Payee'),
    field('Remaining', '<input type="text" value="' + esc(money(remaining, expense.currency)) + '" readonly />')
    + field('Amount Paid Now', '<input id="payAmount" type="number" min="0" max="' + remaining + '" step="0.01" value="' + remaining + '" required />'),
    async () => {
      const amount = mn('payAmount');
      if (amount <= 0) {
        alert('Enter an amount.');
        return false;
      }
      await Store.update('expenses', expense.id, { paid_amount: Number(expense.paid_amount || 0) + amount });
      await refreshTable('expenses');
      setSection(currentSection);
      toast('Payment recorded.');
    });
}

/* ---------- invoices ---------- */

function renderInvoices() {
  const rows = SYS.data.invoices
    .slice()
    .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
  const html = rows.map((r) => '<tr>'
    + '<td class="strong">' + esc(r.invoice_number || '—') + '</td>'
    + '<td>' + esc(r.date || '—') + '</td>'
    + '<td>' + esc(clientName(r.client_id)) + '</td>'
    + '<td>' + esc(caseLabel(r.case_id)) + '</td>'
    + '<td>' + esc(money(r.total)) + '</td>'
    + '<td>' + badge(r.status || 'Unpaid', (r.status === 'Paid') ? 'paid' : 'debt') + '</td>'
    + '<td class="actions">'
    + (r.status !== 'Paid' ? '<button type="button" class="sys-btn small" data-payinvoice="' + r.id + '">Mark as Paid</button>' : '')
    + '<button type="button" class="sys-btn small" data-printinvoice="' + r.id + '">Print</button>'
    + '<button type="button" class="sys-btn small ghost" data-delinvoice="' + r.id + '">Delete</button>'
    + '</td></tr>').join('');
  el('invoicesTable').innerHTML = tableHTML(
    ['Invoice', 'Date', 'Client', 'Case File', 'Total', 'Status', ''], html);
  el('invoicesTable').querySelectorAll('[data-payinvoice]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const row = SYS.data.invoices.find((r) => r.id === btn.dataset.payinvoice);
      if (row) markInvoicePaid(row);
    });
  });
  el('invoicesTable').querySelectorAll('[data-printinvoice]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const row = SYS.data.invoices.find((r) => r.id === btn.dataset.printinvoice);
      if (row) printInvoice(row);
    });
  });
  el('invoicesTable').querySelectorAll('[data-delinvoice]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!confirm('Delete this invoice?')) return;
      await Store.remove('invoices', btn.dataset.delinvoice);
      await refreshTable('invoices');
      setSection(currentSection);
      toast('Invoice deleted.');
    });
  });
}

function invoiceLineRow() {
  return '<div class="inv-line">'
    + '<input class="inv-desc" type="text" placeholder="Description" />'
    + '<input class="inv-qty" type="number" min="0" step="1" value="1" />'
    + '<input class="inv-rate" type="number" min="0" step="0.01" placeholder="Rate" />'
    + '<button type="button" class="inv-remove" onclick="this.parentElement.remove()">×</button>'
    + '</div>';
}

function openInvoiceModal() {
  openModal('New Invoice',
    field('Client', '<select id="invoiceClientId" required>' + clientOptions('', false) + '</select>')
    + field('Case File', '<select id="invoiceCaseId"><option value="">— None —</option>' + SYS.data.case_files.map((f) => '<option value="' + f.id + '">' + esc(f.file_number) + '</option>').join('') + '</select>')
    + field('Date', '<input id="invoiceDate" type="date" value="' + today() + '" />')
    + '<div class="sys-field full"><span>Line Items</span>'
    + '<div id="invLines">' + invoiceLineRow() + '</div>'
    + '<button type="button" id="btnAddLine" class="sys-btn small ghost" style="margin-top:8px">＋ Add Line</button>'
    + '</div>',
    async () => {
      const clientId = mv('invoiceClientId');
      if (!clientId) {
        alert('Select a client.');
        return false;
      }
      const lines = Array.from(document.querySelectorAll('#invLines .inv-line'))
        .map((row) => ({
          description: row.querySelector('.inv-desc').value.trim(),
          qty: Number(row.querySelector('.inv-qty').value || 0),
          rate: Number(row.querySelector('.inv-rate').value || 0),
        }))
        .filter((line) => line.description);
      if (!lines.length) {
        alert('Add at least one line item.');
        return false;
      }
      const total = lines.reduce((sum, line) => sum + line.qty * line.rate, 0);
      const invoiceNumber = nextInvoiceNumber(SYS.data.invoices);
      await Store.insert('invoices', {
        invoice_number: invoiceNumber,
        date: mv('invoiceDate') || today(),
        client_id: clientId,
        case_id: mv('invoiceCaseId') || null,
        lines,
        total,
        status: 'Unpaid',
      });
      await refreshTable('invoices');
      setSection(currentSection);
      toast('Invoice ' + invoiceNumber + ' created.');
    });
  el('btnAddLine').addEventListener('click', () => {
    el('invLines').insertAdjacentHTML('beforeend', invoiceLineRow());
  });
}

async function markInvoicePaid(invoice) {
  if (invoice.status === 'Paid') return;
  const receiptNo = nextReceiptNo(SYS.data.income);
  await Store.insert('income', {
    date: today(),
    currency: 'KES',
    amount: invoice.total,
    source: 'Invoice ' + (invoice.invoice_number || ''),
    client_id: invoice.client_id,
    case_id: invoice.case_id,
    reference: 'Invoice ' + (invoice.invoice_number || ''),
    is_credit: false,
    invoice_id: invoice.id,
    receipt_no: receiptNo,
  });
  await Store.update('invoices', invoice.id, { status: 'Paid' });
  await refreshTable('income');
  await refreshTable('invoices');
  setSection(currentSection);
  toast('Invoice paid — income and receipt created.');
  printReceipt({
    receipt_no: receiptNo,
    date: today(),
    client_id: invoice.client_id,
    amount: invoice.total,
    currency: 'KES',
    source: 'Invoice ' + (invoice.invoice_number || ''),
    case_id: invoice.case_id,
    reference: 'Invoice ' + (invoice.invoice_number || ''),
  });
}

function printInvoice(invoice) {
  const lines = (invoice.lines || []).map((line) => '<tr><td>' + esc(line.description) + '</td><td>'
    + esc(line.qty) + '</td><td>' + esc(money(line.rate)) + '</td><td>' + esc(money(line.qty * line.rate)) + '</td></tr>').join('');
  const inner =
    '<p class="lh-p">Invoice No: <strong>' + esc(invoice.invoice_number || '—') + '</strong></p>'
    + '<p class="lh-p">Date: ' + esc(fmtDate(invoice.date)) + '</p>'
    + '<p class="lh-p">Bill to: <strong>' + esc(clientName(invoice.client_id)) + '</strong>'
    + (invoice.case_id ? ' — Case file ' + esc(caseLabel(invoice.case_id)) : '') + '</p>'
    + '<table class="lh-table"><thead><tr><th>Description</th><th>Qty</th><th>Rate</th><th>Amount</th></tr></thead>'
    + '<tbody>' + (lines || '<tr><td colspan="4">—</td></tr>') + '</tbody>'
    + '<tfoot><tr><th colspan="3">Total</th><td><strong>' + esc(money(invoice.total)) + '</strong></td></tr></tfoot></table>'
    + '<p class="lh-p">Status: ' + esc(invoice.status || 'Unpaid') + '</p>'
    + signBlock();
  printDocument('INVOICE — ' + (invoice.invoice_number || ''), inner);
}

/* ---------- debtors & creditors ---------- */

function renderDebtors() {
  const rows = SYS.data.expenses.filter((r) => r.is_debt);
  const html = rows.map((r) => {
    const remaining = Math.max(0, Number(r.amount || 0) - Number(r.paid_amount || 0));
    return '<tr>'
      + '<td>' + esc(r.date || '—') + '</td>'
      + '<td>' + esc(r.payee || '—') + '</td>'
      + '<td>' + esc(r.reason || r.category || '—') + '</td>'
      + '<td>' + esc(money(r.amount, r.currency)) + '</td>'
      + '<td>' + esc(money(r.paid_amount, r.currency)) + '</td>'
      + '<td class="strong">' + esc(money(remaining, r.currency)) + '</td>'
      + '<td>' + (remaining > 0 ? badge('Outstanding', 'debt') : badge('Settled', 'paid')) + '</td>'
      + '<td class="actions">'
      + (remaining > 0 ? '<button type="button" class="sys-btn small" data-paydebt2="' + r.id + '">Record Payment</button>' : '')
      + '</td></tr>';
  }).join('');
  const total = rows.reduce((sum, r) => sum + Math.max(0, Number(r.amount || 0) - Number(r.paid_amount || 0)), 0);
  el('debtorsTable').innerHTML = '<div class="sys-total-row">Total outstanding: <strong>' + esc(money(total)) + '</strong></div>'
    + tableHTML(['Date', 'Debtor', 'Reason', 'Total', 'Paid', 'Remaining', 'Status', ''], html);
  el('debtorsTable').querySelectorAll('[data-paydebt2]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const row = SYS.data.expenses.find((r) => r.id === btn.dataset.paydebt2);
      if (row) openDebtPaymentModal(row);
    });
  });
}

function renderCreditors() {
  const rows = SYS.data.income.filter((r) => r.is_credit);
  const html = rows.map((r) => '<tr>'
    + '<td>' + esc(r.date || '—') + '</td>'
    + '<td>' + esc(clientName(r.client_id)) + '</td>'
    + '<td>' + esc(r.source || '—') + '</td>'
    + '<td>' + esc(r.reference || '—') + '</td>'
    + '<td class="strong">' + esc(money(r.amount, r.currency)) + '</td>'
    + '<td class="actions"><button type="button" class="sys-btn small" data-creditreceipt="' + r.id + '">Receipt</button></td>'
    + '</tr>').join('');
  const total = rows.reduce((sum, r) => sum + Number(r.amount || 0), 0);
  el('creditorsTable').innerHTML = '<div class="sys-total-row">Total credits: <strong>' + esc(money(total)) + '</strong></div>'
    + tableHTML(['Date', 'Creditor', 'Source', 'Reference', 'Amount', ''], html);
  el('creditorsTable').querySelectorAll('[data-creditreceipt]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const row = SYS.data.income.find((r) => r.id === btn.dataset.creditreceipt);
      if (row) printReceipt(row);
    });
  });
}

/* ---------- budget tracker ---------- */

function spentFor(month, category) {
  return sumAmounts(SYS.data.expenses.filter((r) => (r.date || '').startsWith(month) && r.category === category));
}

function renderBudget() {
  const month = el('budgetMonth').value || thisMonth();
  const budgets = SYS.data.budgets.filter((b) => b.month === month);
  const html = budgets.map((b) => {
    const spent = spentFor(month, b.category);
    const pct = Number(b.amount) > 0 ? Math.min(100, Math.round((spent / Number(b.amount)) * 100)) : 0;
    const tone = pct >= 100 ? 'over' : pct >= 75 ? 'warn' : 'ok';
    return '<tr>'
      + '<td class="strong">' + esc(b.category || '—') + '</td>'
      + '<td>' + esc(money(b.amount)) + '</td>'
      + '<td>' + esc(money(spent)) + '</td>'
      + '<td style="min-width:180px"><div class="sys-progress"><div class="sys-progress-fill ' + tone + '" style="width:' + pct + '%"></div></div><div class="sub">' + pct + '%</div></td>'
      + '<td class="actions"><button type="button" class="sys-btn small ghost" data-delbudget="' + b.id + '">Delete</button></td>'
      + '</tr>';
  }).join('');
  el('budgetTable').innerHTML = tableHTML(['Category', 'Budget', 'Spent', 'Progress', ''], html);
  el('budgetTable').querySelectorAll('[data-delbudget]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!confirm('Delete this budget entry?')) return;
      await Store.remove('budgets', btn.dataset.delbudget);
      await refreshTable('budgets');
      renderBudget();
      toast('Budget entry deleted.');
    });
  });
  drawBudgetChart(month, budgets);
}

function drawBudgetChart(month, budgets) {
  const canvas = el('budgetChart');
  if (!canvas || !budgets.length) {
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
    return;
  }
  const labels = budgets.map((b) => b.category);
  const budgetVals = budgets.map((b) => Number(b.amount || 0));
  const spentVals = budgets.map((b) => spentFor(month, b.category));
  drawBars(canvas, labels, budgetVals, spentVals);
}

function openBudgetModal() {
  const categories = EXPENSE_CATEGORIES.map((c) => '<option>' + esc(c) + '</option>').join('');
  openModal('Set Monthly Budget',
    field('Month', '<input id="budgetMonthInput" type="month" value="' + (el('budgetMonth').value || thisMonth()) + '" required />')
    + field('Category', '<select id="budgetCategory" required>' + categories + '</select>')
    + field('Budget Amount', '<input id="budgetAmount" type="number" min="0" step="0.01" required />'),
    async () => {
      const existing = SYS.data.budgets.find((b) => b.month === mv('budgetMonthInput') && b.category === mv('budgetCategory'));
      if (existing) {
        await Store.update('budgets', existing.id, { amount: mn('budgetAmount') });
      } else {
        await Store.insert('budgets', {
          month: mv('budgetMonthInput'),
          category: mv('budgetCategory'),
          amount: mn('budgetAmount'),
        });
      }
      await refreshTable('budgets');
      setSection(currentSection);
      toast('Budget saved.');
    });
}

/* ---------- reports ---------- */

function journalEntries() {
  const entries = [];
  SYS.data.income.forEach((r) => {
    entries.push({ date: r.date, detail: (r.source || 'Income') + (r.reference ? ' (' + r.reference + ')' : ''), credit: Number(r.amount || 0), debit: 0 });
  });
  SYS.data.expenses.forEach((r) => {
    entries.push({ date: r.date, detail: (r.category || 'Expense') + (r.payee ? ' — ' + r.payee : ''), credit: 0, debit: Number(r.amount || 0) });
  });
  entries.sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')));
  let balance = 0;
  entries.forEach((entry) => {
    balance += entry.credit - entry.debit;
    entry.balance = balance;
  });
  return entries;
}

function renderReports() {
  const month = el('reportMonth').value || thisMonth();
  const incomeRows = SYS.data.income.filter((r) => (r.date || '').startsWith(month));
  const expenseRows = SYS.data.expenses.filter((r) => (r.date || '').startsWith(month));
  const incomeTotal = sumAmounts(incomeRows);
  const expenseTotal = sumAmounts(expenseRows);
  el('reportSummary').innerHTML =
    metricCard('Income — ' + month, money(incomeTotal), incomeRows.length + ' entries')
    + metricCard('Expenses — ' + month, money(expenseTotal), expenseRows.length + ' entries')
    + metricCard('Net for the month', money(incomeTotal - expenseTotal), incomeTotal >= expenseTotal ? 'Surplus' : 'Deficit');

  const labels = [];
  const incomeVals = [];
  const expenseVals = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - i);
    const m = d.toISOString().slice(0, 7);
    labels.push(d.toLocaleString('en', { month: 'short' }));
    incomeVals.push(sumAmounts(SYS.data.income.filter((r) => (r.date || '').startsWith(m))));
    expenseVals.push(sumAmounts(SYS.data.expenses.filter((r) => (r.date || '').startsWith(m))));
  }
  drawBars(el('trendChart'), labels, incomeVals, expenseVals);

  const entries = journalEntries().slice(-30).reverse();
  el('journalTable').innerHTML = tableHTML(
    ['Date', 'Detail', 'Credit', 'Debit', 'Running Balance'],
    entries.map((e) => '<tr><td>' + esc(e.date || '—') + '</td><td>' + esc(e.detail) + '</td><td>'
      + (e.credit ? esc(money(e.credit)) : '') + '</td><td>' + (e.debit ? esc(money(e.debit)) : '') + '</td><td>'
      + esc(money(e.balance)) + '</td></tr>').join(''));
}

function printMonthlyStatement() {
  const month = el('reportMonth').value || thisMonth();
  const incomeRows = SYS.data.income.filter((r) => (r.date || '').startsWith(month));
  const expenseRows = SYS.data.expenses.filter((r) => (r.date || '').startsWith(month));
  const incomeTotal = sumAmounts(incomeRows);
  const expenseTotal = sumAmounts(expenseRows);
  const inner =
    '<p class="lh-p">Period: <strong>' + esc(month) + '</strong></p>'
    + '<p class="lh-p"><strong>Income</strong></p>'
    + '<table class="lh-table"><thead><tr><th>Date</th><th>Source</th><th>Reference</th><th>Amount</th></tr></thead><tbody>'
    + (incomeRows.map((r) => '<tr><td>' + esc(r.date || '—') + '</td><td>' + esc(r.source || '—') + '</td><td>' + esc(r.reference || '—') + '</td><td>' + esc(money(r.amount, r.currency)) + '</td></tr>').join('')
      || '<tr><td colspan="4">No income recorded.</td></tr>')
    + '<tfoot><tr><th colspan="3">Total income</th><td><strong>' + esc(money(incomeTotal)) + '</strong></td></tr></tfoot></table>'
    + '<p class="lh-p"><strong>Expenses</strong></p>'
    + '<table class="lh-table"><thead><tr><th>Date</th><th>Category</th><th>Payee</th><th>Amount</th></tr></thead><tbody>'
    + (expenseRows.map((r) => '<tr><td>' + esc(r.date || '—') + '</td><td>' + esc(r.category || '—') + '</td><td>' + esc(r.payee || '—') + '</td><td>' + esc(money(r.amount, r.currency)) + '</td></tr>').join('')
      || '<tr><td colspan="4">No expenses recorded.</td></tr>')
    + '<tfoot><tr><th colspan="3">Total expenses</th><td><strong>' + esc(money(expenseTotal)) + '</strong></td></tr></tfoot></table>'
    + '<p class="lh-p">Net result for the period: <strong>' + esc(money(incomeTotal - expenseTotal)) + '</strong></p>'
    + signBlock();
  printDocument('MONTHLY INCOME & EXPENSE STATEMENT — ' + month, inner);
}

function printJournal() {
  const entries = journalEntries();
  const inner =
    '<table class="lh-table"><thead><tr><th>Date</th><th>Detail</th><th>Credit</th><th>Debit</th><th>Balance</th></tr></thead><tbody>'
    + (entries.map((e) => '<tr><td>' + esc(e.date || '—') + '</td><td>' + esc(e.detail) + '</td><td>'
      + (e.credit ? esc(money(e.credit)) : '') + '</td><td>' + (e.debit ? esc(money(e.debit)) : '') + '</td><td>'
      + esc(money(e.balance)) + '</td></tr>').join('')
      || '<tr><td colspan="5">No entries recorded.</td></tr>')
    + '</tbody></table>'
    + signBlock();
  printDocument('JOURNAL OF ENTRIES', inner);
}

function printBalanceSheet() {
  const incomeTotal = sumAmounts(SYS.data.income.filter((r) => !r.is_credit));
  const expenseTotal = sumAmounts(SYS.data.expenses);
  const cash = incomeTotal - expenseTotal;
  const debtors = SYS.data.expenses
    .filter((r) => r.is_debt)
    .reduce((sum, r) => sum + Math.max(0, Number(r.amount || 0) - Number(r.paid_amount || 0)), 0);
  const creditors = sumAmounts(SYS.data.income.filter((r) => r.is_credit));
  const inner =
    '<table class="lh-table">'
    + '<tr><th colspan="2">ASSETS</th></tr>'
    + '<tr><td>Cash at bank (income − expenses)</td><td>' + esc(money(cash)) + '</td></tr>'
    + '<tr><td>Debtors (receivable)</td><td>' + esc(money(debtors)) + '</td></tr>'
    + '<tr><th>Total assets</th><td><strong>' + esc(money(cash + debtors)) + '</strong></td></tr>'
    + '<tr><th colspan="2">LIABILITIES</th></tr>'
    + '<tr><td>Creditors (credit entries)</td><td>' + esc(money(creditors)) + '</td></tr>'
    + '<tr><th>Total liabilities</th><td><strong>' + esc(money(creditors)) + '</strong></td></tr>'
    + '<tr><th>Net position (assets − liabilities)</th><td><strong>' + esc(money(cash + debtors - creditors)) + '</strong></td></tr>'
    + '</table>'
    + signBlock();
  printDocument('BALANCE SHEET — as at ' + fmtDate(today()), inner);
}

/* ---------- charts ---------- */

function shortMoney(value) {
  const n = Number(value || 0);
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(0) + 'K';
  return String(Math.round(n));
}

function drawBars(canvas, labels, aVals, bVals) {
  if (!canvas) return;
  const dpr = window.devicePixelRatio || 1;
  const width = canvas.clientWidth || 600;
  const height = canvas.clientHeight || 240;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, width, height);
  const padTop = 16;
  const padRight = 10;
  const padBottom = 28;
  const padLeft = 52;
  const max = Math.max(1, Math.max.apply(null, aVals.concat(bVals)));
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;
  const groupW = plotW / Math.max(1, labels.length);

  ctx.strokeStyle = 'rgba(123,26,46,.2)';
  ctx.font = '11px Inter, sans-serif';
  ctx.textAlign = 'right';
  for (let i = 0; i <= 4; i++) {
    const y = padTop + plotH - (plotH * i) / 4;
    ctx.beginPath();
    ctx.moveTo(padLeft, y);
    ctx.lineTo(width - padRight, y);
    ctx.stroke();
    ctx.fillStyle = 'rgba(36,16,20,.6)';
    ctx.fillText(shortMoney((max * i) / 4), padLeft - 6, y + 4);
  }

  labels.forEach((label, i) => {
    const x0 = padLeft + groupW * i;
    const barW = Math.min(18, groupW / 3);
    const aH = (Number(aVals[i]) / max) * plotH;
    const bH = (Number(bVals[i]) / max) * plotH;
    ctx.fillStyle = '#B8960C';
    ctx.fillRect(x0 + groupW / 2 - barW - 2, padTop + plotH - aH, barW, aH);
    ctx.fillStyle = '#7B1A2E';
    ctx.fillRect(x0 + groupW / 2 + 2, padTop + plotH - bH, barW, bH);
    ctx.fillStyle = 'rgba(36,16,20,.7)';
    ctx.textAlign = 'center';
    ctx.fillText(label, x0 + groupW / 2, height - 8);
  });
}

/* ---------- finance bindings ---------- */

function bindFinanceControls() {
  el('btnNewIncome').addEventListener('click', openIncomeModal);
  el('btnNewExpense').addEventListener('click', openExpenseModal);
  el('btnNewInvoice').addEventListener('click', openInvoiceModal);
  el('btnSetBudget').addEventListener('click', openBudgetModal);
  el('budgetMonth').addEventListener('change', renderBudget);
  el('reportMonth').addEventListener('change', renderReports);
  el('btnPrintStatement').addEventListener('click', printMonthlyStatement);
  el('btnPrintJournal').addEventListener('click', printJournal);
  el('btnPrintBalance').addEventListener('click', printBalanceSheet);
}
