// superadmin-report.js - отчёт по записям 

let superadminReportData = [];

async function loadEmployeesReportPage(container) {
    const currentYear = new Date().getFullYear();
    
    container.innerHTML = `
        <div class="d-flex justify-content-between align-items-center mb-4">
            <h2 class="page-title"><i class="bi bi-bar-chart-steps"></i> Отчёт по записям</h2>
        </div>
        
        <div class="card card-stats mb-4">
            <div class="card-body">
                <div class="row g-3 align-items-end">
                    <div class="col-md-3">
                        <label class="form-label">Год:</label>
                        <input type="number" id="reportYear" class="form-control" value="${currentYear}" min="2020" max="2030" step="1">
                    </div>
                    <div class="col-md-3">
                        <button class="btn btn-primary" onclick="window.loadEmployeesReport()">
                            <i class="bi bi-search"></i> Сформировать
                        </button>
                    </div>
                    <div class="col-md-3">
                        <button class="btn btn-success" id="exportReportPdfBtn" style="display:none" onclick="window.exportEmployeesReportToPdf()">
                            <i class="bi bi-file-pdf"></i> Экспорт PDF
                        </button>
                    </div>
                </div>
            </div>
        </div>
        
        <div id="reportSummary" class="card card-stats mb-4" style="display: none;">
            <div class="card-header bg-white">
                <h5 class="mb-0">Сводка за год</h5>
            </div>
            <div class="card-body">
                <div class="row text-center">
                    <div class="col-md-4">
                        <h3 id="totalServices">0</h3>
                        <p class="text-muted">Всего услуг</p>
                    </div>
                    <div class="col-md-4">
                        <h3 id="totalRevenue">0 руб</h3>
                        <p class="text-muted">Общая выручка</p>
                    </div>
                    <div class="col-md-4">
                        <h3 id="avgReceipt">0 руб</h3>
                        <p class="text-muted">Средний чек</p>
                    </div>
                </div>
            </div>
        </div>
        
        <div id="reportResult" class="card card-stats" style="display: none;">
            <div class="card-header bg-white">
                <h5 class="mb-0">Детализация по месяцам</h5>
            </div>
            <div class="card-body p-0">
                <div class="table-responsive">
                    <table class="table table-bordered mb-0" id="reportTable">
                        <thead class="table-light">
                            <tr>
                                <th>Месяц</th>
                                <th>Количество услуг</th>
                                <th>Выручка</th>
                                <th>Средний чек</th>
                            </tr>
                        </thead>
                        <tbody id="reportTableBody"></tbody>
                    </table>
                </div>
            </div>
        </div>
        
        <div id="reportDetails" style="display: none;">
            <div class="card card-stats mt-4">
                <div class="card-header bg-white">
                    <h5 class="mb-0">Записи по месяцам</h5>
                </div>
                <div class="card-body p-0" id="monthlyDetailsContainer"></div>
            </div>
        </div>
        
        <div id="reportEmpty" class="alert alert-info text-center" style="display: none;">
            <i class="bi bi-info-circle"></i> Нет данных за выбранный год
        </div>
    `;
}

