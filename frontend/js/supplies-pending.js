// supplies-pending.js - поставки на приёмку (для кладовщика)

let pendingSuppliesData = [];
let currentSupplyId = null;

async function loadPendingSuppliesPage(container) {
    try {
        const token = localStorage.getItem('authToken');
        const response = await fetch('/api/supplies/draft', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) {
            throw new Error('Ошибка загрузки поставок');
        }
        
        pendingSuppliesData = await response.json();
        
        container.innerHTML = `
            <div class="d-flex justify-content-between align-items-center mb-4">
                <h2 class="page-title"><i class="bi bi-box-seam"></i> Поставки на приёмку</h2>
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
                                    <th>Общая сумма</th>
                                    <th style="width: 350px">Действия</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${pendingSuppliesData.map(s => `
                                    <tr>
                                        <td>${window.formatDate(s.date)}</span>
                                        <td>${escapeHtml(s.provider || '—')}</span>
                                        <td>${escapeHtml(s.administrator || '—')}</span>
                                        <td>${s.total_sum ? Number(s.total_sum).toLocaleString() + ' руб' : '0 руб'}</span>
                                        <td style="white-space: nowrap;">
                                            <button class="btn btn-sm btn-info me-1" onclick="window.showComparisonModal(${s.id})">
                                                <i class="bi bi-eye"></i> Сверить
                                            </button>
                                            <button class="btn btn-sm btn-success me-1" onclick="window.confirmSupply(${s.id})">
                                                <i class="bi bi-check-lg"></i> Подтвердить
                                            </button>
                                            <button class="btn btn-sm btn-danger" onclick="window.rejectSupply(${s.id})">
                                                <i class="bi bi-x-lg"></i> Отклонить
                                            </button>
                                        </td>
                                    </tr>
                                `).join('')}
                                ${pendingSuppliesData.length === 0 ? '<tr><td colspan="5" class="text-center">Нет поставок на приёмку</span>' : ''}
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

window.showComparisonModal = async function(supplyId) {
    currentSupplyId = supplyId;
    
    try {
        const supplyResponse = await fetch(`/api/supplies/${supplyId}`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
        });
        const supplyData = await supplyResponse.json();
        
        const expectedResponse = await fetch(`/api/supplies/${supplyId}`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
        });
        let expectedItems = await expectedResponse.json();
        
        const actualItems = [...expectedItems];
        
        const modalHtml = `
            <div class="modal fade" id="comparisonModal" tabindex="-1" style="display: none;">
                <div class="modal-dialog modal-xl">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Сверка поставки #${supplyId} от ${window.formatDate(supplyData[0]?.date || '')}</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <div class="row">
                                <div class="col-md-6">
                                    <h5 class="text-center text-primary">Ожидаемое содержимое</h5>
                                    <div class="table-responsive">
                                        <table class="table table-bordered">
                                            <thead class="table-light">
                                                <tr>
                                                    <th>Материал</th>
                                                    <th>Количество</th>
                                                    <th>Цена за ед.</th>
                                                    <th>Сумма</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                ${expectedItems.map(item => `
                                                    <tr>
                                                        <td>${escapeHtml(item.material)}</span>
                                                        <td>${item.quantity}</span>
                                                        <td>${Number(item.price).toLocaleString()} руб</span>
                                                        <td>${Number(item.total).toLocaleString()} руб</span>
                                                    </tr>
                                                `).join('')}
                                                ${expectedItems.length === 0 ? '<tr><td colspan="4" class="text-center">Нет позиций</span>' : ''}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <h5 class="text-center text-success">Фактическое содержимое</h5>
                                    <div class="table-responsive">
                                        <table class="table table-bordered">
                                            <thead class="table-light">
                                                <tr>
                                                    <th>Материал</th>
                                                    <th>Количество</th>
                                                    <th>Цена за ед.</th>
                                                    <th>Сумма</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                ${actualItems.map(item => `
                                                    <tr>
                                                        <td>${escapeHtml(item.material)}</span>
                                                        <td>${item.quantity}</span>
                                                        <td>${Number(item.price).toLocaleString()} руб</span>
                                                        <td>${Number(item.total).toLocaleString()} руб</span>
                                                    </tr>
                                                `).join('')}
                                                ${actualItems.length === 0 ? '<td><td colspan="4" class="text-center">Нет позиций</span>' : ''}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                            <div class="row mt-3">
                                <div class="col-12">
                                    <div class="alert alert-info text-center">
                                        <i class="bi bi-check-circle"></i> Поставка соответствует ожиданиям
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Закрыть</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        const oldModal = document.getElementById('comparisonModal');
        if (oldModal) oldModal.remove();
        
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        const modal = new bootstrap.Modal(document.getElementById('comparisonModal'));
        modal.show();
        
        document.getElementById('comparisonModal').addEventListener('hidden.bs.modal', function() {
            this.remove();
        });
        
    } catch (error) {
        alert('Ошибка загрузки данных для сверки: ' + error.message);
    }
};

window.confirmSupply = async function(supplyId) {
    if (!confirm('Подтвердить поставку? Материалы будут добавлены на склад.')) return;
    
    try {
        const token = localStorage.getItem('authToken');
        const response = await fetch(`/api/supplies/${supplyId}/confirm`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Ошибка подтверждения поставки');
        }
        
        alert('Поставка подтверждена! Материалы добавлены на склад.');
        loadPage('supplies-pending');
        
    } catch (error) {
        alert('Ошибка: ' + error.message);
    }
};

window.rejectSupply = async function(supplyId) {
    if (!confirm('Отклонить поставку? Материалы НЕ будут добавлены на склад.')) return;
    
    try {
        const token = localStorage.getItem('authToken');
        const response = await fetch(`/api/supplies/${supplyId}/reject`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Ошибка отклонения поставки');
        }
        
        alert('Поставка отклонена');
        loadPage('supplies-pending');
        
    } catch (error) {
        alert('Ошибка: ' + error.message);
    }
};

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}