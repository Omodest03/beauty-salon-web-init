// employees.js - управление сотрудниками

let employeesData = [];
let employeesCurrentPage = 1;
let employeesItemsPerPage = 15;
let employeesFiltered = [];

async function loadEmployeesPage(container) {
    try {
        await fetchEmployees();
        renderEmployeesTable(container);
    } catch (error) {
        console.error('Error:', error);
        container.innerHTML = `<div class="alert alert-danger">Ошибка загрузки: ${error.message}</div>`;
    }
}

async function fetchEmployees() {
    const token = localStorage.getItem('authToken');
    const response = await fetch('/api/employees', {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!response.ok) {
        throw new Error('Ошибка загрузки сотрудников');
    }
    
    employeesData = await response.json();
    employeesFiltered = [...employeesData];
    employeesCurrentPage = 1;
}

function renderEmployeesTable(container) {
    const totalItems = employeesFiltered.length;
    const totalPages = Math.ceil(totalItems / employeesItemsPerPage);
    const start = (employeesCurrentPage - 1) * employeesItemsPerPage;
    const end = start + employeesItemsPerPage;
    const pageData = employeesFiltered.slice(start, end);
    
    container.innerHTML = `
        <div class="d-flex justify-content-between align-items-center mb-4">
            <h2 class="page-title"><i class="bi bi-people"></i> Сотрудники</h2>
            <div class="d-flex gap-2">
                <input type="text" id="searchEmployeesInput" class="form-control" placeholder="Поиск по имени..." style="width: 250px;">
                <button class="btn btn-primary" onclick="window.showAddEmployeeModal()">
                    <i class="bi bi-plus"></i> Добавить сотрудника
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
                                <th>Должность</th>
                                <th>Логин</th>
                                <th style="width: 120px">Действия</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${pageData.map(emp => `
                                <tr>
                                    <td>
                                        <span contenteditable="true" 
                                              onblur="window.updateEmployeeField(${emp.id}, 'name', this.innerText)"
                                              onkeypress="if(event.key==='Enter'){event.preventDefault();this.blur()}"
                                              class="editable-field">
                                            ${escapeHtml(emp.name)}
                                        </span>
                                    </span>
                                    <td>
                                        <span contenteditable="true" 
                                              onblur="window.updateEmployeeField(${emp.id}, 'role', this.innerText)"
                                              onkeypress="if(event.key==='Enter'){event.preventDefault();this.blur()}"
                                              class="editable-field">
                                            ${escapeHtml(emp.role)}
                                        </span>
                                    </span>
                                    <td>
                                        <span contenteditable="true" 
                                              onblur="window.updateEmployeeField(${emp.id}, 'login', this.innerText)"
                                              onkeypress="if(event.key==='Enter'){event.preventDefault();this.blur()}"
                                              class="editable-field">
                                            ${escapeHtml(emp.login)}
                                        </span>
                                    </span>
                                    <td>
                                        <button class="btn btn-sm btn-primary me-1" onclick="window.resetEmployeePassword(${emp.id})" title="Сбросить пароль">
                                            <i class="bi bi-key"></i>
                                        </button>
                                        <button class="btn btn-sm btn-danger" onclick="window.deleteEmployee(${emp.id})">
                                            <i class="bi bi-trash"></i>
                                        </button>
                                    </span>
                                </tr>
                            `).join('')}
                            ${pageData.length === 0 ? '<tr><td colspan="4" class="text-center">Нет сотрудников</td>' : ''}
                        </tbody>
                    </span>
                </div>
                ${totalPages > 1 ? renderEmployeesPagination(totalPages, employeesCurrentPage) : ''}
            </div>
        </div>
    `;
    
    // Поиск по Enter
    const searchInput = document.getElementById('searchEmployeesInput');
    if (searchInput) {
        searchInput.onkeypress = function(e) {
            if (e.key === 'Enter') {
                const term = this.value.toLowerCase();
                if (!term) {
                    employeesFiltered = [...employeesData];
                } else {
                    employeesFiltered = employeesData.filter(e => 
                        e.name.toLowerCase().includes(term) || 
                        e.role.toLowerCase().includes(term) ||
                        e.login.toLowerCase().includes(term)
                    );
                }
                employeesCurrentPage = 1;
                renderEmployeesTable(container);
            }
        };
    }
}

function renderEmployeesPagination(totalPages, currentPage) {
    let html = '<div class="d-flex justify-content-between align-items-center p-3 border-top"><div class="text-muted">';
    const startItem = (currentPage - 1) * employeesItemsPerPage + 1;
    const endItem = Math.min(currentPage * employeesItemsPerPage, employeesFiltered.length);
    html += `Показано ${startItem}-${endItem} из ${employeesFiltered.length}`;
    html += '</div><nav><ul class="pagination mb-0">';
    
    html += `<li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
                <a class="page-link" href="#" onclick="window.changeEmployeesPage(${currentPage - 1}); return false;">«</a>
             </li>`;
    
    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, currentPage + 2);
    
    if (startPage > 1) {
        html += `<li class="page-item"><a class="page-link" href="#" onclick="window.changeEmployeesPage(1); return false;">1</a></li>`;
        if (startPage > 2) html += '<li class="page-item disabled"><span class="page-link">...</span></li>';
    }
    
    for (let i = startPage; i <= endPage; i++) {
        html += `<li class="page-item ${i === currentPage ? 'active' : ''}">
                    <a class="page-link" href="#" onclick="window.changeEmployeesPage(${i}); return false;">${i}</a>
                 </li>`;
    }
    
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) html += '<li class="page-item disabled"><span class="page-link">...</span></li>';
        html += `<li class="page-item"><a class="page-link" href="#" onclick="window.changeEmployeesPage(${totalPages}); return false;">${totalPages}</a></li>`;
    }
    
    html += `<li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
                <a class="page-link" href="#" onclick="window.changeEmployeesPage(${currentPage + 1}); return false;">»</a>
             </li>`;
    
    html += '</ul></nav></div>';
    return html;
}