window.loadEmployeesReport = async function() {
    const yearInput = document.getElementById('reportYear');
    let year = parseInt(yearInput.value);
    
    if (isNaN(year) || year < 2000 || year > 2100) {
        alert('Введите корректный год (2000-2100)');
        yearInput.value = new Date().getFullYear();
        return;
    }
    
    const summaryDiv = document.getElementById('reportSummary');
    const resultDiv = document.getElementById('reportResult');
    const detailsDiv = document.getElementById('reportDetails');
    const emptyDiv = document.getElementById('reportEmpty');
    const pdfBtn = document.getElementById('exportReportPdfBtn');
    
    try {
        const response = await fetch(`/api/employees/report?year=${year}`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
        });
        
        if (!response.ok) {
            throw new Error('Ошибка загрузки отчёта');
        }
        
        const data = await response.json();
        superadminReportData = data;
        
        if (!data || data.length === 0) {
            summaryDiv.style.display = 'none';
            resultDiv.style.display = 'none';
            detailsDiv.style.display = 'none';
            emptyDiv.style.display = 'block';
            if (pdfBtn) pdfBtn.style.display = 'none';
            return;
        }
        
        let totalServices = 0;
        let totalRevenue = 0;
        
        const tbody = document.getElementById('reportTableBody');
        tbody.innerHTML = data.map(row => {
            const services = parseInt(row.services_count) || 0;
            const revenue = parseFloat(row.total_revenue) || 0;
            const avgReceipt = parseFloat(row.avg_receipt) || 0;
            
            totalServices += services;
            totalRevenue += revenue;
            
            let monthName = '';
            if (row.month) {
                const [yearStr, monthStr] = row.month.split('-');
                const date = new Date(parseInt(yearStr), parseInt(monthStr) - 1, 1);
                monthName = date.toLocaleString('ru', { month: 'long', year: 'numeric' });
            }
            return `
                <tr>
                    <td>${monthName || row.month || ''}</td>
                    <td>${services.toLocaleString()}</td>
                    <td>${revenue.toLocaleString()} руб</td>
                    <td>${avgReceipt.toLocaleString()} руб</td>
                </tr>
            `;
        }).join('');
        
        document.getElementById('totalServices').innerText = totalServices.toLocaleString();
        document.getElementById('totalRevenue').innerText = totalRevenue.toLocaleString() + ' руб';
        const avgReceiptTotal = totalServices > 0 ? Math.round(totalRevenue / totalServices) : 0;
        document.getElementById('avgReceipt').innerText = avgReceiptTotal.toLocaleString() + ' руб';
        
        await loadMonthlyDetails(year);
        
        summaryDiv.style.display = 'block';
        resultDiv.style.display = 'block';
        detailsDiv.style.display = 'block';
        emptyDiv.style.display = 'none';
        if (pdfBtn) pdfBtn.style.display = 'inline-block';
        
    } catch (error) {
        console.error('Report error:', error);
        summaryDiv.style.display = 'none';
        resultDiv.style.display = 'none';
        detailsDiv.style.display = 'none';
        emptyDiv.style.display = 'block';
        if (pdfBtn) pdfBtn.style.display = 'none';
    }
};

