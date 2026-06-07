// materials.js - управление материалами с пагинацией

let materialsData = [];
let materialsCurrentPage = 1;
let materialsItemsPerPage = 15;
let materialsFiltered = [];

async function loadMaterialsPage(container) {
    try {
        console.log('Loading materials...');
        materialsData = await getMaterials();
        console.log('Materials loaded:', materialsData.length);
        materialsFiltered = [...materialsData];
        materialsCurrentPage = 1;
        
        renderMaterialsTable(container);
    } catch (error) {
        console.error('Error loading materials:', error);
        container.innerHTML = `<div class="alert alert-danger">Ошибка загрузки материалов: ${error.message}</div>`;
    }
}

function renderMaterialsTable(container) {
    const totalItems = materialsFiltered.length;
    const totalPages = Math.ceil(totalItems / materialsItemsPerPage);
    const start = (materialsCurrentPage - 1) * materialsItemsPerPage;
    const end = start + materialsItemsPerPage;
    const pageData = materialsFiltered.slice(start, end);
    
    let html = `
        <div class="d-flex justify-content-between align-items-center mb-4">
            <h2 class="page-title"><i class="bi bi-box-seam"></i> Материалы</h2>
            <div class="d-flex gap-2">
                <input type="text" id="searchMaterialsInput" class="form-control" placeholder="Поиск по названию..." style="width: 250px;">
                <button class="btn btn-primary" onclick="window.showAddMaterialModal()">
                    <i class="bi bi-plus"></i> Добавить материал
                </button>
            </div>
        </div>
        
        <div class="card card-stats">
            <div class="card-body p-0">
                <div class="table-responsive">
                    <table class="table table-hover mb-0">
                        <thead>
                            <tr>
                                <th>Название</th>
                                <th>Ед. изм.</th>
                                <th>Минимум</th>
                                <th>Остаток</th>
                                <th>Статус</th>
                                <th style="width: 80px"></th>
                            </tr>
                        </thead>
                        <tbody>
                            ${pageData.map(m => `
                                <tr class="${m.is_deficit ? 'table-deficit' : ''}">
                                    <td><span contenteditable="true" onblur="window.updateMaterialField(${m.id}, 'name', this.innerText)" onkeypress="if(event.key === 'Enter'){event.preventDefault(); this.blur();}" class="editable-field">${escapeHtml(m.name)}</span></td>
                                    <td><span contenteditable="true" onblur="window.updateMaterialField(${m.id}, 'unit', this.innerText)" onkeypress="if(event.key === 'Enter'){event.preventDefault(); this.blur();}" class="editable-field">${escapeHtml(m.unit)}</span></td>
                                    <td><span contenteditable="true" onblur="window.updateMaterialField(${m.id}, 'min_stock', this.innerText)" onkeypress="if(event.key === 'Enter'){event.preventDefault(); this.blur();}" class="editable-field numeric-field">${m.min_stock}</span></td>
                                    <td><span contenteditable="true" onblur="window.updateMaterialField(${m.id}, 'remains', this.innerText)" onkeypress="if(event.key === 'Enter'){event.preventDefault(); this.blur();}" class="editable-field numeric-field">${m.remains}</span></td>
                                    <td>
                                        ${m.is_deficit ? '<span class="deficit-badge">Дефицит</span>' : 
                                          (m.remains <= m.min_stock * 1.2 ? '<span class="warning-badge">На грани</span>' : 
                                           '<span class="badge bg-success">Норма</span>')}
                                    </td>
                                    <td>
                                        <button class="btn btn-sm btn-danger" onclick="window.deleteMaterial(${m.id})">
                                            <i class="bi bi-trash"></i>
                                        </button>
                                    </td>
                                </tr>
                            `).join('')}
                            ${pageData.length === 0 ? '<tr><td colspan="6" class="text-center">Нет данных</td>' : ''}
                        </tbody>
                    </table>
                </div>
                ${renderMaterialsPagination(totalPages)}
            </div>
        </div>
    `;
    
    container.innerHTML = html;
    
    const searchInput = document.getElementById('searchMaterialsInput');
    if (searchInput) {
        // Поиск только при нажатии Enter
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                const searchTerm = this.value.toLowerCase();
                if (!searchTerm) {
                    filteredMaterials = [...materialsData];
                } else {
                    filteredMaterials = materialsData.filter(m => 
                        m.name.toLowerCase().includes(searchTerm)
                    );
                }
                currentPage = 1;
                renderMaterialsTable(container);
            }
        });
    }
}

