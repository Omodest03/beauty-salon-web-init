// auth.js - управление аутентификацией

let currentUser = null;
let authToken = null;

async function login() {
    console.log('1. login() started');
    const login = document.getElementById('loginInput').value.trim();
    const password = document.getElementById('passwordInput').value.trim();
    const errorDiv = document.getElementById('loginError');
    
    console.log('2. Login:', login, 'Password length:', password.length);
    
    if (!login || !password) {
        console.log('3. Empty credentials');
        errorDiv.textContent = 'Введите логин и пароль';
        errorDiv.classList.remove('d-none');
        return;
    }
    
    try {
        console.log('4. Sending fetch request to /api/auth/login');
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ login, password })
        });
        
        console.log('5. Response status:', response.status);
        
        const data = await response.json();
        console.log('6. Response data:', data);
        
        if (!response.ok) {
            throw new Error(data.error || 'Ошибка входа');
        }
        
        console.log('7. Login successful, saving token');
        authToken = data.token;
        currentUser = data.user;
        
        localStorage.setItem('authToken', authToken);
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        
        console.log('8. Hiding login form, showing app');
        
        // ==== ПРИНУДИТЕЛЬНОЕ СКРЫТИЕ ЛОГИНА ====
        const loginDiv = document.getElementById('loginContainer');
        // Удаляем конфликтующие классы Bootstrap
        loginDiv.classList.remove('d-flex', 'align-items-center', 'justify-content-center');
        // Устанавливаем display: none через style
        loginDiv.style.setProperty('display', 'none', 'important');
        loginDiv.style.visibility = 'hidden';
        // Добавляем класс-заглушку
        loginDiv.classList.add('hidden-login');
        
        // Показываем основной интерфейс
        const appDiv = document.getElementById('appContainer');
        appDiv.style.setProperty('display', 'block', 'important');
        appDiv.style.visibility = 'visible';
        
        console.log('9. Loading menu and page');
        loadMenuByRole();
        loadPage(getDefaultPage());
        
        console.log('10. Done!');
        
    } catch (error) {
        console.error('ERROR:', error);
        errorDiv.textContent = error.message;
        errorDiv.classList.remove('d-none');
    }
}

function logout() {
    authToken = null;
    currentUser = null;
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    
    // Показываем форму входа
    const loginDiv = document.getElementById('loginContainer');
    loginDiv.classList.add('d-flex', 'align-items-center', 'justify-content-center');
    loginDiv.style.removeProperty('display');
    loginDiv.style.removeProperty('visibility');
    loginDiv.classList.remove('hidden-login');
    
    // Скрываем приложение
    document.getElementById('appContainer').style.display = 'none';
    
    // Очищаем поля
    const loginInput = document.getElementById('loginInput');
    const passwordInput = document.getElementById('passwordInput');
    if (loginInput) loginInput.value = '';
    if (passwordInput) passwordInput.value = '';
}

function checkAuth() {
    const token = localStorage.getItem('authToken');
    const user = localStorage.getItem('currentUser');
    
    if (token && user) {
        authToken = token;
        currentUser = JSON.parse(user);
        
        const loginDiv = document.getElementById('loginContainer');
        loginDiv.classList.remove('d-flex', 'align-items-center', 'justify-content-center');
        loginDiv.style.setProperty('display', 'none', 'important');
        loginDiv.classList.add('hidden-login');
        
        document.getElementById('appContainer').style.display = 'block';
        loadMenuByRole();
        loadPage(getDefaultPage());
        return true;
    }
    return false;
}

function getDefaultPage() {
    if (!currentUser) return 'materials';
    
    const role = currentUser.role;
    if (role === 'СуперАдмин') return 'employees';
    if (role === 'Администратор') return 'materials';
    if (role === 'Кладовщик') return 'supplies-pending';
    if (role === 'Парикмахер' || role === 'Мастер маникюра' || role === 'Визажист' || role === 'Массажист') return 'my-records';
    return 'materials';
}

function loadMenuByRole() {
    const navMenu = document.getElementById('navMenu');
    if (!currentUser) return;
    
    const role = currentUser.role;
    let menuItems = [];
    
    if (role === 'СуперАдмин') {
    menuItems = [
        { page: 'employees', icon: 'bi-people', title: 'Сотрудники' },
        { page: 'employees-report', icon: 'bi-bar-chart-steps', title: 'Отчёт по записям' }  
    ];
    } else if (role === 'Администратор') {
        menuItems = [
            { page: 'materials', icon: 'bi-box-seam', title: 'Материалы' },
            { page: 'providers', icon: 'bi-truck', title: 'Поставщики' },
            { page: 'services', icon: 'bi-star', title: 'Услуги' },
            { page: 'clients', icon: 'bi-people', title: 'Клиенты' },
            { page: 'records', icon: 'bi-calendar-check', title: 'Записи' },
            { page: 'supplies', icon: 'bi-archive', title: 'Поставки' },
            { page: 'report', icon: 'bi-file-text', title: 'Отчёт' }
        ];
    } else if (role === 'Кладовщик') {
        menuItems = [
            { page: 'supplies-pending', icon: 'bi-box-seam', title: 'Поставки на приёмку' }
        ];
    } else if (role === 'Парикмахер' || role === 'Мастер маникюра' || role === 'Визажист' || role === 'Массажист') {
        menuItems = [
            { page: 'my-records', icon: 'bi-calendar-check', title: 'Мои записи' }
        ];
    }
    
    navMenu.innerHTML = menuItems.map(item => `
        <a class="nav-link" href="#" data-page="${item.page}">
            <i class="bi ${item.icon}"></i> ${item.title}
        </a>
    `).join('');
    
    document.querySelectorAll('#navMenu .nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const page = link.dataset.page;
            if (page) {
                setActivePage(page);
                loadPage(page);
            }
        });
    });
}

function setActivePage(page) {
    document.querySelectorAll('#navMenu .nav-link').forEach(link => {
        if (link.dataset.page === page) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });
}

function getAuthHeaders() {
    return {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
    };
}

window.login = login;
window.logout = logout;

document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
});