// records.js - управление записями клиентов

let recordsData = [];
let recordsCurrentPage = 1;
let recordsItemsPerPage = 15;
let recordsFiltered = [];

async function loadRecordsPage(container) {
    container.innerHTML = `
        <div class="d-flex justify-content-between align-items-center mb-4">
            <h2 class="page-title"><i class="bi bi-calendar-check"></i> Записи клиентов</h2>
            <button class="btn btn-primary" onclick="window.showAddRecordModal()">
                <i class="bi bi-plus"></i> Создать запись
            </button>
        </div>
        
        <div class="card card-stats mb-4">
            <div class="card-body">
                <div class="row g-3 align-items-end">
                    <div class="col-md-2">
                        <label class="form-label">Дата:</label>
                        <input type="date" id="filterDate" class="form-control">
                    </div>
                    <div class="col-md-2">
                        <label class="form-label">Статус:</label>
                        <select id="filterStatus" class="form-select">
                            <option value="">Все</option>
                            <option value="В процессе">В процессе</option>
                            <option value="Выполнено">Выполнено</option>
                            <option value="Отменено">Отменено</option>
                        </select>
                    </div>
                    <div class="col-md-3">
                        <label class="form-label">Клиент:</label>
                        <input type="text" id="filterClient" class="form-control" placeholder="Поиск по имени клиента">
                    </div>
                    <div class="col-md-2">
                        <button class="btn btn-primary w-100" onclick="window.applyFilters()">
                            <i class="bi bi-search"></i> Применить
                        </button>
                    </div>
                    <div class="col-md-3">
                        <button class="btn btn-outline-secondary w-100" onclick="window.clearFilters()">
                            <i class="bi bi-eraser"></i> Сбросить
                        </button>
                    </div>
                </div>
            </div>
        </div>
        
        <div id="recordsTableContainer" class="card card-stats">
            <div class="card-body p-0">
                <div class="table-responsive">
                    <table class="table table-hover mb-0" id="recordsTable">
                        <thead class="table-light">
                            <tr>
                                <th>Дата и время</th>
                                <th>Клиент</th>
                                <th>Услуга</th>
                                <th>Мастер</th>
                                <th>Стоимость</th>
                                <th>Статус</th>
                                <th style="width: 100px">Действия</th>
                            </tr>
                        </thead>
                        <tbody id="recordsTableBody">
                            <tr><td colspan="7" class="text-center">Загрузка...</span></span>
                        </tbody>
                    </table>
                </div>
                <div id="recordsPagination"></div>
            </div>
        </div>
    `;
    
    await loadRecords();
}

window.applyFilters = async function() {
    recordsCurrentPage = 1;
    await loadRecords();
};

window.clearFilters = async function() {
    document.getElementById('filterDate').value = '';
    document.getElementById('filterStatus').value = '';
    document.getElementById('filterClient').value = '';
    recordsCurrentPage = 1;
    await loadRecords();
};

