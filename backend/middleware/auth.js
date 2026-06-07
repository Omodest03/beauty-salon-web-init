const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key';

// Проверка JWT токена
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        return res.status(401).json({ error: 'Требуется авторизация' });
    }

    try {
        const user = jwt.verify(token, JWT_SECRET);
        req.user = user;
        next();
    } catch (err) {
        return res.status(403).json({ error: 'Недействительный или просроченный токен' });
    }
}

// Проверка роли: только супер-админ
function isSuperAdmin(req, res, next) {
    if (!req.user || req.user.post !== 'СуперАдмин') {
        return res.status(403).json({ error: 'Доступ запрещён. Требуются права супер-администратора.' });
    }
    next();
}

// Проверка роли: администратор (включая супер-админа)
function isAdmin(req, res, next) {
    if (!req.user || (req.user.post !== 'Администратор' && req.user.post !== 'СуперАдмин')) {
        return res.status(403).json({ error: 'Доступ запрещён. Требуются права администратора.' });
    }
    next();
}

// Проверка роли: мастер
function isMaster(req, res, next) {
    if (!req.user || (req.user.post !== 'Парикмахер' && 
        req.user.post !== 'Мастер маникюра' && 
        req.user.post !== 'Визажист' && 
        req.user.post !== 'Массажист' &&
        req.user.post !== 'СуперАдмин')) {
        return res.status(403).json({ error: 'Доступ запрещён. Требуются права мастера.' });
    }
    next();
}

// Проверка роли: кладовщик
function isStorekeeper(req, res, next) {
    if (!req.user || (req.user.post !== 'Кладовщик' && req.user.post !== 'СуперАдмин')) {
        return res.status(403).json({ error: 'Доступ запрещён. Требуются права кладовщика.' });
    }
    next();
}

// Проверка: свой аккаунт или админ
function isSelfOrAdmin(req, res, next) {
    const targetId = parseInt(req.params.id);
    if (!req.user || (req.user.employee_id !== targetId && req.user.post !== 'Администратор' && req.user.post !== 'СуперАдмин')) {
        return res.status(403).json({ error: 'Доступ запрещён.' });
    }
    next();
}

module.exports = {
    authenticateToken,
    isSuperAdmin,
    isAdmin,
    isMaster,
    isStorekeeper,
    isSelfOrAdmin
};