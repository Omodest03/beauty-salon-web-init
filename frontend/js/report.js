// report.js - отчёт по поставкам с гистограммой

let currentReportData = [];

async function loadReportPage(container) {
    const today = new Date();
    const monthAgo = new Date();
    monthAgo.setMonth(monthAgo.getMonth() - 1);
    
    const defaultFrom = monthAgo.toISOString().slice(0, 10);
    const defaultTo = today.toISOString().slice(0, 10);
    
    container.innerHTML = `
        <div class="d-flex justify-content-between align-items-center mb-4">
            <h2 class="page-title"><i class="bi bi-file-text"></i> Отчёт по поставкам материалов</h2>
        </div>
        <div class="card card-stats mb-4">
            <div class="card-body">
                <div class="row g-3 align-items-end">
                    <div class="col-md-3">
                        <label class="form-label">Период с:</label>
                        <input type="date" id="reportFrom" class="form-control" value="${defaultFrom}">
                    </div>
                    <div class="col-md-3">
                        <label class="form-label">по:</label>
                        <input type="date" id="reportTo" class="form-control" value="${defaultTo}">
                    </div>
                    <div class="col-md-3">
                        <button class="btn btn-primary" onclick="window.generateReport()">
                            <i class="bi bi-search"></i> Сформировать
                        </button>
                    </div>
                    <div class="col-md-3">
                        <button class="btn btn-success" id="pdfBtn" style="display:none" onclick="window.exportReportToPdf()">
                            <i class="bi bi-file-pdf"></i> Экспорт PDF
                        </button>
                    </div>
                </div>
            </div>
        </div>
        <div id="reportResult" style="display:none"></div>
        <div id="reportEmpty" class="alert alert-info" style="display:none">Нет данных за выбранный период</div>
        <canvas id="chartCanvas" style="display:none;"></canvas>
    `;
}

window.generateReport = async function() {
    const from = document.getElementById('reportFrom').value;
    const to = document.getElementById('reportTo').value;
    
    if (!from || !to) {
        alert('Выберите период');
        return;
    }
    
    try {
        const data = await getReport(from, to);
        currentReportData = data;
        
        const resultDiv = document.getElementById('reportResult');
        const pdfBtn = document.getElementById('pdfBtn');
        
        if (!data || data.length === 0) {
            resultDiv.style.display = 'none';
            document.getElementById('reportEmpty').style.display = 'block';
            if (pdfBtn) pdfBtn.style.display = 'none';
            return;
        }
        
        let total = 0;
        let tableHtml = `
            <div class="card">
                <div class="card-body p-0">
                    <div class="table-responsive">
                        <table class="table table-bordered mb-0" id="reportTable" style="width: 100%; min-width: 800px;">
                            <thead class="table-light">
                                <tr>
                                    <th>Дата</th>
                                    <th>Поставщик</th>
                                    <th>Материал</th>
                                    <th>Кол-во</th>
                                    <th>Цена за ед.</th>
                                    <th>Сумма</th>
                                </tr>
                            </thead>
                            <tbody>
        `;
        
        data.forEach(row => {
            tableHtml += `<tr>
                <td>${window.formatDate(row.date)}</span>
                <td>${escapeHtml(row.provider || '')}</span>
                <td>${escapeHtml(row.material || '')}</span>
                <td>${row.quantity || 0}</span>
                <td>${Number(row.price).toLocaleString()} руб</span>
                <td>${Number(row.total).toLocaleString()} руб</span>
            </tr>`;
            total += Number(row.total) || 0;
        });
        
        tableHtml += `
                            </tbody>
                            <tfoot class="table-secondary">
                                <tr>
                                    <td colspan="5" class="text-end fw-bold">Итого:</span>
                                    <td class="fw-bold">${total.toLocaleString()} руб</span>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>
            </div>
        `;
        
        resultDiv.innerHTML = tableHtml;
        resultDiv.style.display = 'block';
        document.getElementById('reportEmpty').style.display = 'none';
        if (pdfBtn) pdfBtn.style.display = 'inline-block';
        
    } catch (error) {
        alert('Ошибка формирования отчёта: ' + error.message);
    }
};

async function generateChartImage() {
    // Агрегируем данные по материалам
    const materialTotals = {};
    currentReportData.forEach(row => {
        const material = row.material;
        const total = Number(row.total) || 0;
        if (materialTotals[material]) {
            materialTotals[material] += total;
        } else {
            materialTotals[material] = total;
        }
    });
    
    // Сортируем по сумме и берём топ-10
    const sorted = Object.entries(materialTotals)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);
    
    const labels = sorted.map(item => item[0]);
    const data = sorted.map(item => item[1]);
    
    const canvas = document.getElementById('chartCanvas');
    canvas.style.display = 'block';
    canvas.width = 800;
    canvas.height = 500;
    
    const ctx = canvas.getContext('2d');
    
    // Очищаем предыдущий график
    if (window.materialChart) {
        window.materialChart.destroy();
    }
    
    window.materialChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Сумма поставок (руб)',
                data: data,
                backgroundColor: '#9CAF88',
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
                    text: 'Затраты на материалы в поставках',
                    font: { size: 16 }
                },
                legend: { position: 'top' }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: { display: true, text: 'Сумма (руб)' }
                },
                x: {
                    title: { display: true, text: 'Материал' },
                    ticks: { autoSkip: false, rotation: 45, maxRotation: 45, minRotation: 45 }
                }
            }
        }
    });
    
    // Ждём рендеринга
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const chartImage = canvas.toDataURL('image/png');
    canvas.style.display = 'none';
    
    return chartImage;
}

