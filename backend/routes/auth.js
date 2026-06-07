const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key';

// POST /api/auth/login - вход в систему
router.post('/login', async (req, res) => {
    const { login, password } = req.body;

    if (!login || !password) {
        return res.status(400).json({ error: 'Логин и пароль обязательны' });
    }

    try {
        // Ищем сотрудника по логину
        const result = await db.query(
            'SELECT employee_id, full_name, post, login, password_hash FROM employee WHERE login = $1',
            [login]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Неверный логин или пароль' });
        }

        const user = result.rows[0];

        // Проверяем пароль
        const isValidPassword = await bcrypt.compare(password, user.password_hash);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Неверный логин или пароль' });
        }

        // Генерируем JWT токен
        const token = jwt.sign(
            {
                employee_id: user.employee_id,
                full_name: user.full_name,
                login: user.login,
                post: user.post
            },
            JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
        );

        res.json({
            token,
            user: {
                id: user.employee_id,
                name: user.full_name,
                login: user.login,
                role: user.post
            }
        });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// POST /api/auth/register - регистрация нового сотрудника (только для супер-админа)
// Этот эндпоинт будет защищён middleware
router.post('/register', async (req, res) => {
    const { full_name, post, login, password } = req.body;

    if (!full_name || !post || !login || !password) {
        return res.status(400).json({ error: 'Все поля обязательны' });
    }

    // Проверка допустимых должностей
    const allowedPosts = ['Администратор', 'Кладовщик', 'Парикмахер', 'Мастер маникюра', 'Визажист', 'Массажист'];
    if (!allowedPosts.includes(post)) {
        return res.status(400).json({ error: 'Недопустимая должность' });
    }

    try {
        // Проверяем, не занят ли логин
        const existing = await db.query('SELECT employee_id FROM employee WHERE login = $1', [login]);
        if (existing.rows.length > 0) {
            return res.status(400).json({ error: 'Логин уже занят' });
        }

        // Хешируем пароль
        const password_hash = await bcrypt.hash(password, 10);

        const result = await db.query(
            `INSERT INTO employee (full_name, post, login, password_hash)
             VALUES ($1, $2, $3, $4)
             RETURNING employee_id, full_name, post, login`,
            [full_name, post, login, password_hash]
        );

        res.status(201).json({
            message: 'Сотрудник успешно создан',
            user: result.rows[0]
        });
    } catch (err) {
        console.error('Register error:', err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// GET /api/auth/me - получить информацию о текущем пользователе (требуется токен)
router.get('/me', async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ error: 'Требуется авторизация' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        res.json({
            id: decoded.employee_id,
            name: decoded.full_name,
            login: decoded.login,
            role: decoded.post
        });
    } catch (err) {
        res.status(401).json({ error: 'Недействительный токен' });
    }
});

module.exports = router;