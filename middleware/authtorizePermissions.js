const ErrorMessages = require('../constants/ErrorMessages');

const authtorizePermissions = async (ctx, next) => {
    const { role } = ctx.state.user;

    if (!role.includes('admin')) {
        return ctx.forbidden(ErrorMessages.AUTHORIZE_PERMISSIONS);
    }

    await next();
};

module.exports = authtorizePermissions;
