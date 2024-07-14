import { Router } from 'express';
const router = Router();

router.get('/', (req, res, next) => {
  res.render('editor-main-view', { title: 'Express' });
});

export default router;
