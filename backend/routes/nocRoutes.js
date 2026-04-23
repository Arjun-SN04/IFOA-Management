const express = require('express');
const router = express.Router();
const { raiseNOC, getNOCs, reviewNOC, deleteNOC } = require('../controllers/nocController');
const { protect, managerOrAdmin, hrOrAbove } = require('../middleware/authMiddleware');

router.post('/',               protect, managerOrAdmin, raiseNOC);
router.get('/',                protect, hrOrAbove, getNOCs);
router.patch('/:id/review',    protect, hrOrAbove, reviewNOC);
router.delete('/:id',          protect, hrOrAbove, deleteNOC);

module.exports = router;
