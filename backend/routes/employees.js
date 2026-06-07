const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../db');
const { authenticateToken, isSuperAdmin } = require('../middleware/auth');

// Публичный эндпоинт для получения мастеров (без проверки прав)
router.get('/masters', async (req, res) => {
    const { serviceId } = req.query;
    
    try {
        let query = `
            SELECT 
                e.employee_id as id,
                e.full_name as name,
                e.post as role
            FROM employee e
            WHERE e.post IN ('Парикмахер', 'Мастер маникюра', 'Визажист', 'Массажист')
        `;
        let params = [];
        
        if (serviceId) {
            query += ` AND e.employee_id IN (
                SELECT master_id FROM performs WHERE service_id = $1
            )`;
            params.push(serviceId);
        }
        
        query += ` ORDER BY e.full_name`;
        
        const result = await db.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// Все эндпоинты требуют аутентификации и прав супер-админа
router.use(authenticateToken);
router.use(isSuperAdmin);

// ===== СПЕЦИАЛЬНЫЕ ЭНДПОИНТЫ (ДО /:id) =====

// Отчёт по записям (по месяцам) через VIEW
router.get('/report', async (req, res) => {
    const { year } = req.query;
    
    if (!year) {
        return res.status(400).json({ error: 'Не указан год' });
    }
    
    try {
        // Используем VIEW vw_monthly_profit
        const result = await db.query(`
            SELECT * FROM vw_monthly_profit
            WHERE month LIKE $1
            ORDER BY month DESC
        `, [`${year}-%`]);
        
        res.json(result.rows);
    } catch (err) {
        console.error('Report error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ===== ОСНОВНЫЕ CRUD ЭНДПОИНТЫ =====

// GET /api/employees - получить всех сотрудников
router.get('/', async (req, res) => {
    try {
        const result = await db.query(`
            SELECT 
                employee_id as id,
                full_name as name,
                post as role,
                login
            FROM employee
            WHERE post != 'СуперАдмин'
            ORDER BY employee_id
        `);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// GET /api/employees/:id - получить одного сотрудника
router.get('/:id', async (req, res) => {
    const { id } = req.params;
    // Проверяем, что id — число
    if (isNaN(parseInt(id))) {
        return res.status(400).json({ error: 'ID должен быть числом' });
    }
    try {
        const result = await db.query(`
            SELECT 
                employee_id as id,
                full_name as name,
                post as role,
                login
            FROM employee
            WHERE employee_id = $1 AND post != 'СуперАдмин'
        `, [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Сотрудник не найден' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// POST /api/employees - создать сотрудника
router.post('/', async (req, res) => {
    const { name, role, login, password } = req.body;
    
    if (!name || !role || !login || !password) {
        return res.status(400).json({ error: 'Все поля обязательны' });
    }
    
    const allowedRoles = ['Администратор', 'Кладовщик', 'Парикмахер', 'Мастер маникюра', 'Визажист', 'Массажист'];
    if (!allowedRoles.includes(role)) {
        return res.status(400).json({ error: 'Недопустимая должность' });
    }
    
    if (password.length < 3) {
        return res.status(400).json({ error: 'Пароль должен содержать минимум 3 символа' });
    }
    
    try {
        const existing = await db.query('SELECT employee_id FROM employee WHERE login = $1', [login]);
        if (existing.rows.length > 0) {
            return res.status(400).json({ error: 'Логин уже занят' });
        }
        
        const password_hash = await bcrypt.hash(password, 10);
        
        const result = await db.query(`
            INSERT INTO employee (full_name, post, login, password_hash)
            VALUES ($1, $2, $3, $4)
            RETURNING employee_id as id, full_name as name, post as role, login
        `, [name, role, login, password_hash]);
        
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// PUT /api/employees/:id - обновить сотрудника
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { name, role, login, password } = req.body;
    
    if (!name || !role || !login) {
        return res.status(400).json({ error: 'Имя, должность и логин обязательны' });
    }
    
    if (isNaN(parseInt(id))) {
        return res.status(400).json({ error: 'ID должен быть числом' });
    }
    
    try {
        const existing = await db.query('SELECT employee_id FROM employee WHERE employee_id = $1 AND post != $2', [id, 'СуперАдмин']);
        if (existing.rows.length === 0) {
            return res.status(404).json({ error: 'Сотрудник не найден' });
        }
        
        const loginCheck = await db.query('SELECT employee_id FROM employee WHERE login = $1 AND employee_id != $2', [login, id]);
        if (loginCheck.rows.length > 0) {
            return res.status(400).json({ error: 'Логин уже занят другим сотрудником' });
        }
        
        let query = `
            UPDATE employee 
            SET full_name = $1, post = $2, login = $3
            WHERE employee_id = $4
            RETURNING employee_id as id, full_name as name, post as role, login
        `;
        let params = [name, role, login, id];
        
        if (password && password.length > 0) {
            if (password.length < 3) {
                return res.status(400).json({ error: 'Пароль должен содержать минимум 3 символа' });
            }
            const password_hash = await bcrypt.hash(password, 10);
            query = `
                UPDATE employee 
                SET full_name = $1, post = $2, login = $3, password_hash = $4
                WHERE employee_id = $5
                RETURNING employee_id as id, full_name as name, post as role, login
            `;
            params = [name, role, login, password_hash, id];
        }
        
        const result = await db.query(query, params);
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// DELETE /api/employees/:id - удалить сотрудника
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    
    if (isNaN(parseInt(id))) {
        return res.status(400).json({ error: 'ID должен быть числом' });
    }
    
    try {
        const check = await db.query('SELECT post FROM employee WHERE employee_id = $1', [id]);
        if (check.rows.length === 0) {
            return res.status(404).json({ error: 'Сотрудник не найден' });
        }
        if (check.rows[0].post === 'СуперАдмин') {
            return res.status(403).json({ error: 'Нельзя удалить супер-администратора' });
        }
        
        await db.query('DELETE FROM employee WHERE employee_id = $1', [id]);
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});
// GET /api/employees?serviceId=1 - получить мастеров, выполняющих услугу
router.get('/', async (req, res) => {
    const { serviceId } = req.query;
    
    try {
        let query = `
            SELECT 
                e.employee_id as id,
                e.full_name as name,
                e.post as role
            FROM employee e
            WHERE e.post IN ('Парикмахер', 'Мастер маникюра', 'Визажист', 'Массажист')
        `;
        let params = [];
        
        if (serviceId) {
            query += ` AND e.employee_id IN (
                SELECT master_id FROM performs WHERE service_id = $1
            )`;
            params.push(serviceId);
        }
        
        query += ` ORDER BY e.full_name`;
        
        const result = await db.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});
module.exports = router;