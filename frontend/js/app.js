// app.js - главный контроллер приложения

let currentPage = 'materials';

async function loadPage(page) {
    const contentDiv = document.getElementById('page-content');
    
    // Показываем индикатор загрузки
    contentDiv.innerHTML = `
        <div class="text-center py-5">
            <div class="spinner-border" style="color: #7B9E6B;" role="status">
                <span class="visually-hidden">Загрузка...</span>
            </div>
            <p class="mt-2 text-muted">Загрузка...</p>
        </div>
    `;
    
    switch(page) {
        case 'materials':
            await loadMaterialsPage(contentDiv);
            break;
        case 'providers':
            await loadProvidersPage(contentDiv);
            break;
        case 'services':
            await loadServicesPage(contentDiv);
            break;
        case 'clients':
            await loadClientsPage(contentDiv);
            break;
        case 'records':
            await loadRecordsPage(contentDiv);
            break;
        case 'supplies':
            await loadSuppliesPage(contentDiv);
            break;
        case 'supplies-pending':
            await loadPendingSuppliesPage(contentDiv);
            break;
        case 'my-records':
            await loadMyRecordsPage(contentDiv);
            break;
        case 'employees':
            await loadEmployeesPage(contentDiv);
            break;
        case 'report':
            await loadReportPage(contentDiv);
            break;
        case 'supplies-pending':
            await loadPendingSuppliesPage(contentDiv);
            break;
        case 'employees-report':
            await loadEmployeesReportPage(contentDiv);
            break;
        case 'employees':
            if (typeof loadEmployeesPage === 'function') {
                await loadEmployeesPage(contentDiv);
            } else {
                contentDiv.innerHTML = '<div class="alert alert-danger">Ошибка: страница сотрудников не загружена</div>';
            }
            break;
        default:
            contentDiv.innerHTML = '<div class="alert alert-warning">Страница не найдена</div>';
    }
}

function setActivePage(page) {
    currentPage = page;
    document.querySelectorAll('#navMenu .nav-link').forEach(link => {
        if (link.dataset.page === page) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });
}