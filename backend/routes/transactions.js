const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken, isAdmin } = require('../middleware/auth');

router.use(authenticateToken);
router.use(isAdmin);

// GET /api/transactions/:id
router.get('/:id', async (req, res) => {
    const { id } = req.params;
    
    try {
        const result = await db.query(`
            SELECT 
                transaction_id as id,
                sum,
                date_and_time,
                payment_method
            FROM transaction
            WHERE transaction_id = $1
        `, [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Транзакция не найдена' });
        }
        
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;