async function loadRecords() {
    try {
        const token = localStorage.getItem('authToken');
        let url = '/api/records';
        
        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) {
            throw new Error('Ошибка загрузки записей');
        }
        
        let allRecords = await response.json();
        
        const date = document.getElementById('filterDate').value;
        const status = document.getElementById('filterStatus').value;
        const clientName = document.getElementById('filterClient').value.toLowerCase();
        
        recordsData = allRecords.filter(record => {
            if (date && new Date(record.datetime).toDateString() !== new Date(date).toDateString()) {
                return false;
            }
            if (status && record.status !== status) {
                return false;
            }
            if (clientName && !(record.client_name || '').toLowerCase().includes(clientName)) {
                return false;
            }
            return true;
        });
        
        recordsFiltered = [...recordsData];
        renderRecordsTable();
        
    } catch (error) {
        console.error('Load records error:', error);
        const tbody = document.getElementById('recordsTableBody');
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="7" class="text-center text-danger">Ошибка: ${error.message}</span></span`;
        }
    }
}

function renderRecordsTable() {
    const totalItems = recordsFiltered.length;
    const totalPages = Math.ceil(totalItems / recordsItemsPerPage);
    const start = (recordsCurrentPage - 1) * recordsItemsPerPage;
    const end = start + recordsItemsPerPage;
    const pageData = recordsFiltered.slice(start, end);
    
    const tbody = document.getElementById('recordsTableBody');
    if (!tbody) return;
    
    if (pageData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center">Нет записей</span></span';
        document.getElementById('recordsPagination').innerHTML = '';
        return;
    }
    
    tbody.innerHTML = pageData.map(record => `
        <tr>
            <td>${new Date(record.datetime).toLocaleString()}</span>
            <td>${escapeHtml(record.client_name || '—')}</span>
            <td>${escapeHtml(record.service_name || '—')}</span>
            <td>${escapeHtml(record.master_name || '—')}</span>
            <td>${record.price ? Number(record.price).toLocaleString() + ' руб' : '—'}</span>
            <td>${getStatusBadge(record.status)}</span>
            <td class="text-nowrap">
                <button class="btn btn-sm btn-info me-1" onclick="window.viewRecordDetails(${record.id})" title="Просмотр">
                    <i class="bi bi-eye"></i>
                </button>
                ${record.status === 'В процессе' ? `
                    <button class="btn btn-sm btn-warning" onclick="window.cancelRecord(${record.id})" title="Отменить">
                        <i class="bi bi-x-circle"></i>
                    </button>
                ` : ''}
            </span>
        </tr>
    `).join('');
    
    renderRecordsPagination(totalPages, recordsCurrentPage);
}

function renderRecordsPagination(totalPages, currentPage) {
    const container = document.getElementById('recordsPagination');
    if (!container) return;
    
    if (totalPages <= 1) {
        container.innerHTML = '';
        return;
    }
    
    let html = '<div class="d-flex justify-content-between align-items-center p-3 border-top"><div class="text-muted">';
    const startItem = (currentPage - 1) * recordsItemsPerPage + 1;
    const endItem = Math.min(currentPage * recordsItemsPerPage, recordsFiltered.length);
    html += `Показано ${startItem}-${endItem} из ${recordsFiltered.length}`;
    html += '</div><nav><ul class="pagination mb-0">';
    
    html += `<li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
                <a class="page-link" href="#" onclick="window.changeRecordsPage(${currentPage - 1}); return false;">«</a>
             </li>`;
    
    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, currentPage + 2);
    
    if (startPage > 1) {
        html += `<li class="page-item"><a class="page-link" href="#" onclick="window.changeRecordsPage(1); return false;">1</a></li>`;
        if (startPage > 2) html += '<li class="page-item disabled"><span class="page-link">...</span></li>';
    }
    
    for (let i = startPage; i <= endPage; i++) {
        html += `<li class="page-item ${i === currentPage ? 'active' : ''}">
                    <a class="page-link" href="#" onclick="window.changeRecordsPage(${i}); return false;">${i}</a>
                 </li>`;
    }
    
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) html += '<li class="page-item disabled"><span class="page-link">...</span></li>';
        html += `<li class="page-item"><a class="page-link" href="#" onclick="window.changeRecordsPage(${totalPages}); return false;">${totalPages}</a></li>`;
    }
    
    html += `<li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
                <a class="page-link" href="#" onclick="window.changeRecordsPage(${currentPage + 1}); return false;">»</a>
             </li>`;
    
    html += '</ul></nav></div>';
    container.innerHTML = html;
}

window.changeRecordsPage = function(page) {
    if (page < 1 || page > Math.ceil(recordsFiltered.length / recordsItemsPerPage)) return;
    recordsCurrentPage = page;
    renderRecordsTable();
};

window.cancelRecord = async function(recordId) {
    if (!confirm('Отменить запись? Это действие нельзя отменить.')) return;
    
    try {
        const token = localStorage.getItem('authToken');
        const response = await fetch(`/api/records/${recordId}/cancel`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) {
            throw new Error('Ошибка отмены записи');
        }
        
        alert('Запись отменена');
        await loadRecords();
        
    } catch (error) {
        alert('Ошибка: ' + error.message);
    }
};

window.viewRecordDetails = async function(recordId) {
    try {
        const token = localStorage.getItem('authToken');
        const response = await fetch(`/api/records/${recordId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) {
            throw new Error('Ошибка загрузки деталей');
        }
        
        const record = await response.json();
        
        const adminName = record.admin_name && record.admin_name !== '—' ? record.admin_name : 'Не указан';
        
        let transactionHtml = '';
        if (record.status === 'Выполнено' && record.transaction_id) {
            transactionHtml = `
                <tr>
                    <th>Транзакция:</th>
                    <td>
                        <button class="btn btn-sm btn-info" onclick="window.viewTransactionDetails(${record.transaction_id})">
                            <i class="bi bi-receipt"></i> Просмотреть транзакцию #${record.transaction_id}
                        </button>
                    </span>
                </tr>
            `;
        } else if (record.status === 'Выполнено' && !record.transaction_id) {
            transactionHtml = `
                <tr>
                    <th>Транзакция:</th>
                    <td><span class="text-warning">Транзакция не найдена</span></span>
                </tr>
            `;
        } else if (record.status === 'В процессе') {
            transactionHtml = `
                <tr>
                    <th>Транзакция:</th>
                    <td><span class="text-muted">Оплата будет произведена после выполнения</span></span>
                </tr>
            `;
        } else if (record.status === 'Отменено') {
            transactionHtml = `
                <tr>
                    <th>Транзакция:</th>
                    <td><span class="text-muted">Оплата не производилась</span></span>
                </tr>
            `;
        }
        
        const modalHtml = `
            <div class="modal fade" id="recordDetailsModal" tabindex="-1">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Детали записи #${record.id}</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <table class="table table-bordered">
                                <tr><th style="width: 40%">Дата и время:</th><td>${new Date(record.datetime).toLocaleString()}</span></span>
                                <tr><th>Клиент:</th><td>${escapeHtml(record.client_name || '—')}</span></span>
                                <tr><th>Услуга:</th><td>${escapeHtml(record.service_name || '—')}</span></span>
                                <tr><th>Мастер:</th><td>${escapeHtml(record.master_name || '—')}</span></span>
                                <tr><th>Стоимость:</th><td>${record.price ? Number(record.price).toLocaleString() + ' руб' : '—'}</span></span>
                                <tr><th>Статус:</th><td>${getStatusBadge(record.status)}</span></span>
                                <tr><th>Администратор:</th><td>${escapeHtml(adminName)}</span></span>
                                ${transactionHtml}
                            </table>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Закрыть</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        const oldModal = document.getElementById('recordDetailsModal');
        if (oldModal) oldModal.remove();
        
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        const modal = new bootstrap.Modal(document.getElementById('recordDetailsModal'));
        modal.show();
        
        document.getElementById('recordDetailsModal').addEventListener('hidden.bs.modal', function() {
            this.remove();
        });
        
    } catch (error) {
        alert('Ошибка: ' + error.message);
    }
};

window.viewTransactionDetails = async function(transactionId) {
    try {
        const token = localStorage.getItem('authToken');
        const response = await fetch(`/api/transactions/${transactionId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) {
            throw new Error('Ошибка загрузки транзакции');
        }
        
        const transaction = await response.json();
        
        const modalHtml = `
            <div class="modal fade" id="transactionModal" tabindex="-1">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Детали транзакции #${transaction.id}</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <table class="table table-bordered">
                                <tr><th style="width: 40%">Сумма:</th><td>${transaction.sum ? Number(transaction.sum).toLocaleString() + ' руб' : '—'}</span></span>
                                <tr><th>Дата и время:</th><td>${new Date(transaction.date_and_time).toLocaleString()}</span></span>
                                <tr><th>Способ оплаты:</th><td>${transaction.payment_method || '—'}</span></span>
                            </table>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Закрыть</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        const oldModal = document.getElementById('transactionModal');
        if (oldModal) oldModal.remove();
        
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        const modal = new bootstrap.Modal(document.getElementById('transactionModal'));
        modal.show();
        
        document.getElementById('transactionModal').addEventListener('hidden.bs.modal', function() {
            this.remove();
        });
        
    } catch (error) {
        alert('Ошибка: ' + error.message);
    }
};

function getStatusBadge(status) {
    switch(status) {
        case 'Выполнено': return '<span class="badge bg-success">Выполнено</span>';
        case 'В процессе': return '<span class="badge bg-primary">В процессе</span>';
        case 'Отменено': return '<span class="badge bg-danger">Отменено</span>';
        default: return '<span class="badge bg-secondary">' + (status || '—') + '</span>';
    }
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

window.showAddRecordModal = function() {
    alert('Функция создания записи будет реализована в следующем шаге');
};


window.showAddRecordModal = async function() {
    document.getElementById('recordClientId').innerHTML = '<option value="">-- Выберите клиента --</option>';
    document.getElementById('recordServiceId').innerHTML = '<option value="">-- Выберите услугу --</option>';
    document.getElementById('recordMasterId').innerHTML = '<option value="">-- Сначала выберите услугу --</option>';
    document.getElementById('recordMasterId').disabled = true;
    document.getElementById('recordTime').innerHTML = '<option value="">-- Сначала выберите дату и услугу --</option>';
    document.getElementById('recordTime').disabled = true;
    document.getElementById('recordDate').value = '';
    document.getElementById('recordPrice').value = '';
    
    try {
        const [clients, services] = await Promise.all([
            getClients(),
            getServices()
        ]);
        
        const clientSelect = document.getElementById('recordClientId');
        clients.forEach(client => {
            const option = document.createElement('option');
            option.value = client.id;
            option.textContent = `${client.name} (${client.phone})`;
            clientSelect.appendChild(option);
        });
        
        const serviceSelect = document.getElementById('recordServiceId');
        services.forEach(service => {
            const option = document.createElement('option');
            option.value = service.id;
            option.textContent = `${service.name} - ${service.price.toLocaleString()} руб (${service.duration} мин)`;
            option.dataset.price = service.price;
            option.dataset.duration = service.duration;
            serviceSelect.appendChild(option);
        });
        
        const modal = new bootstrap.Modal(document.getElementById('recordModal'));
        modal.show();
        
        document.getElementById('recordServiceId').onchange = async function() {
            const selectedOption = this.options[this.selectedIndex];
            const serviceId = this.value;
            const price = selectedOption?.dataset?.price || 0;
            const duration = selectedOption?.dataset?.duration || 0;
            
            document.getElementById('recordPrice').value = price ? price.toLocaleString() + ' руб' : '';
            
            if (serviceId) {
                try {
                    const materialCheck = await window.checkMaterialsAvailability(serviceId);
                    if (!materialCheck.available) {
                        let message = '⚠️ Внимание: для этой услуги недостаточно материалов на складе!\n\n';
                        materialCheck.missing.forEach(m => {
                            message += `• ${m.name}: нужно ${m.required} ${m.unit}, в наличии ${m.available} ${m.unit}\n`;
                        });
                        message += '\nВы всё равно можете создать запись, но услуга не сможет быть выполнена до пополнения материалов.';
                        alert(message);
                    }
                } catch (err) {
                    console.warn('Material check error:', err);
                }
                
                await loadMastersForService(serviceId);
                
                const date = document.getElementById('recordDate').value;
                if (date && duration) {
                    await loadFreeSlots(date, duration);
                }
            } else {
                document.getElementById('recordMasterId').innerHTML = '<option value="">-- Сначала выберите услугу --</option>';
                document.getElementById('recordMasterId').disabled = true;
                document.getElementById('recordTime').innerHTML = '<option value="">-- Сначала выберите дату и услугу --</option>';
                document.getElementById('recordTime').disabled = true;
                document.getElementById('recordPrice').value = '';
            }
        };
        
        // Обработчик изменения даты
        document.getElementById('recordDate').onchange = async function() {
            const date = this.value;
            const serviceSelect = document.getElementById('recordServiceId');
            const selectedOption = serviceSelect.options[serviceSelect.selectedIndex];
            const duration = selectedOption?.dataset?.duration || 0;
            const serviceId = serviceSelect.value;
            
            if (date && serviceId && duration) {
                await loadFreeSlots(date, duration);
            }
        };
        
        // Обработчик изменения мастера
        document.getElementById('recordMasterId').onchange = async function() {
            const masterId = this.value;
            const date = document.getElementById('recordDate').value;
            const serviceSelect = document.getElementById('recordServiceId');
            const selectedOption = serviceSelect.options[serviceSelect.selectedIndex];
            const duration = selectedOption?.dataset?.duration || 0;
            
            if (masterId && date && duration) {
                await loadFreeSlots(date, duration);
            }
        };
        
        // Обработчик сохранения
        const saveBtn = document.getElementById('saveRecordBtn');
        const newSaveBtn = saveBtn.cloneNode(true);
        saveBtn.parentNode.replaceChild(newSaveBtn, saveBtn);
        newSaveBtn.onclick = async () => {
            await saveRecord();
        };
        
    } catch (error) {
        alert('Ошибка загрузки данных: ' + error.message);
    }
};

async function loadMastersForService(serviceId) {
    const masterSelect = document.getElementById('recordMasterId');
    masterSelect.innerHTML = '<option value="">-- Загрузка мастеров... --</option>';
    masterSelect.disabled = true;
    
    try {
        const masters = await window.getMasters(serviceId);
        
        masterSelect.innerHTML = '<option value="">-- Выберите мастера --</option>';
        
        if (masters.length === 0) {
            masterSelect.innerHTML = '<option value="">-- Нет мастеров для этой услуги --</option>';
            masterSelect.disabled = true;
            return;
        }
        
        masters.forEach(master => {
            const option = document.createElement('option');
            option.value = master.id;
            option.textContent = `${master.name} (${master.role})`;
            masterSelect.appendChild(option);
        });
        masterSelect.disabled = false;
        
        // Если уже выбрана дата, загружаем свободные слоты
        const date = document.getElementById('recordDate').value;
        const serviceSelect = document.getElementById('recordServiceId');
        const selectedOption = serviceSelect.options[serviceSelect.selectedIndex];
        const duration = selectedOption?.dataset?.duration || 0;
        
        if (date && duration) {
            await loadFreeSlots(date, duration);
        }
        
    } catch (error) {
        console.error('Error loading masters:', error);
        masterSelect.innerHTML = '<option value="">-- Ошибка загрузки мастеров --</option>';
        masterSelect.disabled = true;
    }
}

async function loadFreeSlots(date, duration) {
    const masterId = document.getElementById('recordMasterId').value;
    if (!masterId) return;
    
    try {
        const slots = await getFreeSlots(masterId, date, duration);
        
        const timeSelect = document.getElementById('recordTime');
        timeSelect.innerHTML = '<option value="">-- Выберите время --</option>';
        
        slots.forEach(slot => {
            const option = document.createElement('option');
            option.value = slot.slot_start;
            const startTime = slot.slot_start.substring(0, 5);
            const endTime = slot.slot_end.substring(0, 5);
            option.textContent = `${startTime} - ${endTime}`;
            timeSelect.appendChild(option);
        });
        
        timeSelect.disabled = slots.length === 0;
        if (slots.length === 0) {
            timeSelect.innerHTML = '<option value="">-- Нет свободного времени --</option>';
        }
        
    } catch (error) {
        console.error('Error loading free slots:', error);
        const timeSelect = document.getElementById('recordTime');
        timeSelect.innerHTML = '<option value="">-- Ошибка загрузки времени --</option>';
    }
}

async function saveRecord() {
    const clientId = document.getElementById('recordClientId').value;
    const serviceId = document.getElementById('recordServiceId').value;
    const masterId = document.getElementById('recordMasterId').value;
    const date = document.getElementById('recordDate').value;
    const time = document.getElementById('recordTime').value;
    const priceText = document.getElementById('recordPrice').value;
    
    if (!clientId) {
        alert('Выберите клиента');
        return;
    }
    if (!serviceId) {
        alert('Выберите услугу');
        return;
    }
    if (!masterId) {
        alert('Выберите мастера');
        return;
    }
    if (!date) {
        alert('Выберите дату');
        return;
    }
    if (!time) {
        alert('Выберите время');
        return;
    }
    const selectedDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (selectedDate < today) {
        alert('Нельзя выбрать дату в прошлом');
        return;
    }
    
    // === ПРОВЕРКА НАЛИЧИЯ МАТЕРИАЛОВ ===
    try {
        const materialCheck = await window.checkMaterialsAvailability(serviceId);
        if (!materialCheck.available) {
            let message = 'Невозможно записать клиента на эту услугу. Не хватает материалов:\n';
            materialCheck.missing.forEach(m => {
                message += `\n- ${m.name}: требуется ${m.required} ${m.unit}, в наличии ${m.available} ${m.unit}`;
            });
            alert(message);
            return;
        }
    } catch (error) {
        console.error('Material check error:', error);
        alert('Ошибка проверки материалов: ' + error.message);
        return;
    }
    
    const datetime = `${date}T${time}`;
    const price = parseFloat(priceText.replace(/[^0-9]/g, '')) || 0;
    const adminId = currentUser?.id || null;
    
    try {
        const result = await createRecord({
            client_id: parseInt(clientId),
            service_id: parseInt(serviceId),
            master_id: parseInt(masterId),
            administrator_id: adminId,
            datetime: datetime,
            price: price
        });
        
        alert('Запись успешно создана!');
        
        const modal = bootstrap.Modal.getInstance(document.getElementById('recordModal'));
        if (modal) modal.hide();
        
        await loadRecords();
        
    } catch (error) {
        alert('Ошибка создания записи: ' + error.message);
    }
}

// Экспорт всех глобальных функций
window.loadRecordsPage = loadRecordsPage;
window.changeRecordsPage = changeRecordsPage;
window.cancelRecord = cancelRecord;
window.viewRecordDetails = viewRecordDetails;
window.applyFilters = applyFilters;
window.clearFilters = clearFilters;