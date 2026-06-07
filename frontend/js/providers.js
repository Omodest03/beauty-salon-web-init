// providers.js - управление поставщиками с пагинацией

let providersData = [];
let providersCurrentPage = 1;
let providersItemsPerPage = 15;
let providersFiltered = [];

async function loadProvidersPage(container) {
    try {
        console.log('Loading providers...');
        providersData = await getProviders();
        console.log('Providers loaded:', providersData.length);
        providersFiltered = [...providersData];
        providersCurrentPage = 1;
        
        renderProvidersTable(container);
    } catch (error) {
        console.error('Error loading providers:', error);
        container.innerHTML = `<div class="alert alert-danger">Ошибка загрузки поставщиков: ${error.message}</div>`;
    }
}

function renderProvidersTable(container) {
    const totalItems = providersFiltered.length;
    const totalPages = Math.ceil(totalItems / providersItemsPerPage);
    const start = (providersCurrentPage - 1) * providersItemsPerPage;
    const end = start + providersItemsPerPage;
    const pageData = providersFiltered.slice(start, end);
    
    let html = `
        <div class="d-flex justify-content-between align-items-center mb-4">
            <h2 class="page-title"><i class="bi bi-truck"></i> Поставщики</h2>
            <div class="d-flex gap-2">
                <input type="text" id="searchProvidersInput" class="form-control" placeholder="Поиск по названию..." style="width: 250px;">
                <button class="btn btn-primary" onclick="window.showAddProviderModal()">
                    <i class="bi bi-plus"></i> Добавить поставщика
                </button>
            </div>
        </div>
        
        <div class="card card-stats">
            <div class="card-body p-0">
                <div class="table-responsive">
                    <table class="table table-hover mb-0">
                        <thead>
                            <tr>
                                <th>Название компании</th>
                                <th>Контактное лицо</th>
                                <th>Телефон</th>
                                <th>Адрес</th>
                                <th style="width: 80px"></th>
                            </tr>
                        </thead>
                        <tbody>
                            ${pageData.map(p => `
                                <tr>
                                    <td><span contenteditable="true" onblur="window.updateProviderField(${p.id}, 'name', this.innerText)" onkeypress="if(event.key === 'Enter'){event.preventDefault(); this.blur();}" class="editable-field">${escapeHtml(p.name || '')}</span></td>
                                    <td><span contenteditable="true" onblur="window.updateProviderField(${p.id}, 'contact_person', this.innerText)" onkeypress="if(event.key === 'Enter'){event.preventDefault(); this.blur();}" class="editable-field">${escapeHtml(p.contact_person || '')}</span></td>
                                    <td><span contenteditable="true" onblur="window.updateProviderField(${p.id}, 'phone', this.innerText)" onkeypress="if(event.key === 'Enter'){event.preventDefault(); this.blur();}" class="editable-field">${p.phone || ''}</span></td>
                                    <td><span contenteditable="true" onblur="window.updateProviderField(${p.id}, 'address', this.innerText)" onkeypress="if(event.key === 'Enter'){event.preventDefault(); this.blur();}" class="editable-field">${escapeHtml(p.address || '')}</span></td>
                                    <td>
                                        <button class="btn btn-sm btn-danger" onclick="window.deleteProvider(${p.id})">
                                            <i class="bi bi-trash"></i>
                                        </button>
                                    </td>
                                </tr>
                            `).join('')}
                            ${pageData.length === 0 ? '<tr><td colspan="5" class="text-center">Нет данных</td>' : ''}
                        </tbody>
                    </table>
                </div>
                ${renderProvidersPagination(totalPages)}
            </div>
        </div>
    `;
    
    container.innerHTML = html;
    
    const searchInput = document.getElementById('searchProvidersInput');
    if (searchInput) {
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                const searchTerm = this.value.toLowerCase();
                if (!searchTerm) {
                    filteredProviders = [...providersData];
                } else {
                    filteredProviders = providersData.filter(p => 
                        (p.name || '').toLowerCase().includes(searchTerm)
                    );
                }
                currentPage = 1;
                renderProvidersTable(container);
            }
        });
    }
}

