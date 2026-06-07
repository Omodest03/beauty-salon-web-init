require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('./db');
const { authenticateToken, isSuperAdmin } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Подключаем роуты
const authRouter = require('./routes/auth');
const employeesRouter = require('./routes/employees');
const materialsRouter = require('./routes/materials');
const providersRouter = require('./routes/providers');
const suppliesRouter = require('./routes/supplies');
const servicesRouter = require('./routes/services');
const clientsRouter = require('./routes/clients');
const recordsRouter = require('./routes/records');
const masterRecordsRouter = require('./routes/master-records');
const reportRouter = require('./routes/report');
const transactionsRouter = require('./routes/transactions');

// Регистрируем роуты (публичные и защищённые)
app.use('/api/auth', authRouter);
app.use('/api/employees', employeesRouter);
app.use('/api/materials', materialsRouter);
app.use('/api/providers', providersRouter);
app.use('/api/supplies', suppliesRouter);
app.use('/api/services', servicesRouter);
app.use('/api/clients', clientsRouter);
app.use('/api/records', recordsRouter);
app.use('/api/master', masterRecordsRouter);
app.use('/api/report', reportRouter);
app.use('/api/transactions', transactionsRouter);

// Отчёт для супер-админа 
app.get('/api/employees/report', authenticateToken, isSuperAdmin, async (req, res) => {
    const { year } = req.query;
    try {
        let query = `
            SELECT 
                TO_CHAR(date_and_time, 'YYYY-MM') as month,
                COUNT(*) as services_count,
                SUM(price) as total_revenue,
                ROUND(AVG(price), 2) as avg_receipt
            FROM record
            WHERE status = 'Выполнено'
        `;
        if (year) {
            query += ` AND EXTRACT(YEAR FROM date_and_time) = $1`;
            query += ` GROUP BY TO_CHAR(date_and_time, 'YYYY-MM') ORDER BY month DESC`;
            const result = await db.query(query, [year]);
            res.json(result.rows);
        } else {
            query += ` GROUP BY TO_CHAR(date_and_time, 'YYYY-MM') ORDER BY month DESC`;
            const result = await db.query(query);
            res.json(result.rows);
        }
    } catch (err) {
        console.error('Report error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Проверка, что сервер работает
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Обработка 404
app.use('*', (req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
});

// Обработка ошибок
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: err.message });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});