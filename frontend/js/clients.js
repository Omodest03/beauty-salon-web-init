// clients.js - управление клиентами

let clientsData = [];

async function loadClientsPage(container) {
    try {
        clientsData = await getClients();
        
        container.innerHTML = `
            <div class="d-flex justify-content-between align-items-center mb-4">
                <h2 class="page-title"><i class="bi bi-people"></i> Клиенты</h2>
                <div class="d-flex gap-2">
                    <input type="text" id="clientSearch" class="form-control" placeholder="Поиск по имени..." style="width: 250px;" onkeyup="searchClients()">
                    <button class="btn btn-primary" onclick="showAddClientModal()">
                        <i class="bi bi-plus"></i> Добавить клиента
                    </button>
                </div>
            </div>
            
            <div class="card card-stats">
                <div class="card-body p-0">
                    <div class="table-responsive">
                        <table class="table table-hover mb-0">
                            <thead>
                                <tr>
                                    <th>ФИО</th>
                                    <th>Телефон</th>
                                    <th style="width: 80px"></th>
                                </tr>
                            </thead>
                            <tbody id="clientsTableBody">
                                ${clientsData.map(c => `
                                    <tr>
                                        <td><span contenteditable="true" onblur="updateClientField(${c.id}, 'name', this.innerText)" onkeypress="if(event.key === 'Enter'){event.preventDefault(); this.blur();}" class="editable-field">${escapeHtml(c.name)}</span></td>
                                        <td><span contenteditable="true" onblur="updateClientField(${c.id}, 'phone', this.innerText)" onkeypress="if(event.key === 'Enter'){event.preventDefault(); this.blur();}" class="editable-field">${c.phone}</span></td>
                                        <td>
                                            <button class="btn btn-sm btn-danger" onclick="deleteClient(${c.id})">
                                                <i class="bi bi-trash"></i>
                                            </button>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
    } catch (error) {
        container.innerHTML = `<div class="alert alert-danger">Ошибка загрузки клиентов: ${error.message}</div>`;
    }
}

async function searchClients() {
    const search = document.getElementById('clientSearch').value;
    try {
        clientsData = await getClients(search);
        const tbody = document.getElementById('clientsTableBody');
        if (tbody) {
            tbody.innerHTML = clientsData.map(c => `
                <tr>
                    <td><span contenteditable="true" onblur="updateClientField(${c.id}, 'name', this.innerText)" onkeypress="if(event.key === 'Enter'){event.preventDefault(); this.blur();}" class="editable-field">${escapeHtml(c.name)}</span></td>
                    <td><span contenteditable="true" onblur="updateClientField(${c.id}, 'phone', this.innerText)" onkeypress="if(event.key === 'Enter'){event.preventDefault(); this.blur();}" class="editable-field">${c.phone}</span></td>
                    <td>
                        <button class="btn btn-sm btn-danger" onclick="deleteClient(${c.id})">
                            <i class="bi bi-trash"></i>
                        </button>
                    </td>
                </tr>
            `).join('');
        }
    } catch (error) {
        console.error('Search error:', error);
    }
}

async function updateClientField(id, field, value) {
    try {
        const client = clientsData.find(c => c.id === id);
        if (!client) return;
        
        let parsedValue = value;
        if (field === 'phone') {
            parsedValue = value.replace(/\D/g, '');
            if (parsedValue.length !== 10) {
                alert('Телефон должен содержать 10 цифр');
                loadPage('clients');
                return;
            }
        }
        
        const updated = { ...client };
        if (field === 'name') updated.name = parsedValue;
        if (field === 'phone') updated.phone = parsedValue;
        
        await updateClient(id, { name: updated.name, phone: updated.phone });
        loadPage('clients');
    } catch (error) {
        alert('Ошибка сохранения: ' + error.message);
        loadPage('clients');
    }
}

function showAddClientModal() {
    const modalHtml = `
        <div class="modal fade" id="clientModal" tabindex="-1">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Добавить клиента</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="mb-3">
                            <label>ФИО</label>
                            <input type="text" class="form-control" id="clientName">
                        </div>
                        <div class="mb-3">
                            <label>Телефон (10 цифр)</label>
                            <input type="text" class="form-control" id="clientPhone" maxlength="10" placeholder="9123456789">
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Отмена</button>
                        <button type="button" class="btn btn-primary" id="saveClientBtn">Сохранить</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    const oldModal = document.getElementById('clientModal');
    if (oldModal) oldModal.remove();
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    const modal = new bootstrap.Modal(document.getElementById('clientModal'));
    modal.show();
    
    document.getElementById('saveClientBtn').onclick = async () => {
        const name = document.getElementById('clientName').value.trim();
        let phone = document.getElementById('clientPhone').value.trim();
        
        if (!name) {
            alert('Введите ФИО клиента');
            return;
        }
        
        phone = phone.replace(/\D/g, '');
        if (phone.length !== 10) {
            alert('Телефон должен содержать 10 цифр');
            return;
        }
        
        try {
            await createClient({ name, phone });
            modal.hide();
            loadPage('clients');
        } catch (error) {
            alert('Ошибка: ' + error.message);
        }
    };
}

async function deleteClient(id) {
    if (!confirm('Удалить клиента? Это действие нельзя отменить.')) return;
    
    try {
        await deleteClient(id);
        loadPage('clients');
    } catch (error) {
        alert('Ошибка удаления: ' + error.message);
    }
}