function renderMaterialsPagination(totalPages) {
    if (totalPages <= 1) return '';
    
    let html = '<div class="d-flex justify-content-between align-items-center p-3 border-top"><div class="text-muted">';
    const startItem = (materialsCurrentPage - 1) * materialsItemsPerPage + 1;
    const endItem = Math.min(materialsCurrentPage * materialsItemsPerPage, materialsFiltered.length);
    html += `Показано ${startItem}-${endItem} из ${materialsFiltered.length}`;
    html += '</div><nav><ul class="pagination mb-0">';
    
    html += `<li class="page-item ${materialsCurrentPage === 1 ? 'disabled' : ''}">
                <a class="page-link" href="#" onclick="window.changeMaterialsPage(${materialsCurrentPage - 1}); return false;">«</a>
             </li>`;
    
    let startPage = Math.max(1, materialsCurrentPage - 2);
    let endPage = Math.min(totalPages, materialsCurrentPage + 2);
    
    if (startPage > 1) {
        html += `<li class="page-item"><a class="page-link" href="#" onclick="window.changeMaterialsPage(1); return false;">1</a></li>`;
        if (startPage > 2) html += '<li class="page-item disabled"><span class="page-link">...</span></li>';
    }
    
    for (let i = startPage; i <= endPage; i++) {
        html += `<li class="page-item ${i === materialsCurrentPage ? 'active' : ''}">
                    <a class="page-link" href="#" onclick="window.changeMaterialsPage(${i}); return false;">${i}</a>
                 </li>`;
    }
    
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) html += '<li class="page-item disabled"><span class="page-link">...</span></li>';
        html += `<li class="page-item"><a class="page-link" href="#" onclick="window.changeMaterialsPage(${totalPages}); return false;">${totalPages}</a></li>`;
    }
    
    html += `<li class="page-item ${materialsCurrentPage === totalPages ? 'disabled' : ''}">
                <a class="page-link" href="#" onclick="window.changeMaterialsPage(${materialsCurrentPage + 1}); return false;">»</a>
             </li>`;
    
    html += '</ul></nav></div>';
    return html;
}

window.changeMaterialsPage = function(page) {
    if (page < 1 || page > Math.ceil(materialsFiltered.length / materialsItemsPerPage)) return;
    materialsCurrentPage = page;
    const container = document.getElementById('page-content');
    renderMaterialsTable(container);
};

window.updateMaterialField = async function(id, field, value) {
    try {
        const material = materialsData.find(m => m.id === id);
        if (!material) return;
        
        let parsedValue = value;
        if (field === 'min_stock' || field === 'remains') {
            parsedValue = parseFloat(value);
            if (isNaN(parsedValue)) {
                alert('Введите число');
                loadPage('materials');
                return;
            }
        }
        
        const updated = { ...material };
        if (field === 'name') updated.name = parsedValue;
        if (field === 'unit') updated.unit = parsedValue;
        if (field === 'min_stock') updated.min_stock = parsedValue;
        if (field === 'remains') updated.remains = parsedValue;
        
        await updateMaterial(id, {
            name: updated.name,
            unit: updated.unit,
            min_stock: updated.min_stock,
            remains: updated.remains
        });
        
        material.name = updated.name;
        material.unit = updated.unit;
        material.min_stock = updated.min_stock;
        material.remains = updated.remains;
        material.is_deficit = updated.remains < updated.min_stock;
        
        const searchInput = document.getElementById('searchMaterialsInput');
        const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
        if (searchTerm) {
            materialsFiltered = materialsData.filter(m => 
                m.name.toLowerCase().includes(searchTerm)
            );
        } else {
            materialsFiltered = [...materialsData];
        }
        
        const container = document.getElementById('page-content');
        renderMaterialsTable(container);
        
    } catch (error) {
        alert('Ошибка сохранения: ' + error.message);
        loadPage('materials');
    }
};

window.showAddMaterialModal = function() {
    document.getElementById('materialId').value = '';
    document.getElementById('materialName').value = '';
    document.getElementById('materialUnit').value = '';
    document.getElementById('materialMinStock').value = '';
    document.getElementById('materialRemains').value = '';
    
    const modal = new bootstrap.Modal(document.getElementById('materialModal'));
    modal.show();
    
    const saveBtn = document.getElementById('saveMaterialBtn');
    const newSaveBtn = saveBtn.cloneNode(true);
    saveBtn.parentNode.replaceChild(newSaveBtn, saveBtn);
    
    newSaveBtn.onclick = async () => {
        const name = document.getElementById('materialName').value.trim();
        const unit = document.getElementById('materialUnit').value.trim();
        const min_stock = parseFloat(document.getElementById('materialMinStock').value);
        const remains = parseFloat(document.getElementById('materialRemains').value) || 0;
        
        if (!name) {
            alert('Введите название материала');
            return;
        }
        if (!unit) {
            alert('Введите единицу измерения');
            return;
        }
        if (isNaN(min_stock)) {
            alert('Введите минимальный остаток');
            return;
        }
        if (min_stock <= 0) {
            alert('Минимальный остаток должен быть больше 0');
            return;
        }
        if (remains < 0) {
            alert('Остаток не может быть отрицательным');
            return;
        }
        
        try {
            await createMaterial({ name, unit, min_stock, remains });
            modal.hide();
            loadPage('materials');
        } catch (error) {
            alert('Ошибка: ' + error.message);
        }
    };
};

window.deleteMaterial = async function(id) {
    if (!confirm('Удалить материал? Это действие нельзя отменить.')) return;
    
    try {
        await deleteMaterial(id);
        loadPage('materials');
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