// ===== ГЛОБАЛЬНЫЕ ФУНКЦИИ =====

window.changeEmployeesPage = function(page) {
    if (page < 1 || page > Math.ceil(employeesFiltered.length / employeesItemsPerPage)) return;
    employeesCurrentPage = page;
    const container = document.getElementById('page-content');
    renderEmployeesTable(container);
};

window.updateEmployeeField = async function(id, field, value) {
    try {
        const employee = employeesData.find(e => e.id === id);
        if (!employee) return;
        
        let parsedValue = value;
        if (field === 'role') {
            const allowedRoles = ['Администратор', 'Кладовщик', 'Парикмахер', 'Мастер маникюра', 'Визажист', 'Массажист'];
            if (!allowedRoles.includes(parsedValue)) {
                alert('Недопустимая должность');
                loadPage('employees');
                return;
            }
        }
        
        const updated = { ...employee };
        if (field === 'name') updated.name = parsedValue;
        if (field === 'role') updated.role = parsedValue;
        if (field === 'login') updated.login = parsedValue;
        
        const token = localStorage.getItem('authToken');
        const response = await fetch(`/api/employees/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                name: updated.name,
                role: updated.role,
                login: updated.login
            })
        });
        
        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || 'Ошибка обновления');
        }
        
        // Обновляем локальные данные
        employee.name = updated.name;
        employee.role = updated.role;
        employee.login = updated.login;
        
        // Обновляем отображение
        const searchInput = document.getElementById('searchEmployeesInput');
        const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
        if (searchTerm) {
            employeesFiltered = employeesData.filter(e => 
                e.name.toLowerCase().includes(searchTerm) ||
                e.role.toLowerCase().includes(searchTerm) ||
                e.login.toLowerCase().includes(searchTerm)
            );
        } else {
            employeesFiltered = [...employeesData];
        }
        
        renderEmployeesTable(document.getElementById('page-content'));
        
    } catch (error) {
        alert('Ошибка: ' + error.message);
        loadPage('employees');
    }
};

window.resetEmployeePassword = async function(id) {
    const newPassword = prompt('Введите новый пароль:', '123');
    if (!newPassword) return;
    if (newPassword.length < 3) {
        alert('Пароль должен содержать минимум 3 символа');
        return;
    }
    
    try {
        const employee = employeesData.find(e => e.id === id);
        if (!employee) return;
        
        const token = localStorage.getItem('authToken');
        const response = await fetch(`/api/employees/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                name: employee.name,
                role: employee.role,
                login: employee.login,
                password: newPassword
            })
        });
        
        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || 'Ошибка сброса пароля');
        }
        
        alert('Пароль успешно изменён');
        
    } catch (error) {
        alert('Ошибка: ' + error.message);
    }
};

window.showAddEmployeeModal = function() {
    document.getElementById('empName').value = '';
    document.getElementById('empRole').value = '';
    document.getElementById('empLogin').value = '';
    document.getElementById('empPassword').value = '';
    
    const modal = new bootstrap.Modal(document.getElementById('employeeModal'));
    modal.show();
    
    const saveBtn = document.getElementById('saveEmployeeBtn');
    const newSaveBtn = saveBtn.cloneNode(true);
    saveBtn.parentNode.replaceChild(newSaveBtn, saveBtn);
    
    newSaveBtn.onclick = async () => {
        const name = document.getElementById('empName').value.trim();
        const role = document.getElementById('empRole').value;
        const login = document.getElementById('empLogin').value.trim();
        const password = document.getElementById('empPassword').value;
        
        if (!name) {
            alert('Введите ФИО');
            return;
        }
        if (!role) {
            alert('Выберите должность');
            return;
        }
        if (!login) {
            alert('Введите логин');
            return;
        }
        if (!password) {
            alert('Введите пароль');
            return;
        }
        if (password.length < 3) {
            alert('Пароль должен содержать минимум 3 символа');
            return;
        }
        
        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch('/api/employees', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ name, role, login, password })
            });
            
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Ошибка создания');
            
            modal.hide();
            loadPage('employees');
            
        } catch (error) {
            alert('Ошибка: ' + error.message);
        }
    };
};

window.deleteEmployee = async function(id) {
    if (!confirm('Удалить сотрудника? Это действие нельзя отменить.')) return;
    
    try {
        const token = localStorage.getItem('authToken');
        const response = await fetch(`/api/employees/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || 'Ошибка удаления');
        }
        
        loadPage('employees');
        
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

// Экспорт основной функции загрузки страницы
window.loadEmployeesPage = loadEmployeesPage;