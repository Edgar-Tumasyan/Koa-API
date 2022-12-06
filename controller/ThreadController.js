const { Follow, Thread, ThreadRequest, ThreadUser, sequelize } = require('../data/models');
const ErrorMessages = require('../constants/ErrorMessages');

const findAll = async ctx => {
    const userId = ctx.state.user.id;

    const data = await ThreadUser.scope({ method: ['threads', userId] }).findAll({ raw: true });

    const threadIds = data.map(thread => thread.threadId);

    const threads = await Thread.scope({ method: ['allThreads', threadIds] }).findAll();

    ctx.body = { threads };
};

const create = async ctx => {
    const { profileId } = ctx.params;
    const userId = ctx.state.user.id;

    if (userId === profileId) {
        return ctx.badRequest(ErrorMessages.NO_CREATE_THREAD);
    }

    const existingThread = await ThreadRequest.scope({ method: ['existingThread', userId, profileId] }).findOne({ raw: true });

    if (existingThread) {
        const thread = await Thread.findByPk(existingThread.threadId, { raw: true });

        return ctx.ok({ thread });
    }

    await sequelize.transaction(async t => {
        const thread = await Thread.create({}, { transaction: t });

        await ThreadUser.bulkCreate(
            [
                { threadId: thread.id, userId },
                { threadId: thread.id, userId: profileId }
            ],
            { transaction: t }
        );

        const isFollowed = await Follow.findOne({ where: { followerId: userId, followingId: profileId } });

        if (!isFollowed) {
            await ThreadRequest.create(
                { senderId: userId, receiverId: profileId, status: 'pending', threadId: thread.id },
                { transaction: t }
            );
        } else {
            await ThreadRequest.create(
                { senderId: userId, receiverId: profileId, status: 'accepted', threadId: thread.id },
                { transaction: t }
            );
        }

        return ctx.created({ thread });
    });
};

module.exports = { findAll, create };
