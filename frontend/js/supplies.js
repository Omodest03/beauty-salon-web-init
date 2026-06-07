// supplies.js - управление поставками

let suppliesData = [];
let materialsList = [];

async function loadSuppliesPage(container) {
    try {
        suppliesData = await getSupplies();
        
        container.innerHTML = `
            <div class="d-flex justify-content-between align-items-center mb-4">
                <h2 class="page-title"><i class="bi bi-archive"></i> Поставки материалов</h2>
                <button class="btn btn-success" onclick="window.showAddSupplyModal()">
                    <i class="bi bi-plus"></i> Оформить поставку
                </button>
            </div>
            
            <div class="card card-stats">
                <div class="card-body p-0">
                    <div class="table-responsive">
                        <table class="table table-hover mb-0">
                            <thead>
                                <tr>
                                    <th>Дата</th>
                                    <th>Поставщик</th>
                                    <th>Администратор</th>
                                    <th>Кладовщик</th>
                                    <th>Общая сумма</th>
                                    <th>Статус</th>
                                    <th style="width: 100px"></th>
                                </tr>
                            </thead>
                            <tbody>
                                ${suppliesData.map(s => `
                                    <tr>
                                        <td>${window.formatDate(s.date)}</td>
                                        <td>${escapeHtml(s.provider || '—')}</td>
                                        <td>${escapeHtml(s.administrator || '—')}</td>
                                        <td>${escapeHtml(s.storekeeper || '—')}</td>
                                        <td>${s.total_sum ? Number(s.total_sum).toLocaleString() + ' руб' : '0 руб'}</td>
                                        <td>${s.status === 'принято' ? '<span class="badge bg-success">Принята</span>' : (s.status === 'оформлено' ? '<span class="badge bg-primary">Оформлена</span>' : '<span class="badge bg-danger">Отклонена</span>')}</td>
                                        <td>
                                            <button class="btn btn-sm btn-info" onclick="window.viewSupplyDetails(${s.id})">
                                                <i class="bi bi-eye"></i>
                                            </button>
                                        </td>
                                    </tr>
                                `).join('')}
                                ${suppliesData.length === 0 ? '<tr><td colspan="7" class="text-center">Нет поставок</td>' : ''}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
        
    } catch (error) {
        container.innerHTML = `<div class="alert alert-danger">Ошибка загрузки поставок: ${error.message}</div>`;
    }
}

window.getStatusBadge = function(status) {
    switch(status) {
        case 'оформлено': return '<span class="badge bg-warning text-dark">Оформлена</span>';
        case 'принято': return '<span class="badge bg-success">Принята</span>';
        case 'отклонено': return '<span class="badge bg-danger">Отклонена</span>';
        default: return '<span class="badge bg-secondary">' + (status || 'оформлено') + '</span>';
    }
};

window.viewSupplyDetails = async function(supplyId) {
    try {
        const details = await getSupplyDetails(supplyId);
        
        let detailsHtml = `
            <div class="modal fade" id="supplyDetailsModal" tabindex="-1">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Содержимое поставки #${supplyId}</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <div class="table-responsive">
                                <table class="table table-bordered">
                                    <thead class="table-light">
                                        <tr><th>Материал</th><th>Количество</th><th>Цена за ед.</th><th>Сумма</th></tr>
                                    </thead>
                                    <tbody>
                                        ${details.map(d => `
                                            <tr><td>${escapeHtml(d.material)}</td><td>${d.quantity}</td>
                                            <td>${Number(d.price).toLocaleString()} руб</td>
                                            <td>${Number(d.total).toLocaleString()} руб</td></tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Закрыть</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        const oldModal = document.getElementById('supplyDetailsModal');
        if (oldModal) oldModal.remove();
        
        document.body.insertAdjacentHTML('beforeend', detailsHtml);
        const modal = new bootstrap.Modal(document.getElementById('supplyDetailsModal'));
        modal.show();
        
        document.getElementById('supplyDetailsModal').addEventListener('hidden.bs.modal', function() {
            this.remove();
        });
        
    } catch (error) {
        alert('Ошибка загрузки содержимого: ' + error.message);
    }
};

window.showAddSupplyModal = async function() {
    try {
        const providers = await getProviders();
        const materials = await getMaterials();
        materialsList = materials;
        window.materialsForSupply = materials;
        
        const dateInput = document.getElementById('supplyDate');
        if (dateInput) dateInput.value = new Date().toISOString().slice(0, 10);
        
        const providerSelect = document.getElementById('supplyProvider');
        if (providerSelect) {
            providerSelect.innerHTML = '<option value="">-- Выберите поставщика --</option>' +
                providers.map(p => `<option value="${p.id}">${escapeHtml(p.name)}</option>`).join('');
        }
        
        const itemsContainer = document.getElementById('supplyItemsList');
        if (itemsContainer) itemsContainer.innerHTML = '';
        
        addSupplyItemRow();
        
        const modal = new bootstrap.Modal(document.getElementById('supplyModal'));
        modal.show();
        
        const addBtn = document.getElementById('addSupplyItemBtn');
        if (addBtn) addBtn.onclick = () => addSupplyItemRow();
        
        const saveBtn = document.getElementById('saveSupplyBtn');
        if (saveBtn) {
            const newSaveBtn = saveBtn.cloneNode(true);
            saveBtn.parentNode.replaceChild(newSaveBtn, saveBtn);
            newSaveBtn.onclick = async () => {
                await saveSupply();
            };
        }
        
    } catch (error) {
        alert('Ошибка: ' + error.message);
    }
};

let supplyItemCounter = 0;

function addSupplyItemRow() {
    const container = document.getElementById('supplyItemsList');
    if (!container) return;
    
    const itemId = Date.now() + supplyItemCounter++;
    
    const materialOptions = materialsList.map(m => 
        `<option value="${m.id}">${escapeHtml(m.name)} (${m.unit})</option>`
    ).join('');
    
    const rowHtml = `
        <div class="supply-item-row mb-2" data-id="${itemId}">
            <div class="row g-2 align-items-center">
                <div class="col-md-6">
                    <select class="form-select supply-material" required>
                        <option value="">-- Выберите материал --</option>
                        ${materialOptions}
                    </select>
                </div>
                <div class="col-md-2">
                    <input type="number" class="form-control supply-quantity" placeholder="Кол-во" step="0.01" required>
                </div>
                <div class="col-md-3">
                    <input type="number" class="form-control supply-price" placeholder="Цена за ед." step="0.01" required>
                </div>
                <div class="col-md-1 text-center">
                    <button type="button" class="btn btn-sm btn-danger" style="width: 36px; height: 36px; display: inline-flex; align-items: center; justify-content: center;" onclick="this.closest('.supply-item-row').remove()">
                        <i class="bi bi-x" style="font-size: 1.2rem;"></i>
                    </button>
                </div>
            </div>
        </div>
    `;
    
    container.insertAdjacentHTML('beforeend', rowHtml);
}

async function saveSupply() {
    const date = document.getElementById('supplyDate')?.value;
    const provider_id = document.getElementById('supplyProvider')?.value;
    const administrator_id = currentUser?.id || null;
    
    if (!date) {
        alert('Укажите дату поставки');
        return;  
    }
    if (!provider_id) {
        alert('Выберите поставщика');
        return; 
    }
    if (quantity <= 0) {
        alert('Количество должно быть больше 0');
        return;
    }
    if (price <= 0) {
        alert('Цена должна быть больше 0');
        return;
    }
    
    // Собираем позиции
    const items = [];
    const rows = document.querySelectorAll('.supply-item-row');
    
    for (const row of rows) {
        const material_id = row.querySelector('.supply-material')?.value;
        const quantity = row.querySelector('.supply-quantity')?.value;
        const price = row.querySelector('.supply-price')?.value;
        
        if (material_id && quantity && price) {
            items.push({
                material_id: parseInt(material_id),
                quantity: parseFloat(quantity),
                price: parseFloat(price)
            });
        }
    }
    
    if (items.length === 0) {
        alert('Добавьте хотя бы одну позицию');
        return;  
    }
    
    const materialIds = items.map(i => i.material_id);
    if (materialIds.length !== new Set(materialIds).size) {
        alert('Ошибка: В поставке не может быть двух одинаковых материалов');
        return; 
    }
    
    // Отправка на сервер
    try {
        const response = await fetch('/api/supplies', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            },
            body: JSON.stringify({
                date,
                provider_id: parseInt(provider_id),
                administrator_id: administrator_id,
                items
            })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Ошибка создания поставки');
        }
        
        alert('Поставка успешно оформлена!');
        
        const modalElement = document.getElementById('supplyModal');
        const modal = bootstrap.Modal.getInstance(modalElement);
        if (modal) {
            modal.hide();
        }
        
        loadPage('supplies');
        
    } catch (error) {
        alert('Ошибка: ' + error.message);
    }
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}