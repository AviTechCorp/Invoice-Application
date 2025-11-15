document.addEventListener('DOMContentLoaded', () => {
    // --- STATE MANAGEMENT ---
    const state = {
        currency: 'USD',
        companyInfo: { name: '', address: '', city: '', phone: '', email: '' },
        clientInfo: { name: '', address: '', city: '', email: '' },
        invoiceDetails: { number: '', date: new Date().toISOString().split('T')[0], dueDate: '' },
        items: [],
        notes: '',
        paymentDetails: { bankName: '', accountHolder: '', accountNumber: '', reference: '' },
        vatRate: 0
    };

    const currencies = [
        { code: 'ZAR', symbol: 'R', name: 'South African Rand' },
        { code: 'USD', symbol: '$', name: 'US Dollar' },
        { code: 'EUR', symbol: '€', name: 'Euro' },
        { code: 'GBP', symbol: '£', name: 'British Pound' },
        { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
        { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
        { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
        { code: 'CHF', symbol: 'Fr', name: 'Swiss Franc' },
        { code: 'CNY', symbol: '¥', name: 'Chinese Yuan' },
        { code: 'INR', symbol: '₹', name: 'Indian Rupee' }
    ];

    // --- DOM ELEMENT REFERENCES ---
    const currencySelect = document.getElementById('currency');
    const itemsTbody = document.getElementById('items-tbody');
    const addItemBtn = document.getElementById('add-item');
    const subtotalAmountEl = document.getElementById('subtotal-amount');
    const vatAmountEl = document.getElementById('vat-amount');
    const totalAmountEl = document.getElementById('total-amount');
    const currencySymbolEls = document.querySelectorAll('.currency-symbol');
    const downloadHtmlBtn = document.getElementById('download-html');
    const savePdfBtn = document.getElementById('save-pdf');

    // --- UTILITY FUNCTIONS ---
    const getCurrencySymbol = () => currencies.find(c => c.code === state.currency)?.symbol || '$';

    // --- RENDER FUNCTIONS ---
    const renderItems = () => {
        itemsTbody.innerHTML = ''; // Clear existing items
        if (state.items.length === 0) {
            addItem(); // Ensure there's always at least one item
            return;
        }

        state.items.forEach((item, index) => {
            const template = document.getElementById('item-row-template');
            const clone = template.content.cloneNode(true);
            const tr = clone.querySelector('tr');
            tr.dataset.index = index;

            tr.querySelector('.item-description').value = item.description;
            tr.querySelector('.item-quantity').value = item.quantity;
            tr.querySelector('.item-rate').value = item.rate;
            
            const amount = item.quantity * item.rate;
            tr.querySelector('.item-amount').textContent = `${getCurrencySymbol()}${amount.toFixed(2)}`;

            itemsTbody.appendChild(tr);
        });
        
        // Hide remove button if only one item
        const removeButtons = itemsTbody.querySelectorAll('.remove-item');
        removeButtons.forEach(btn => btn.style.display = state.items.length > 1 ? '' : 'none');

        lucide.createIcons(); // Re-render icons
        renderSummary();
    };

    const renderSummary = () => {
        const subtotal = state.items.reduce((sum, item) => sum + (item.quantity * item.rate), 0);
        const vatAmount = subtotal * (state.vatRate / 100);
        const total = subtotal + vatAmount;
        const symbol = getCurrencySymbol();

        subtotalAmountEl.textContent = `${symbol}${subtotal.toFixed(2)}`;
        vatAmountEl.textContent = `${symbol}${vatAmount.toFixed(2)}`;
        totalAmountEl.textContent = `${symbol}${total.toFixed(2)}`;
    };

    const updateCurrencySymbols = () => {
        const symbol = getCurrencySymbol();
        currencySymbolEls.forEach(el => el.textContent = symbol);
        renderItems(); // Re-render items to update amounts
    };

    // --- EVENT HANDLERS ---
    const addItem = () => {
        state.items.push({ description: '', quantity: 1, rate: 0 });
        renderItems();
    };

    const handleStateChange = (e) => {
        const keyPath = e.target.dataset.state;
        if (!keyPath) return;

        const keys = keyPath.split('.');
        let currentState = state;
        for (let i = 0; i < keys.length - 1; i++) {
            currentState = currentState[keys[i]];
        }
        currentState[keys[keys.length - 1]] = e.target.value;
    };

    const handleItemUpdate = (e) => {
        const tr = e.target.closest('tr');
        if (!tr) return;

        const index = parseInt(tr.dataset.index, 10);
        const item = state.items[index];

        if (e.target.classList.contains('item-description')) {
            item.description = e.target.value;
        } else if (e.target.classList.contains('item-quantity')) {
            item.quantity = parseFloat(e.target.value) || 0;
        } else if (e.target.classList.contains('item-rate')) {
            item.rate = parseFloat(e.target.value) || 0;
        }
        
        const amount = item.quantity * item.rate;
        tr.querySelector('.item-amount').textContent = `${getCurrencySymbol()}${amount.toFixed(2)}`;
        renderSummary();
    };

    const handleItemRemove = (e) => {
        const removeBtn = e.target.closest('.remove-item');
        if (!removeBtn) return;

        const tr = removeBtn.closest('tr');
        const index = parseInt(tr.dataset.index, 10);
        
        state.items.splice(index, 1);
        renderItems();
    };
    
    // --- INITIALIZATION ---
    const init = () => {
        // Populate currency dropdown
        currencies.forEach(c => {
            const option = document.createElement('option');
            option.value = c.code;
            option.textContent = `${c.code} (${c.symbol}) - ${c.name}`;
            currencySelect.appendChild(option);
        });
        currencySelect.value = state.currency;

        // Set initial date
        document.getElementById('invoice-date').value = state.invoiceDetails.date;

        // Add event listeners
        addItemBtn.addEventListener('click', addItem);
        itemsTbody.addEventListener('input', handleItemUpdate);
        itemsTbody.addEventListener('click', handleItemRemove);
        document.querySelector('.invoiceContainer').addEventListener('input', handleStateChange);
        
        currencySelect.addEventListener('change', (e) => {
            state.currency = e.target.value;
            updateCurrencySymbols();
        });

        downloadHtmlBtn.addEventListener('click', downloadInvoice);
        savePdfBtn.addEventListener('click', downloadAsPDF);

        // Initial render
        renderItems();
        lucide.createIcons();
    };

    // --- DOWNLOAD/PRINT LOGIC (Adapted from React version) ---
    const generateInvoiceHTML = () => {
        const subtotal = state.items.reduce((sum, item) => sum + (item.quantity * item.rate), 0);
        const vatAmount = subtotal * (state.vatRate / 100);
        const total = subtotal + vatAmount;
        const symbol = getCurrencySymbol();
        return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 40px auto; padding: 20px; color: #333; }
        .header { display: flex; justify-content: space-between; margin-bottom: 40px; }
        .company-info, .client-info { margin-bottom: 30px; }
        .invoice-title { font-size: 32px; font-weight: bold; color: #2563eb; margin-bottom: 20px; }
        .details { display: flex; gap: 40px; margin-bottom: 30px; }
        .detail-item { margin-bottom: 8px; }
        .label { font-weight: bold; }
        .currency-badge { display: inline-block; background: #2563eb; color: white; padding: 4px 12px; border-radius: 4px; font-size: 14px; margin-left: 10px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
        th { background: #f3f4f6; padding: 12px; text-align: left; border-bottom: 2px solid #ddd; }
        td { padding: 12px; border-bottom: 1px solid #eee; }
        .total-row { font-weight: bold; font-size: 18px; background: #f9fafb; }
        .notes { margin-top: 30px; padding: 15px; background: #f9fafb; border-left: 4px solid #2563eb; }
        .summary-table { width: 40%; margin-left: auto; margin-top: 20px; }
        .summary-table td { text-align: right; }
      </style>
    </head>
    <body>
      <div class="invoice-title">INVOICE <span class="currency-badge">${state.currency}</span></div>
      <div class="header">
        <div class="company-info">
          <h2>${state.companyInfo.name || 'Your Company Name'}</h2>
          <p>${state.companyInfo.address || ''}</p>
          <p>${state.companyInfo.city || ''}</p>
          <p>${state.companyInfo.phone || ''}</p>
          <p>${state.companyInfo.email || ''}</p>
        </div>
        <div class="details">
          <div>
            <div class="detail-item"><span class="label">Invoice #:</span> ${state.invoiceDetails.number || 'N/A'}</div>
            <div class="detail-item"><span class="label">Date:</span> ${state.invoiceDetails.date || ''}</div>
            <div class="detail-item"><span class="label">Due Date:</span> ${state.invoiceDetails.dueDate || ''}</div>
          </div>
        </div>
      </div>
      <div class="client-info">
        <h3>Bill To:</h3>
        <p><strong>${state.clientInfo.name || 'Client Name'}</strong></p>
        <p>${state.clientInfo.address || ''}</p>
        <p>${state.clientInfo.city || ''}</p>
        <p>${state.clientInfo.email || ''}</p>
      </div>
      <table>
        <thead>
          <tr>
            <th>Description</th>
            <th style="text-align: right;">Quantity</th>
            <th style="text-align: right;">Rate</th>
            <th style="text-align: right;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${state.items.map(item => `
            <tr>
              <td>${item.description || ''}</td>
              <td style="text-align: right;">${item.quantity}</td>
              <td style="text-align: right;">${symbol}${item.rate.toFixed(2)}</td>
              <td style="text-align: right;">${symbol}${(item.quantity * item.rate).toFixed(2)}</td>
            </tr>
          `).join('')}
          <tr class="total-row">
            <td colspan="3" style="text-align: right;">Subtotal:</td>
            <td style="text-align: right;">${symbol}${subtotal.toFixed(2)}</td>
          </tr>
          <tr>
            <td colspan="3" style="text-align: right;">VAT (${state.vatRate}%):</td>
            <td style="text-align: right;">${symbol}${vatAmount.toFixed(2)}</td>
          </tr>
          <tr class="total-row">
            <td colspan="3" style="text-align: right;">Total Due:</td>
            <td style="text-align: right;">${symbol}${total.toFixed(2)}</td>
          </tr>
        </tbody>
      </table>
      
      ${state.paymentDetails.bankName ? `
        <div class="notes">
            <strong>Payment Details:</strong><br>
            Bank: ${state.paymentDetails.bankName}<br>
            Account Holder: ${state.paymentDetails.accountHolder}<br>
            Account Number: ${state.paymentDetails.accountNumber}<br>
            Reference: ${state.paymentDetails.reference}
        </div>
      ` : ''}

      ${state.notes ? `<div class="notes" style="margin-top: 20px;"><strong>Notes:</strong><br>${state.notes.replace(/\n/g, '<br>')}</div>` : ''}
      <p style="text-align: center; margin-top: 40px;">Thank you for your business! 😊</p>
    </body>
    </html>`;
    };

    const downloadInvoice = () => {
        const invoiceContent = generateInvoiceHTML();
        const blob = new Blob([invoiceContent], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `invoice-${state.invoiceDetails.number || 'draft'}.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const downloadAsPDF = () => {
        const invoiceContent = generateInvoiceHTML();
        const printWindow = window.open('', '_blank');
        printWindow.document.write(invoiceContent);
        printWindow.document.close();
        
        printWindow.onload = () => {
            printWindow.focus();
            setTimeout(() => {
                printWindow.print();
            }, 250);
        };
    };

    // Run the app
    init();
});
