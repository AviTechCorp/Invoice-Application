document.addEventListener('DOMContentLoaded', () => {
    // --- AUTHENTICATION & PAGE PROTECTION ---
    firebase.initializeApp(firebaseConfig);
    const auth = firebase.auth();
    const db = firebase.firestore();

    let currentUser = null;

    auth.onAuthStateChanged(user => {
        if (!user) {
            // If no user is logged in, redirect to the auth page
            console.log("No user found, redirecting to auth page.");
            window.location.href = 'auth.html';
        } else {
            currentUser = user;
            document.getElementById('user-email-display').textContent = currentUser.email;
            init(); // Initialize the app now that we have a user
        }
    });

    // --- VIEW MANAGEMENT ---
    const dashboardView = document.getElementById('dashboard-view');
    const createInvoiceView = document.getElementById('create-invoice-view');
    const pastInvoicesView = document.getElementById('past-invoices-view');

    // --- STATE MANAGEMENT ---
    const state = {
        currency: 'USD',
        theme: 'modern',
        companyInfo: { name: '', address: '', city: '', phone: '', email: '' },
        clientInfo: { name: '', address: '', city: '', email: '' },
        invoiceDetails: { number: '', date: new Date().toISOString().split('T')[0], dueDate: '' },
        items: [],
        notes: 'Thank you for your business!',
        terms: 'Payment is due within 30 days of invoice date. Late payments may incur a fee.',
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
    const themeSelect = document.getElementById('theme');
    const itemsTbody = document.getElementById('items-tbody');
    const addItemBtn = document.getElementById('add-item');
    const subtotalAmountEl = document.getElementById('subtotal-amount');
    const vatAmountEl = document.getElementById('vat-amount');
    const totalAmountEl = document.getElementById('total-amount');
    const currencySymbolEls = document.querySelectorAll('.currency-symbol');
    const downloadHtmlBtn = document.getElementById('download-html');
    const savePdfBtn = document.getElementById('save-pdf');
    const logoutBtn = document.getElementById('logout-btn');

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
        themeSelect.value = state.theme;

        // Set initial date
        document.getElementById('invoice-date').value = state.invoiceDetails.date;
        // Set initial text areas
        document.getElementById('notes').value = state.notes;
        document.getElementById('terms').value = state.terms;

        // Add event listeners
        addItemBtn.addEventListener('click', addItem);
        itemsTbody.addEventListener('input', handleItemUpdate);
        itemsTbody.addEventListener('click', handleItemRemove);
        document.querySelector('.invoiceContainer').addEventListener('input', handleStateChange);
        
        currencySelect.addEventListener('change', (e) => {
            state.currency = e.target.value;
            updateCurrencySymbols();
        });

        themeSelect.addEventListener('change', (e) => {
            state.theme = e.target.value;
            document.body.dataset.theme = state.theme;
        });

        downloadHtmlBtn.addEventListener('click', downloadInvoice);
        savePdfBtn.addEventListener('click', downloadAsPDF);
        logoutBtn.addEventListener('click', () => {
            auth.signOut().then(() => {
                console.log('User signed out.');
            });
        });

        // Initial render
        renderItems();
        lucide.createIcons();
    };

    const populateFormFromState = () => {
        // Populate all form fields from the state object
        document.querySelectorAll('[data-state]').forEach(el => {
            const keyPath = el.dataset.state;
            const keys = keyPath.split('.');
            let value = state;
            for (const key of keys) {
                value = value[key];
            }
            el.value = value;
        });

        // Re-render items and summary
        renderItems();
        updateCurrencySymbols();
    };

    const showView = (viewToShow) => {
        dashboardView.style.display = 'none';
        createInvoiceView.style.display = 'none';
        pastInvoicesView.style.display = 'none';
        viewToShow.style.display = 'block';
    };

    // --- Navigation Event Listeners ---
    document.getElementById('nav-create-invoice').addEventListener('click', (e) => {
        e.preventDefault();
        showView(createInvoiceView);
    });
    document.getElementById('back-to-dashboard-1').addEventListener('click', (e) => {
        e.preventDefault();
        showView(dashboardView);
    });
    document.getElementById('nav-past-invoices').addEventListener('click', (e) => {
        e.preventDefault();
        fetchAndDisplayInvoices();
    });
    document.getElementById('back-to-dashboard-2').addEventListener('click', (e) => {
        e.preventDefault();
        showView(dashboardView);
    });

    // --- DOWNLOAD/PRINT LOGIC (Adapted from React version) ---
    const generateInvoiceHTML = () => {
        const subtotal = state.items.reduce((sum, item) => sum + (item.quantity * item.rate), 0);
        const vatAmount = subtotal * (state.vatRate / 100);
        const total = subtotal + vatAmount;
        const symbol = getCurrencySymbol();

        // Format dates for display
        const formatDate = (dateString) => {
            if (!dateString) return 'N/A';
            const date = new Date(dateString);
            return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
        };

        return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Invoice ${state.invoiceDetails.number || ''}</title>
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700&display=swap');
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { font-family: 'Inter', 'Segoe UI', sans-serif; background-color: #f9fafb; padding: 20px; line-height: 1.6; font-size: 14px; color: #374151; }
            .invoice-container { max-width: 800px; margin: 20px auto; background: white; border: 1px solid #e5e7eb; border-radius: 8px; }
            .invoice-header { padding: 40px; display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 1px solid #e5e7eb; }
            .invoice-title h1 { font-size: 36px; font-weight: 700; color: #111827; margin-bottom: 4px; text-align: right; }
            .invoice-number { color: #6b7280; font-size: 14px; text-align: right; }
            .company-name { font-size: 16px; font-weight: 600; color: #111827; margin-bottom: 4px; }
            .company-details { color: #6b7280; font-size: 14px; }
            .invoice-body { padding: 40px; }
            .invoice-meta { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 40px; }
            .bill-to h3 { color: #111827; font-size: 12px; font-weight: 500; letter-spacing: 0.5px; text-transform: uppercase; margin-bottom: 12px; }
            .client-name { font-size: 16px; font-weight: 600; color: #111827; margin-bottom: 4px; }
            .client-address { color: #6b7280; font-size: 14px; }
            .invoice-dates { text-align: right; }
            .date-row { margin-bottom: 12px; font-size: 14px; }
            .date-label { color: #6b7280; margin-right: 8px; }
            .date-value { font-weight: 500; color: #111827; }
            .invoice-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
            .invoice-table thead { background-color: #f3f4f6; border-bottom: 2px solid #d1d5db; }
            .invoice-table th { padding: 12px; text-align: left; font-size: 12px; font-weight: 600; color: #374151; text-transform: uppercase; letter-spacing: 0.5px; }
            .invoice-table th.text-center { text-align: center; }
            .invoice-table th.text-right { text-align: right; }
            .invoice-table td { padding: 16px 12px; border-bottom: 1px solid #e5e7eb; color: #1f2937; }
            .invoice-table td.text-center { text-align: center; }
            .invoice-table td.text-right { text-align: right; }
            .invoice-table td.amount { font-weight: 600; }
            .totals-section { display: flex; justify-content: flex-end; margin-bottom: 40px; }
            .totals-table { width: 100%; max-width: 350px; }
            .totals-row { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #e5e7eb; font-size: 15px; }
            .totals-row.total { background-color: #f3f4f6; padding: 16px; margin-top: 8px; border-radius: 6px; border: none; font-size: 20px; font-weight: 700; color: #111827; }
            .totals-row.total .amount { color: #111827; }
            .invoice-footer { display: grid; grid-template-columns: 1fr; gap: 40px; margin-top: 40px; padding-top: 30px; border-top: 2px solid #e5e7eb; }
            .footer-section h3 { color: #111827; font-size: 12px; font-weight: 500; letter-spacing: 0.5px; text-transform: uppercase; margin-bottom: 8px; }
            .footer-section p { color: #4b5563; font-size: 14px; line-height: 1.6; white-space: pre-wrap; }
            .action-buttons { display: none; } /* Hide buttons in generated file */
            @media (min-width: 640px) { .invoice-footer { grid-template-columns: 1fr 1fr; } }
        </style>
    </head>
    <body>
        <div class="invoice-container">
            <div class="invoice-header">
                <div class="logo-container">
                    <img src="logo2.png" alt="Company Logo" style="max-height: 80px;">
                </div>
                <div class="invoice-title" style="text-align: right;">
                    <h1>INVOICE</h1>
                    <div class="invoice-number">#${state.invoiceDetails.number || 'N/A'}</div>
                    <div class="from-info" style="margin-top: 20px;">
                        <div class="company-name">${state.companyInfo.name || 'Your Company'}</div>
                        <div class="company-details">
                            ${state.companyInfo.address || ''}<br>
                            ${state.companyInfo.city || ''}<br>
                            ${state.companyInfo.email || ''}<br>
                            ${state.companyInfo.phone || ''}
                        </div>
                    </div>
                </div>
            </div>

            <div class="invoice-body">
                <div class="invoice-meta">
                    <div class="bill-to">
                        <h3>BILL TO:</h3>
                        <div class="client-name">${state.clientInfo.name || 'Client Name'}</div>
                        <div class="client-address">
                            ${state.clientInfo.address || ''}<br>
                            ${state.clientInfo.city || ''}<br>
                            ${state.clientInfo.email || ''}
                        </div>
                    </div>
                    <div class="invoice-dates">
                        <div class="date-row">
                            <span class="date-label">Invoice Date:</span>
                            <span class="date-value">${formatDate(state.invoiceDetails.date)}</span>
                        </div>
                        <div class="date-row">
                            <span class="date-label">Due Date:</span>
                            <span class="date-value">${formatDate(state.invoiceDetails.dueDate)}</span>
                        </div>
                    </div>
                </div>

                <table class="invoice-table">
                    <thead>
                        <tr>
                            <th>DESCRIPTION</th>
                            <th class="text-center">QTY</th>
                            <th class="text-right">RATE</th>
                            <th class="text-right">AMOUNT</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${state.items.map(item => `
                        <tr>
                            <td>${item.description || 'Item Description'}</td>
                            <td class="text-center">${item.quantity}</td>
                            <td class="text-right">${symbol}${item.rate.toFixed(2)}</td>
                            <td class="text-right amount">${symbol}${(item.quantity * item.rate).toFixed(2)}</td>
                        </tr>
                        `).join('')}
                    </tbody>
                </table>

                <div class="totals-section">
                    <div class="totals-table">
                        <div class="totals-row">
                            <span>Subtotal:</span>
                            <span class="amount">${symbol}${subtotal.toFixed(2)}</span>
                        </div>
                        <div class="totals-row">
                            <span>VAT (${state.vatRate}%):</span>
                            <span class="amount">${symbol}${vatAmount.toFixed(2)}</span>
                        </div>
                        <div class="totals-row total">
                            <span>TOTAL:</span>
                            <span class="amount">${symbol}${total.toFixed(2)}</span>
                        </div>
                    </div>
                </div>

                <div class="invoice-footer">
                    ${state.notes ? `
                    <div class="footer-section">
                        <h3>NOTES:</h3>
                        <p>${state.notes}</p>
                    </div>` : ''}
                    ${state.terms ? `
                    <div class="footer-section">
                        <h3>TERMS:</h3>
                        <p>${state.terms}</p>
                    </div>` : ''}
                </div>
            </div>
        </div>
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

    const loadInvoice = (invoiceId) => {
        db.collection('invoices').doc(invoiceId).get().then(doc => {
            if (doc.exists) {
                const loadedData = doc.data();
                // Overwrite the current state with the loaded invoice data
                Object.assign(state, loadedData);
                populateFormFromState();
                showView(createInvoiceView);
            } else {
                alert("Error: Invoice not found.");
            }
        }).catch(error => console.error("Error loading invoice:", error));
    };

    // --- FIRESTORE LOGIC ---
    const saveInvoiceBtn = document.getElementById('save-invoice-btn');

    const saveInvoice = () => {
        if (!currentUser) {
            alert("You must be logged in to save an invoice.");
            return;
        }
        if (!state.invoiceDetails.number) {
            alert("Please enter an invoice number before saving.");
            return;
        }

        saveInvoiceBtn.textContent = 'Saving...';
        saveInvoiceBtn.disabled = true;

        db.collection('invoices').add({
            ...state,
            userId: currentUser.uid,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        })
        .then(docRef => {
            console.log("Invoice saved with ID: ", docRef.id);
            alert("Invoice saved successfully!");
            showView(dashboardView);
        })
        .catch(error => {
            console.error("Error saving invoice: ", error);
            alert("Error saving invoice. Please try again.");
        })
        .finally(() => {
            saveInvoiceBtn.innerHTML = '<i data-lucide="save"></i> Save Invoice';
            lucide.createIcons();
            saveInvoiceBtn.disabled = false;
        });
    };

    const fetchAndDisplayInvoices = () => {
        if (!currentUser) return;

        showView(pastInvoicesView);
        const tbody = document.getElementById('past-invoices-tbody');
        tbody.innerHTML = '<tr><td colspan="5">Loading invoices...</td></tr>';

        db.collection('invoices')
          .where('userId', '==', currentUser.uid)
          .orderBy('createdAt', 'desc')
          .get()
          .then(querySnapshot => {
              tbody.innerHTML = '';
              if (querySnapshot.empty) {
                  tbody.innerHTML = '<tr><td colspan="5">No past invoices found.</td></tr>';
                  return;
              }
              querySnapshot.forEach(doc => {
                  const invoice = doc.data();
                  const total = invoice.items.reduce((sum, item) => sum + (item.quantity * item.rate), 0) * (1 + (invoice.vatRate / 100));
                  tbody.innerHTML += `<tr><td>${invoice.invoiceDetails.number}</td><td>${invoice.clientInfo.name}</td><td>${invoice.invoiceDetails.date}</td><td class="alignRight">${getCurrencySymbol()}${total.toFixed(2)}</td><td><button class="button button-outline load-invoice-btn" data-id="${doc.id}">Load</button></td></tr>`;
              });
          });
    };

    saveInvoiceBtn.addEventListener('click', saveInvoice);

    // Event delegation for loading invoices
    const pastInvoicesTbody = document.getElementById('past-invoices-tbody');
    pastInvoicesTbody.addEventListener('click', (e) => {
        if (e.target && e.target.classList.contains('load-invoice-btn')) {
            const invoiceId = e.target.dataset.id;
            if (invoiceId) {
                loadInvoice(invoiceId);
            }
        }
    });
});