function renderProvidersPagination(totalPages) {
    if (totalPages <= 1) return '';
    
    let html = '<div class="d-flex justify-content-between align-items-center p-3 border-top"><div class="text-muted">';
    const startItem = (providersCurrentPage - 1) * providersItemsPerPage + 1;
    const endItem = Math.min(providersCurrentPage * providersItemsPerPage, providersFiltered.length);
    html += `Показано ${startItem}-${endItem} из ${providersFiltered.length}`;
    html += '</div><nav><ul class="pagination mb-0">';
    
    html += `<li class="page-item ${providersCurrentPage === 1 ? 'disabled' : ''}">
                <a class="page-link" href="#" onclick="window.changeProvidersPage(${providersCurrentPage - 1}); return false;">«</a>
             </li>`;
    
    let startPage = Math.max(1, providersCurrentPage - 2);
    let endPage = Math.min(totalPages, providersCurrentPage + 2);
    
    if (startPage > 1) {
        html += `<li class="page-item"><a class="page-link" href="#" onclick="window.changeProvidersPage(1); return false;">1</a></li>`;
        if (startPage > 2) html += '<li class="page-item disabled"><span class="page-link">...</span></li>';
    }
    
    for (let i = startPage; i <= endPage; i++) {
        html += `<li class="page-item ${i === providersCurrentPage ? 'active' : ''}">
                    <a class="page-link" href="#" onclick="window.changeProvidersPage(${i}); return false;">${i}</a>
                 </li>`;
    }
    
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) html += '<li class="page-item disabled"><span class="page-link">...</span></li>';
        html += `<li class="page-item"><a class="page-link" href="#" onclick="window.changeProvidersPage(${totalPages}); return false;">${totalPages}</a></li>`;
    }
    
    html += `<li class="page-item ${providersCurrentPage === totalPages ? 'disabled' : ''}">
                <a class="page-link" href="#" onclick="window.changeProvidersPage(${providersCurrentPage + 1}); return false;">»</a>
             </li>`;
    
    html += '</ul></nav></div>';
    return html;
}

window.changeProvidersPage = function(page) {
    if (page < 1 || page > Math.ceil(providersFiltered.length / providersItemsPerPage)) return;
    providersCurrentPage = page;
    const container = document.getElementById('page-content');
    renderProvidersTable(container);
};

window.updateProviderField = async function(id, field, value) {
    try {
        const provider = providersData.find(p => p.id === id);
        if (!provider) return;
        
        let parsedValue = value;
        if (field === 'phone') {
            parsedValue = value.replace(/\D/g, '');
            if (parsedValue.length !== 10) {
                alert('Телефон должен содержать 10 цифр');
                loadPage('providers');
                return;
            }
        }
        
        const updated = { ...provider };
        if (field === 'name') updated.name = parsedValue;
        if (field === 'contact_person') updated.contact_person = parsedValue;
        if (field === 'phone') updated.phone = parsedValue;
        if (field === 'address') updated.address = parsedValue;
        
        await updateProvider(id, {
            name: updated.name,
            contact_person: updated.contact_person,
            phone: updated.phone,
            address: updated.address
        });
        
        provider.name = updated.name;
        provider.contact_person = updated.contact_person;
        provider.phone = updated.phone;
        provider.address = updated.address;
        
        const searchInput = document.getElementById('searchProvidersInput');
        const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
        if (searchTerm) {
            providersFiltered = providersData.filter(p => 
                (p.name || '').toLowerCase().includes(searchTerm)
            );
        } else {
            providersFiltered = [...providersData];
        }
        
        const container = document.getElementById('page-content');
        renderProvidersTable(container);
        
    } catch (error) {
        alert('Ошибка сохранения: ' + error.message);
        loadPage('providers');
    }
};

window.showAddProviderModal = function() {
    document.getElementById('providerId').value = '';
    document.getElementById('providerName').value = '';
    document.getElementById('providerContact').value = '';
    document.getElementById('providerPhone').value = '';
    document.getElementById('providerAddress').value = '';
    
    const modal = new bootstrap.Modal(document.getElementById('providerModal'));
    modal.show();
    
    const saveBtn = document.getElementById('saveProviderBtn');
    const newSaveBtn = saveBtn.cloneNode(true);
    saveBtn.parentNode.replaceChild(newSaveBtn, saveBtn);
    
    newSaveBtn.onclick = async () => {
        const name = document.getElementById('providerName').value.trim();
        const contact_person = document.getElementById('providerContact').value.trim();
        let phone = document.getElementById('providerPhone').value.trim();
        const address = document.getElementById('providerAddress').value.trim();
        
        if (!name) {
            alert('Введите название компании');
            return;
        }
        if (!contact_person) {
            alert('Введите контактное лицо');
            return;
        }
        
        phone = phone.replace(/\D/g, '');
        if (phone.length !== 10) {
            alert('Телефон должен содержать 10 цифр');
            return;
        }
        
        try {
            await createProvider({ name, contact_person, phone, address });
            modal.hide();
            loadPage('providers');
        } catch (error) {
            alert('Ошибка: ' + error.message);
        }
    };
};

window.deleteProvider = async function(id) {
    if (!confirm('Удалить поставщика? Это действие нельзя отменить.')) return;
    
    try {
        await deleteProvider(id);
        loadPage('providers');
    } catch (error) {
        alert('Ошибка удаления: ' + error.message);
    }
};

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}