window.exportReportToPdf = async function() {
    if (!currentReportData || currentReportData.length === 0) {
        alert('Нет данных для экспорта. Сначала сформируйте отчёт.');
        return;
    }
    
    const from = document.getElementById('reportFrom').value;
    const to = document.getElementById('reportTo').value;
    const now = new Date();
    
    if (typeof pdfMake === 'undefined') {
        alert('Библиотека pdfmake не загружена');
        return;
    }
    
    // Генерируем гистограмму
    const chartImage = await generateChartImage();
    
    // Подготовка данных для таблицы
    const tableBody = [];
    let totalSum = 0;
    
    currentReportData.forEach(row => {
        const rowTotal = Number(row.total) || 0;
        totalSum += rowTotal;
        tableBody.push([
            window.formatDate(row.date),
            { text: row.provider || '', fontSize: 9 },
            { text: row.material || '', fontSize: 9 },
            { text: String(row.quantity || 0), alignment: 'right' },
            { text: (Number(row.price) || 0).toLocaleString() + ' руб', alignment: 'right' },
            { text: rowTotal.toLocaleString() + ' руб', alignment: 'right', bold: true }
        ]);
    });
    
    tableBody.push([
        { text: '', colSpan: 5, alignment: 'right' }, null, null, null, null,
        { text: 'ИТОГО: ' + totalSum.toLocaleString() + ' руб', alignment: 'right', bold: true, fillColor: '#e9ecef' }
    ]);
    
    // Основная часть документа (портретная ориентация)
    const documentDefinition = {
        pageOrientation: 'portrait',
        pageSize: 'A4',
        pageMargins: [40, 60, 40, 40],
        defaultStyle: { font: 'Roboto', fontSize: 9 },
        header: function() {
            return {
                text: 'Отчёт по поставкам материалов',
                alignment: 'center',
                fontSize: 16,
                bold: true,
                margin: [0, 10, 0, 0]
            };
        },
        content: [
            {
                columns: [
                    { text: `Период: с ${from} по ${to}`, alignment: 'left', fontSize: 10 },
                    { text: `Дата формирования: ${now.toLocaleString()}`, alignment: 'right', fontSize: 10 }
                ],
                margin: [0, 0, 0, 10]
            },
            {
                table: {
                    headerRows: 1,
                    widths: ['15%', '20%', '25%', '8%', '16%', '16%'],
                    body: [
                        [
                            { text: 'Дата', style: 'tableHeader', alignment: 'center' },
                            { text: 'Поставщик', style: 'tableHeader', alignment: 'center' },
                            { text: 'Материал', style: 'tableHeader', alignment: 'center' },
                            { text: 'Кол-во', style: 'tableHeader', alignment: 'center' },
                            { text: 'Цена за ед.', style: 'tableHeader', alignment: 'center' },
                            { text: 'Сумма', style: 'tableHeader', alignment: 'center' }
                        ],
                        ...tableBody
                    ]
                },
                layout: {
                    hLineWidth: function(i, node) { return 0.5; },
                    vLineWidth: function(i, node) { return 0.5; },
                    hLineColor: function(i, node) { return '#aaa'; },
                    vLineColor: function(i, node) { return '#aaa'; },
                    fillColor: function(rowIndex, node, columnIndex) {
                        return (rowIndex % 2 === 0 && rowIndex > 0) ? '#f5f5f5' : null;
                    }
                }
            }
        ],
        styles: {
            tableHeader: {
                bold: true,
                fontSize: 10,
                fillColor: '#9CAF88',
                color: 'white'
            }
        },
        footer: function(currentPage, pageCount) {
            return {
                text: currentPage.toString() + ' / ' + pageCount,
                alignment: 'center',
                fontSize: 8,
                margin: [0, 10, 0, 0]
            };
        }
    };
    
    // Добавляем гистограмму на отдельную альбомную страницу
    if (chartImage) {
        documentDefinition.content.push({ text: '', pageBreak: 'before' });
        documentDefinition.content.push({
            image: chartImage,
            width: 500,
            alignment: 'center',
            margin: [0, 20, 0, 20]
        });
        // Устанавливаем альбомную ориентацию для страницы с графиком
        documentDefinition.pageOrientation = 'landscape';
    }
    
    pdfMake.createPdf(documentDefinition).download(`report_supplies_${from}_to_${to}.pdf`);
};

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}