async function loadMonthlyDetails(year) {
    const container = document.getElementById('monthlyDetailsContainer');
    
    try {
        const response = await fetch(`/api/records?year=${year}`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
        });
        
        if (!response.ok) {
            throw new Error('Ошибка загрузки детализации');
        }
        
        const records = await response.json();
        
        if (!records || records.length === 0) {
            container.innerHTML = '<div class="alert alert-info">Нет записей за выбранный год</div>';
            return;
        }
        
        const grouped = {};
        records.forEach(record => {
            if (!record.datetime) return;
            const date = new Date(record.datetime);
            const monthKey = `${date.getFullYear()}-${date.getMonth() + 1}`;
            const monthName = date.toLocaleString('ru', { month: 'long', year: 'numeric' });
            if (!grouped[monthKey]) {
                grouped[monthKey] = { name: monthName, records: [], total: 0 };
            }
            grouped[monthKey].records.push(record);
            if (record.status === 'Выполнено') {
                grouped[monthKey].total += Number(record.price) || 0;
            }
        });
        
        const sortedMonths = Object.keys(grouped).sort().reverse();
        
        let html = '<div class="accordion" id="monthlyAccordion">';
        for (const monthKey of sortedMonths) {
            const monthData = grouped[monthKey];
            const id = monthKey.replace(/[^a-zа-яё0-9]/gi, '');
            html += `
                <div class="accordion-item">
                    <h2 class="accordion-header">
                        <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#collapse-${id}">
                            ${monthData.name} (${monthData.records.length} записей, выручка: ${monthData.total.toLocaleString()} руб)
                        </button>
                    </h2>
                    <div id="collapse-${id}" class="accordion-collapse collapse" data-bs-parent="#monthlyAccordion">
                        <div class="accordion-body p-0">
                            <table class="table table-sm table-bordered mb-0">
                                <thead class="table-light">
                                    <tr>
                                        <th>Дата</th>
                                        <th>Клиент</th>
                                        <th>Услуга</th>
                                        <th>Мастер</th>
                                        <th>Сумма</th>
                                        <th>Статус</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${monthData.records.map(r => `
                                        <tr>
                                            <td>${new Date(r.datetime).toLocaleDateString()}</td>
                                            <td>${escapeHtml(r.client_name || '—')}</td>
                                            <td>${escapeHtml(r.service_name || '—')}</td>
                                            <td>${escapeHtml(r.master_name || '—')}</td>
                                            <td>${r.price ? Number(r.price).toLocaleString() + ' руб' : '—'}</td>
                                            <td>${r.status || '—'}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            `;
        }
        html += '</div>';
        container.innerHTML = html;
        
    } catch (error) {
        console.error('Details error:', error);
        container.innerHTML = `<div class="alert alert-warning">Ошибка загрузки детализации: ${error.message}</div>`;
    }
}

async function generateProfitChartImage(year, data) {
    let canvas = document.getElementById('profitChartCanvas');
    if (!canvas) {
        canvas = document.createElement('canvas');
        canvas.id = 'profitChartCanvas';
        canvas.style.display = 'none';
        document.body.appendChild(canvas);
    }
    
    canvas.width = 800;
    canvas.height = 500;
    
    const ctx = canvas.getContext('2d');
    
    const months = data.map(row => {
        if (row.month) {
            const [yearStr, monthStr] = row.month.split('-');
            const date = new Date(parseInt(yearStr), parseInt(monthStr) - 1, 1);
            return date.toLocaleString('ru', { month: 'short' });
        }
        return row.month || '';
    });
    const revenues = data.map(row => parseFloat(row.total_revenue) || 0);
    
    if (window.profitChart) {
        window.profitChart.destroy();
    }
    
    window.profitChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: months,
            datasets: [{
                label: 'Выручка (руб)',
                data: revenues,
                backgroundColor: '#7B9E6B',
                borderColor: '#5D7A4D',
                borderWidth: 1
            }]
        },
        options: {
            responsive: false,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: `Прибыльность по месяцам за ${year} год`,
                    font: { size: 16 }
                },
                legend: { position: 'top' }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: { display: true, text: 'Выручка (руб)' }
                },
                x: {
                    title: { display: true, text: 'Месяц' }
                }
            }
        }
    });
    
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const chartImage = canvas.toDataURL('image/png');
    return chartImage;
}

window.exportEmployeesReportToPdf = async function() {
    if (!superadminReportData || superadminReportData.length === 0) {
        alert('Нет данных для экспорта');
        return;
    }
    
    const year = document.getElementById('reportYear').value;
    
    if (typeof pdfMake === 'undefined') {
        alert('Библиотека pdfmake не загружена');
        return;
    }
    
    let records = [];
    try {
        const response = await fetch(`/api/records?year=${year}`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
        });
        if (response.ok) {
            records = await response.json();
        }
    } catch (err) {
        console.warn('Could not load records for PDF:', err);
    }
    
    const completedRecords = records.filter(r => r.status === 'Выполнено');
    
    const recordsByMonth = {};
    completedRecords.forEach(record => {
        if (!record.datetime) return;
        const date = new Date(record.datetime);
        const monthKey = `${date.getFullYear()}-${date.getMonth() + 1}`;
        const monthName = date.toLocaleString('ru', { month: 'long', year: 'numeric' });
        if (!recordsByMonth[monthKey]) {
            recordsByMonth[monthKey] = { name: monthName, records: [] };
        }
        recordsByMonth[monthKey].records.push(record);
    });
    
    const sortedMonths = Object.keys(recordsByMonth).sort().reverse();
    
    let totalServices = 0;
    let totalRevenue = 0;
    const summaryData = superadminReportData.map(row => {
        const services = parseInt(row.services_count) || 0;
        const revenue = parseFloat(row.total_revenue) || 0;
        const avgReceipt = parseFloat(row.avg_receipt) || 0;
        totalServices += services;
        totalRevenue += revenue;
        
        let monthName = '';
        if (row.month) {
            const [yearStr, monthStr] = row.month.split('-');
            const date = new Date(parseInt(yearStr), parseInt(monthStr) - 1, 1);
            monthName = date.toLocaleString('ru', { month: 'long', year: 'numeric' });
        }
        return [
            monthName || row.month || '',
            { text: services.toLocaleString(), alignment: 'right' },
            { text: revenue.toLocaleString() + ' руб', alignment: 'right' },
            { text: avgReceipt.toLocaleString() + ' руб', alignment: 'right' }
        ];
    });
    
    const content = [
        { text: `Отчёт по записям за ${year} год`, style: 'header', alignment: 'center', margin: [0, 0, 0, 10] },
        { text: `Дата формирования: ${new Date().toLocaleString()}`, alignment: 'right', fontSize: 9, margin: [0, 0, 0, 15] },
        { text: 'Сводка по месяцам', style: 'subheader', margin: [0, 10, 0, 5] },
        {
            table: {
                headerRows: 1,
                widths: ['*', 'auto', 'auto', 'auto'],
                body: [
                    [{ text: 'Месяц', style: 'tableHeader', alignment: 'center' }, { text: 'Кол-во услуг', style: 'tableHeader', alignment: 'center' }, { text: 'Выручка', style: 'tableHeader', alignment: 'center' }, { text: 'Средний чек', style: 'tableHeader', alignment: 'center' }],
                    ...summaryData,
                    [{ text: 'ИТОГО:', alignment: 'right', bold: true }, { text: totalServices.toLocaleString(), alignment: 'right', bold: true }, { text: totalRevenue.toLocaleString() + ' руб', alignment: 'right', bold: true }, { text: (totalServices > 0 ? Math.round(totalRevenue / totalServices) : 0).toLocaleString() + ' руб', alignment: 'right', bold: true }]
                ]
            },
            layout: 'lightHorizontalLines'
        }
    ];
    
    if (sortedMonths.length > 0) {
        content.push({ text: 'Детализация по месяцам', style: 'subheader', margin: [0, 20, 0, 5] });
        
        for (const monthKey of sortedMonths) {
            const monthData = recordsByMonth[monthKey];
            const monthRecords = monthData.records;
            
            let monthTotal = 0;
            monthRecords.forEach(r => { monthTotal += Number(r.price) || 0; });
            
            content.push({
                text: `${monthData.name} (${monthRecords.length} записей, выручка: ${monthTotal.toLocaleString()} руб)`,
                style: 'monthHeader',
                margin: [0, 10, 0, 5]
            });
            
            const recordsTableBody = [
                [{ text: 'Дата', style: 'tableHeader', alignment: 'center' }, { text: 'Клиент', style: 'tableHeader', alignment: 'center' }, { text: 'Услуга', style: 'tableHeader', alignment: 'center' }, { text: 'Мастер', style: 'tableHeader', alignment: 'center' }, { text: 'Сумма', style: 'tableHeader', alignment: 'center' }, { text: 'Статус', style: 'tableHeader', alignment: 'center' }]
            ];
            
            monthRecords.forEach(r => {
                recordsTableBody.push([
                    new Date(r.datetime).toLocaleDateString(),
                    r.client_name || '—',
                    r.service_name || '—',
                    r.master_name || '—',
                    { text: (Number(r.price) || 0).toLocaleString() + ' руб', alignment: 'right' },
                    r.status || '—'
                ]);
            });
            
            content.push({
                table: { headerRows: 1, widths: ['auto', '*', '*', '*', 'auto', 'auto'], body: recordsTableBody },
                layout: 'lightHorizontalLines',
                fontSize: 8
            });
        }
    }
    
    const profitChartImage = await generateProfitChartImage(year, superadminReportData);
    if (profitChartImage) {
        content.push({ text: '', pageBreak: 'before' });
        content.push({
            image: profitChartImage,
            width: 500,
            alignment: 'center',
            margin: [0, 20, 0, 20]
        });
    }
    
    const documentDefinition = {
        pageOrientation: 'portrait',
        pageSize: 'A4',
        pageMargins: [30, 40, 30, 40],
        defaultStyle: { font: 'Roboto', fontSize: 10 },
        content: content,
        styles: {
            header: { fontSize: 16, bold: true, color: '#2F3E2E' },
            subheader: { fontSize: 12, bold: true, color: '#7B9E6B', margin: [0, 10, 0, 5] },
            monthHeader: { fontSize: 11, bold: true, color: '#2F3E2E', margin: [0, 5, 0, 3] },
            tableHeader: { bold: true, fillColor: '#9CAF88', color: 'white', fontSize: 9 }
        },
        footer: function(currentPage, pageCount) {
            return { text: `Страница ${currentPage} из ${pageCount}`, alignment: 'center', fontSize: 8, margin: [0, 10, 0, 0] };
        }
    };
    
    if (profitChartImage) {
        documentDefinition.pageOrientation = 'landscape';
    }
    
    pdfMake.createPdf(documentDefinition).download(`report_records_${year}.pdf`);
};

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Экспорт глобальных функций
window.loadEmployeesReportPage = loadEmployeesReportPage;
window.loadEmployeesReport = loadEmployeesReport;
window.exportEmployeesReportToPdf = exportEmployeesReportToPdf;