const { DataTypes, Model, literal, Op } = require('sequelize');
const _ = require('lodash');

const { UserRole, ProfileCategory, UserStatus } = require('../lcp');

class User extends Model {
    static init(sequelize) {
        return super.init(
            {
                id: {
                    type: DataTypes.UUID,
                    defaultValue: DataTypes.UUIDV4,
                    primaryKey: true,
                    allowNull: false
                },
                firstname: { type: DataTypes.STRING, allowNull: false },
                lastname: { type: DataTypes.STRING, allowNull: false },
                email: {
                    type: DataTypes.STRING,
                    allowNull: false,
                    unique: true,
                    validate: { isEmail: true }
                },
                password: { type: DataTypes.STRING, allowNull: false },
                role: {
                    type: DataTypes.ENUM,
                    values: _.values(UserRole),
                    defaultValue: UserRole.USER
                },
                status: {
                    type: DataTypes.STRING,
                    allowNull: false,
                    values: _.values(UserStatus),
                    defaultValue: UserStatus.Active
                },
                profileCategory: {
                    type: DataTypes.ENUM,
                    values: _.values(ProfileCategory),
                    defaultValue: ProfileCategory.PUBLIC
                },
                avatar: DataTypes.STRING,
                avatarPublicId: DataTypes.STRING
            },
            {
                sequelize,
                timestamps: true,
                tableName: 'user'
            }
        );
    }

    static associate(models) {
        User.hasMany(models.Post, { as: 'posts', foreignKey: 'userId' });

        User.hasMany(models.Follow, { as: 'followers', foreignKey: 'followerId' });

        User.hasMany(models.Follow, { as: 'followings', foreignKey: 'followingId' });

        User.hasMany(models.Attachment, { as: 'attachments', foreignKey: 'userId' });
    }

    static addScopes(models) {
        User.addScope('profile', (profileId, userId) => {
            return {
                attributes: [
                    'id',
                    'firstname',
                    'lastname',
                    'avatar',
                    'status',
                    [literal(`(SELECT COUNT('*') FROM post WHERE "userId" = "User"."id")::int`), 'postsCount'],
                    [literal(`(SELECT COUNT('*') FROM follow WHERE "followingId" = "User"."id")::int`), 'followersCount'],
                    [literal(`(SELECT COUNT('*') FROM follow WHERE "followerId" = "User"."id")::int`), 'followingsCount'],
                    [
                        literal(
                            `(SELECT CASE (SELECT COALESCE((SELECT status FROM follow WHERE "followerId" =
                                    '${userId}' AND "followingId" = '${profileId}'), NULL ))
                                     WHEN 'pending' THEN 'pending'
                                     WHEN 'approved' THEN 'approved'
                                   ELSE 'unfollow'
                                   END as status)`
                        ),
                        'followStatus'
                    ]
                ]
            };
        });

        User.addScope('profiles', userId => {
            return {
                attributes: [
                    'id',
                    'firstname',
                    'lastname',
                    'avatar',
                    'status',
                    [
                        literal(
                            `(SELECT CASE (SELECT COALESCE((SELECT status FROM follow WHERE "followerId" =
                                    '${userId}' AND "followingId" = "User"."id"), NULL ))
                                   WHEN 'pending' THEN 'pending'
                                   WHEN 'approved' THEN 'approved'
                                   ELSE 'unfollow'
                                   END as status)`
                        ),
                        'followStatus'
                    ]
                ],
                where: { id: { [Op.not]: userId } }
            };
        });

        User.addScope('followers', (followingId, userId) => {
            return {
                attributes: [
                    'id',
                    'firstname',
                    'lastname',
                    'avatar',
                    'profileCategory',
                    'status',
                    [
                        literal(
                            `(SELECT CASE (SELECT COALESCE((SELECT status FROM follow WHERE "followerId" =
                                    '${userId}' AND "followingId" = "User"."id"), NULL ))
                                   WHEN 'pending' THEN 'pending'
                                   WHEN 'approved' THEN 'approved'
                                   ELSE 'unfollow'
                                   END as status)`
                        ),
                        'followStatus'
                    ]
                ],
                where: {
                    id: { [Op.in]: models.Follow.generateNestedQuery({ attributes: ['followerId'], where: { followingId } }) }
                }
            };
        });

        User.addScope('followings', (followerId, userId) => {
            return {
                attributes: [
                    'id',
                    'firstname',
                    'lastname',
                    'avatar',
                    'profileCategory',
                    'status',
                    [
                        literal(
                            `(SELECT CASE (SELECT COALESCE((SELECT status FROM follow WHERE "followerId" =
                                    '${userId}' AND "followingId" = "User"."id"), NULL ))
                                   WHEN 'pending' THEN 'pending'
                                   WHEN 'approved' THEN 'approved'
                                   ELSE 'unfollow'
                                   END as status)`
                        ),
                        'followStatus'
                    ]
                ],
                where: {
                    id: { [Op.in]: models.Follow.generateNestedQuery({ attributes: ['followingId'], where: { followerId } }) }
                }
            };
        });

        User.addScope('likesUsers', (postId, userId) => {
            return {
                attributes: [
                    'id',
                    'firstname',
                    'lastname',
                    'avatar',
                    'profileCategory',
                    'status',
                    [
                        literal(
                            `(SELECT CASE (SELECT COALESCE((SELECT status FROM follow WHERE "followerId" =
                                    '${userId}' AND "followingId" = "User"."id"), NULL ))
                                   WHEN 'pending' THEN 'pending'
                                   WHEN 'approved' THEN 'approved'
                                   ELSE 'unfollow'
                                   END as status)`
                        ),
                        'followStatus'
                    ]
                ],
                where: {
                    id: {
                        [Op.in]: models.Like.generateNestedQuery({ attributes: ['userId'], where: { postId } })
                    }
                }
            };
        });

        User.addScope('yourProfile', () => {
            return {
                attributes: [
                    'id',
                    'firstname',
                    'lastname',
                    'avatar',
                    'status',
                    [literal(`(SELECT COUNT('*') FROM post WHERE "userId" = "User"."id")::int`), 'postsCount'],
                    [literal(`(SELECT COUNT('*') FROM follow WHERE "followingId" = "User"."id")::int`), 'followersCount'],
                    [literal(`(SELECT COUNT('*') FROM follow WHERE "followerId" = "User"."id")::int`), 'followingsCount']
                ]
            };
        });

        User.addScope('usersForAdmin', (q, sortField, sortType, status) => {
            return {
                attributes: [
                    'id',
                    'firstname',
                    'lastname',
                    'avatar',
                    'status',
                    [literal(`(SELECT COUNT('*') FROM post WHERE "userId" = "User"."id")::int`), 'postsCount'],
                    [literal(`(SELECT COUNT('*') FROM follow WHERE "followingId" = "User"."id")::int`), 'followersCount'],
                    [literal(`(SELECT COUNT('*') FROM follow WHERE "followerId" = "User"."id")::int`), 'followingsCount']
                ],
                where: { status, [Op.or]: [{ firstname: { [Op.like]: `%${q}%` } }, { lastname: { [Op.like]: `%${q}%` } }] },
                order: [[`${sortField}`, `${sortType}`]]
            };
        });
    }

    toJSON() {
        const user = this.get();

        const hiddenFields = ['password'];

        return _.omit(user, hiddenFields);
    }
}

module.exports = User;
