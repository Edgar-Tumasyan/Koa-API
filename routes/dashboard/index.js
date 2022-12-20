const Router = require('koa-router');

const userRoutes = require('./user');
const postRoutes = require('./post');
const adminRoutes = require('./admin');

const router = new Router({ prefix: '/dashboard' });

router.use(userRoutes.routes());
router.use(postRoutes.routes());
router.use(adminRoutes.routes());

module.exports = router;
