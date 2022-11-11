const Router = require('koa-router');

const {
  create,
  login,
  findAll,
  findOne,
  remove,
} = require('../controller/UserController');

const { authenticateUser } = require('../middleware/auth');

const router = new Router({
  prefix: '/users',
});

router.get('/', authenticateUser, findAll);
router.get('/:id', authenticateUser, findOne);

router.post('/', create);
router.post('/login', login);

router.delete('/:id', authenticateUser, remove);

module.exports = router;
