// master.js - интерфейс мастера

let myRecordsData = [];

async function loadMyRecordsPage(container) {
    try {
        const token = localStorage.getItem('authToken');
        const response = await fetch('/api/master/records', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) {
            throw new Error('Ошибка загрузки записей');
        }
        
        myRecordsData = await response.json();
        
        container.innerHTML = `
            <div class="d-flex justify-content-between align-items-center mb-4">
                <h2 class="page-title"><i class="bi bi-calendar-check"></i> Мои записи</h2>
            </div>
            
            <div class="card card-stats">
                <div class="card-body p-0">
                    <div class="table-responsive">
                        <table class="table table-hover mb-0">
                            <thead>
                                <tr>
                                    <th>Дата и время</th>
                                    <th>Клиент</th>
                                    <th>Услуга</th>
                                    <th>Цена</th>
                                    <th>Длительность</th>
                                    <th style="width: 200px">Действия</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${myRecordsData.map(r => `
                                    <tr>
                                        <td>${new Date(r.datetime).toLocaleString()}</td>
                                        <td>${escapeHtml(r.client_name)}</td>
                                        <td>${escapeHtml(r.service_name)}</td>
                                        <td>${r.price.toLocaleString()} руб</td>
                                        <td>${r.duration} мин</td>
                                        <td style="white-space: nowrap;">
                                            <button class="btn btn-sm btn-success me-2" onclick="window.completeRecord(${r.id})">
                                                <i class="bi bi-check-lg"></i> Выполнено
                                            </button>
                                            <button class="btn btn-sm btn-danger" onclick="window.rejectRecord(${r.id})">
                                                <i class="bi bi-x-lg"></i> Отклонить
                                            </button>
                                        </span>
                                    </tr>
                                `).join('')}
                                ${myRecordsData.length === 0 ? '<tr><td colspan="6" class="text-center">Нет активных записей</td></tr>' : ''}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
    } catch (error) {
        container.innerHTML = `<div class="alert alert-danger">Ошибка загрузки записей: ${error.message}</div>`;
    }
}

window.completeRecord = async function(recordId) {
    const paymentMethod = prompt('Способ оплаты (Наличные/Карта):', 'Наличные');
    if (!paymentMethod) return;
    
    try {
        const token = localStorage.getItem('authToken');
        const response = await fetch(`/api/master/records/${recordId}/complete`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ payment_method: paymentMethod })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Ошибка выполнения услуги');
        }
        
        alert('Услуга выполнена успешно!');
        loadPage('my-records');
        
    } catch (error) {
        alert('Ошибка: ' + error.message);
    }
};

window.rejectRecord = async function(recordId) {
    if (!confirm('Вы уверены, что хотите отклонить запись?')) return;
    
    try {
        const token = localStorage.getItem('authToken');
        const response = await fetch(`/api/master/records/${recordId}/reject`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Ошибка отклонения записи');
        }
        
        alert('Запись отклонена');
        loadPage('my-records');
        
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