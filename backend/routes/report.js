const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/report?from=YYYY-MM-DD&to=YYYY-MM-DD
router.get('/', async (req, res) => {
    const { from, to } = req.query;
    
    if (!from || !to) {
        return res.status(400).json({ error: 'Укажите параметры from и to' });
    }
    
    try {
        // Используем VIEW vw_supplies_summary для получения списка поставок за период
        const suppliesResult = await db.query(`
            SELECT * FROM vw_supplies_summary
            WHERE date BETWEEN $1 AND $2
            ORDER BY date DESC
        `, [from, to]);
        
        // Для детализации по материалам нужны отдельные данные
        const detailsResult = await db.query(`
            SELECT 
                s.date,
                p.provider_name as provider,
                m.material_name as material,
                sc.position_incount as quantity,
                sc.position_price as price,
                (sc.position_incount * sc.position_price) as total
            FROM supply s
            JOIN provider p ON p.provider_id = s.provider_id
            JOIN supply_content sc ON sc.supply_id = s.supply_id
            JOIN material m ON m.material_id = sc.material_id
            WHERE s.date BETWEEN $1 AND $2
            ORDER BY s.date DESC, p.provider_name, m.material_name
        `, [from, to]);
        
        res.json(detailsResult.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;