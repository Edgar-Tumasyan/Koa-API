const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const StatusCodes = require('http-status-codes');
const cloudinary = require('cloudinary').v2;

const { User, Post, Attachment, Follow } = require('../data/models');

const create = async (ctx) => {
  const { firstname, lastname, email, password } = ctx.request.body;

  if (!firstname || !lastname || !email || !password) {
    ctx.status = StatusCodes.BAD_REQUEST;

    return (ctx.body = 'Please provide all values');
  }

  const existingEmail = await User.findOne({ where: { email } });

  if (existingEmail) {
    ctx.status = StatusCodes.BAD_REQUEST;

    return (ctx.body = `Email ${email} already exist`);
  }

  const hashPassword = await bcrypt.hash(password, 10);

  const newUser = await User.create({
    firstname,
    lastname,
    email,
    password: hashPassword,
  });

  const { password: userPassword, ...data } = newUser.dataValues;

  ctx.status = StatusCodes.CREATED;
  ctx.body = { data };
};

const login = async (ctx) => {
  const { email, password } = ctx.request.body;

  if (!email || !password) {
    ctx.status = StatusCodes.BAD_REQUEST;

    return (ctx.body = 'Please provide all values');
  }

  const user = await User.findOne({ where: { email } });

  if (!user) {
    ctx.status = StatusCodes.BAD_REQUEST;

    return (ctx.body = 'Please provide correct email');
  }

  const correctPassword = await bcrypt.compare(password, user.password);

  if (!correctPassword) {
    ctx.status = StatusCodes.BAD_REQUEST;

    return (ctx.body = 'Please provide correct password');
  }

  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '10d' }
  );

  const { password: userPassword, ...data } = user.dataValues;

  ctx.status = StatusCodes.CREATED;
  ctx.body = { data, token };
};

const uploadAvatar = async (ctx) => {
  const reqAvatar = ctx.request.files.avatar;

  if (!reqAvatar || !reqAvatar[0].mimetype.startsWith('image')) {
    ctx.status = StatusCodes.BAD_REQUEST;

    return (ctx.body = {
      message: 'Please choose your avatar, that should be an image',
    });
  }

  if (reqAvatar.length > 1) {
    ctx.status = StatusCodes.BAD_REQUEST;

    return (ctx.body = { message: 'Please choose one photo' });
  }

  const avatar = await cloudinary.uploader.upload(reqAvatar[0].path, {
    use_filename: true,
    folder: 'avatars',
  });

  await User.update(
    { avatar: avatar.secure_url },
    {
      where: {
        id: ctx.state.user.id,
      },
    }
  );

  const { password, email, createdAt, updatedAt, ...data } = ctx.state.user;

  ctx.status = StatusCodes.CREATED;
  ctx.body = { user: data };
};

const findAll = async (ctx) => {
  let { limit, offset } = ctx.query;

  if (!limit) {
    limit = 2;
  }

  if (!offset) {
    offset = 0;
  }

  const { rows: users, count: total } = await User.findAndCountAll({
    attributes: ['firstname', 'lastname'],
    include: [
      {
        model: Post,
        as: 'posts',
        include: [
          {
            attributes: ['attachmentUrl'],
            model: Attachment,
            as: 'attachments',
          },
        ],
      },
      {
        attributes: ['followerId'],
        model: Follow,
        as: 'followers',
        include: [
          {
            attributes: ['firstname', 'lastname'],
            model: User,
            as: 'user',
          },
        ],
      },
    ],
    offset,
    limit,
    distinct: true,
  });

  ctx.status = StatusCodes.OK;
  ctx.body = {
    total,
    limit,
    currentPage: Math.ceil(offset / limit) || 1,
    pageCount: Math.ceil(total / limit),
    users,
  };
};

const findOne = async (ctx) => {
  const user = await User.findByPk(ctx.request.params.id);

  if (!user) {
    ctx.status = StatusCodes.BAD_REQUEST;

    return (ctx.body = `No user with id ${ctx.request.params.id}`);
  }

  const { password, ...data } = user.dataValues;

  ctx.status = StatusCodes.OK;
  ctx.body = { data };
};

const remove = async (ctx) => {
  if (ctx.state.user.id !== ctx.request.params.id) {
    ctx.status = StatusCodes.UNAUTHORIZED;

    return (ctx.body = `User can delete only his account`);
  }

  try {
    await User.destroy({ where: { id: ctx.state.user.id } });

    ctx.status = StatusCodes.OK;
    ctx.body = { message: 'User deleted' };
  } catch (e) {
    console.log(e);
  }
};

module.exports = { create, login, uploadAvatar, findAll, findOne, remove };
