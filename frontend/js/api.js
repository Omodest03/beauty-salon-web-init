const API_BASE = '/api';

async function apiRequest(endpoint, options = {}) {
    const token = localStorage.getItem('authToken');
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };
    
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    
    const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers
    });
    
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Ошибка запроса');
    }
    
    if (response.status === 204) {
        return null;
    }
    
    return response.json();
}

// Материалы
async function getMaterials() {
    return apiRequest('/materials');
}

async function createMaterial(data) {
    return apiRequest('/materials', { method: 'POST', body: JSON.stringify(data) });
}

async function updateMaterial(id, data) {
    return apiRequest(`/materials/${id}`, { method: 'PUT', body: JSON.stringify(data) });
}

async function deleteMaterial(id) {
    return apiRequest(`/materials/${id}`, { method: 'DELETE' });
}

// Поставщики
async function getProviders() {
    return apiRequest('/providers');
}

async function createProvider(data) {
    return apiRequest('/providers', { method: 'POST', body: JSON.stringify(data) });
}

async function updateProvider(id, data) {
    return apiRequest(`/providers/${id}`, { method: 'PUT', body: JSON.stringify(data) });
}

async function deleteProvider(id) {
    return apiRequest(`/providers/${id}`, { method: 'DELETE' });
}

// Услуги
async function getServices() {
    return apiRequest('/services');
}

async function createService(data) {
    return apiRequest('/services', { method: 'POST', body: JSON.stringify(data) });
}

async function updateService(id, data) {
    return apiRequest(`/services/${id}`, { method: 'PUT', body: JSON.stringify(data) });
}

async function deleteService(id) {
    return apiRequest(`/services/${id}`, { method: 'DELETE' });
}

// Клиенты
async function getClients(search = '') {
    const query = search ? `?search=${encodeURIComponent(search)}` : '';
    return apiRequest(`/clients${query}`);
}

async function getClient(id) {
    return apiRequest(`/clients/${id}`);
}

async function createClient(data) {
    return apiRequest('/clients', { method: 'POST', body: JSON.stringify(data) });
}

async function updateClient(id, data) {
    return apiRequest(`/clients/${id}`, { method: 'PUT', body: JSON.stringify(data) });
}

async function deleteClient(id) {
    return apiRequest(`/clients/${id}`, { method: 'DELETE' });
}

// Записи
async function getRecords(date = '') {
    const query = date ? `?date=${date}` : '';
    return apiRequest(`/records${query}`);
}

async function getRecord(id) {
    return apiRequest(`/records/${id}`);
}

async function createRecord(data) {
    return apiRequest('/records', { method: 'POST', body: JSON.stringify(data) });
}

async function cancelRecord(id) {
    return apiRequest(`/records/${id}/cancel`, { method: 'PUT' });
}

// Поставки
async function getSupplies() {
    return apiRequest('/supplies');
}

async function getDraftSupplies() {
    return apiRequest('/supplies/draft');
}

async function getSupplyDetails(id) {
    return apiRequest(`/supplies/${id}`);
}

async function createSupply(data) {
    return apiRequest('/supplies', { method: 'POST', body: JSON.stringify(data) });
}

async function confirmSupply(id) {
    return apiRequest(`/supplies/${id}/confirm`, { method: 'PUT' });
}

async function rejectSupply(id) {
    return apiRequest(`/supplies/${id}/reject`, { method: 'PUT' });
}

// Сотрудники 
async function getEmployees() {
    return apiRequest('/employees');
}

async function getEmployee(id) {
    return apiRequest(`/employees/${id}`);
}

async function createEmployee(data) {
    return apiRequest('/employees', { method: 'POST', body: JSON.stringify(data) });
}

async function updateEmployee(id, data) {
    return apiRequest(`/employees/${id}`, { method: 'PUT', body: JSON.stringify(data) });
}

async function deleteEmployee(id) {
    return apiRequest(`/employees/${id}`, { method: 'DELETE' });
}

// Мастер
async function getMyRecords() {
    return apiRequest('/master/records');
}

async function completeRecord(id, payment_method) {
    return apiRequest(`/master/records/${id}/complete`, { 
        method: 'PUT',
        body: JSON.stringify({ payment_method })
    });
}

// Получить мастеров 
window.getMasters = async function(serviceId = null) {
    const url = serviceId ? `/api/employees/masters?serviceId=${serviceId}` : '/api/employees/masters';
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error('getMasters error:', error);
        throw error;
    }
};
// Проверка доступности материалов для услуги
window.checkMaterialsAvailability = async function(serviceId) {
    const response = await fetch(`/api/services/${serviceId}/materials-check`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
    });
    if (!response.ok) {
        throw new Error('Ошибка проверки материалов');
    }
    return response.json();
};

async function rejectRecord(id) {
    return apiRequest(`/master/records/${id}/reject`, { method: 'PUT' });
}

// Отчёт
async function getReport(from, to) {
    return apiRequest(`/report?from=${from}&to=${to}`);
}

async function getFreeSlots(masterId, date, duration) {
    return apiRequest(`/records/masters/${masterId}/free-slots?date=${date}&duration=${duration}`);
}
// Функция форматирования даты (глобальная)
window.formatDate = function(dateStr) {
    if (!dateStr) return '';
    try {
        if (dateStr.match(/^\d{2}\.\d{2}\.\d{4}$/)) return dateStr;
        if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
            return dateStr.split('-').reverse().join('.');
        }
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return dateStr;
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear();
        return `${day}.${month}.${year}`;
    } catch (e) {
        return dateStr;
    }
};
// Получить материалы для услуги
window.getServiceMaterials = async function(serviceId) {
    const response = await fetch(`/api/services/${serviceId}/materials-check`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
    });
    if (!response.ok) {
        throw new Error('Ошибка загрузки материалов');
    }
    return response.json();
};