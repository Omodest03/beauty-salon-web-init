// services.js - управление услугами

let servicesData = [];

async function loadServicesPage(container) {
    try {
        servicesData = await getServices();
        
        container.innerHTML = `
            <div class="d-flex justify-content-between align-items-center mb-4">
                <h2 class="page-title"><i class="bi bi-star"></i> Услуги салона</h2>
                <button class="btn btn-primary" onclick="showAddServiceModal()">
                    <i class="bi bi-plus"></i> Добавить услугу
                </button>
            </div>
            
            <div class="card card-stats">
                <div class="card-body p-0">
                    <div class="table-responsive">
                        <table class="table table-hover mb-0">
                            <thead>
                                <tr>
                                    <th>Название</th>
                                    <th>Категория</th>
                                    <th>Цена</th>
                                    <th>Длительность (мин)</th>
                                    <th style="width: 80px"></th>
                                </tr>
                            </thead>
                            <tbody>
                                ${servicesData.map(s => `
                                    <tr>
                                        <td><span contenteditable="true" onblur="updateServiceField(${s.id}, 'name', this.innerText)" onkeypress="if(event.key === 'Enter'){event.preventDefault(); this.blur();}" class="editable-field">${escapeHtml(s.name)}</span></td>
                                        <td><span contenteditable="true" onblur="updateServiceField(${s.id}, 'category', this.innerText)" onkeypress="if(event.key === 'Enter'){event.preventDefault(); this.blur();}" class="editable-field">${escapeHtml(s.category)}</span></td>
                                        <td><span contenteditable="true" onblur="updateServiceField(${s.id}, 'price', this.innerText)" onkeypress="if(event.key === 'Enter'){event.preventDefault(); this.blur();}" class="editable-field numeric-field">${s.price}</span></td>
                                        <td><span contenteditable="true" onblur="updateServiceField(${s.id}, 'duration', this.innerText)" onkeypress="if(event.key === 'Enter'){event.preventDefault(); this.blur();}" class="editable-field numeric-field">${s.duration}</span></td>
                                        <td class="text-nowrap">
                                            <button class="btn btn-sm btn-info me-1" onclick="window.viewServiceMaterials(${s.id}, '${escapeHtml(s.name)}')" title="Материалы">
                                                <i class="bi bi-box-seam"></i> Материалы
                                            </button>
                                            <button class="btn btn-sm btn-danger" onclick="window.deleteService(${s.id})" title="Удалить">
                                                <i class="bi bi-trash"></i>
                                            </button>
                                        </span>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
    } catch (error) {
        container.innerHTML = `<div class="alert alert-danger">Ошибка загрузки услуг: ${error.message}</div>`;
    }
}

async function updateServiceField(id, field, value) {
    try {
        const service = servicesData.find(s => s.id === id);
        if (!service) return;
        
        let parsedValue = value;
        if (field === 'price' || field === 'duration') {
            parsedValue = parseFloat(value);
            if (isNaN(parsedValue)) {
                alert('Введите число');
                loadPage('services');
                return;
            }
        }
        
        const updated = { ...service };
        if (field === 'name') updated.name = parsedValue;
        if (field === 'category') updated.category = parsedValue;
        if (field === 'price') updated.price = parsedValue;
        if (field === 'duration') updated.duration = parsedValue;
        
        await updateService(id, {
            name: updated.name,
            category: updated.category,
            price: updated.price,
            duration: updated.duration
        });
        
        loadPage('services');
    } catch (error) {
        alert('Ошибка сохранения: ' + error.message);
        loadPage('services');
    }
}

function showAddServiceModal() {
    const modalHtml = `
        <div class="modal fade" id="serviceModal" tabindex="-1">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Добавить услугу</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="mb-3">
                            <label>Название услуги</label>
                            <input type="text" class="form-control" id="serviceName">
                        </div>
                        <div class="mb-3">
                            <label>Категория</label>
                            <input type="text" class="form-control" id="serviceCategory" placeholder="Парикмахерские услуги, Ногтевой сервис, ...">
                        </div>
                        <div class="mb-3">
                            <label>Цена (руб)</label>
                            <input type="number" class="form-control" id="servicePrice">
                        </div>
                        <div class="mb-3">
                            <label>Длительность (минуты)</label>
                            <input type="number" class="form-control" id="serviceDuration">
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Отмена</button>
                        <button type="button" class="btn btn-primary" id="saveServiceBtn">Сохранить</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Удаляем старый модал, если есть
    const oldModal = document.getElementById('serviceModal');
    if (oldModal) oldModal.remove();
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    const modal = new bootstrap.Modal(document.getElementById('serviceModal'));
    modal.show();
    
    document.getElementById('saveServiceBtn').onclick = async () => {
        const name = document.getElementById('serviceName').value.trim();
        const category = document.getElementById('serviceCategory').value.trim();
        const price = parseFloat(document.getElementById('servicePrice').value);
        const duration = parseInt(document.getElementById('serviceDuration').value);
        
        if (!name || !category || isNaN(price) || isNaN(duration)) {
            alert('Заполните все поля');
            return;
        }
        if (price <= 0) {
            alert('Цена должна быть больше 0');
            return;
        }
        if (duration <= 0) {
            alert('Длительность должна быть больше 0');
            return;
        }
        
        try {
            await createService({ name, category, price, duration });
            modal.hide();
            loadPage('services');
        } catch (error) {
            alert('Ошибка: ' + error.message);
        }
    };
}

async function deleteService(id) {
    if (!confirm('Удалить услугу? Это действие нельзя отменить.')) return;
    
    try {
        await deleteService(id);
        loadPage('services');
    } catch (error) {
        alert('Ошибка удаления: ' + error.message);
    }
}
window.viewServiceMaterials = async function(serviceId, serviceName) {
    try {
        const data = await window.getServiceMaterials(serviceId);
        
        const modalTitle = document.getElementById('serviceMaterialsTitle');
        modalTitle.textContent = `Материалы для услуги: ${serviceName}`;
        
        const tbody = document.getElementById('serviceMaterialsBody');
        
        if (!data.materials || data.materials.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center">Для этой услуги не требуются материалы</td></tr>';
        } else {
            tbody.innerHTML = data.materials.map(m => `
                <tr>
                    <td>${escapeHtml(m.name)}</span>
                    <td>${m.required} ${m.unit}</span>
                    <td>${m.remains.toFixed(1)} ${m.unit}</span>
                    <td><span class="badge ${m.statusClass}">${m.status === 'доступно' ? 'Доступно' : (m.status === 'на грани' ? 'На грани' : 'Дефицит')}</span></span>
                </tr>
            `).join('');
        }
        
        const modal = new bootstrap.Modal(document.getElementById('serviceMaterialsModal'));
        modal.show();
        
    } catch (error) {
        console.error('Error loading materials:', error);
        alert('Ошибка загрузки материалов: ' + error.message);
    }
};