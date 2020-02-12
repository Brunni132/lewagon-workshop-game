const express = require('express');
const router = express.Router();

router.get('/', (req, res, next) => {
  res.render('editor-main-view', { title: 'Express' });
});

module.exports = router;
