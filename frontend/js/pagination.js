// pagination.js - общая функция для пагинации

function renderPagination(moduleName, totalPages, currentPage) {
    if (totalPages <= 1) return '';
    
    let html = '<div class="d-flex justify-content-between align-items-center p-3 border-top"><div class="text-muted">';
    const startItem = (currentPage - 1) * 15 + 1;
    const endItem = Math.min(currentPage * 15, totalPages * 15);
    html += `Показано ${startItem}-${endItem} из ${totalPages * 15}`;
    html += '</div><nav><ul class="pagination mb-0">';
    
    // Предыдущая
    html += `<li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
                <a class="page-link" href="#" onclick="change${moduleName}Page(${currentPage - 1}); return false;">«</a>
             </li>`;
    
    // Номера страниц
    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, currentPage + 2);
    
    if (startPage > 1) {
        html += `<li class="page-item"><a class="page-link" href="#" onclick="change${moduleName}Page(1); return false;">1</a></li>`;
        if (startPage > 2) html += '<li class="page-item disabled"><span class="page-link">...</span></li>';
    }
    
    for (let i = startPage; i <= endPage; i++) {
        html += `<li class="page-item ${i === currentPage ? 'active' : ''}">
                    <a class="page-link" href="#" onclick="change${moduleName}Page(${i}); return false;">${i}</a>
                 </li>`;
    }
    
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) html += '<li class="page-item disabled"><span class="page-link">...</span></li>';
        html += `<li class="page-item"><a class="page-link" href="#" onclick="change${moduleName}Page(${totalPages}); return false;">${totalPages}</a></li>`;
    }
    
    // Следующая
    html += `<li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
                <a class="page-link" href="#" onclick="change${moduleName}Page(${currentPage + 1}); return false;">»</a>
             </li>`;
    
    html += '</ul></nav></div>';
    return html;
}

function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}