var db = require('./models'),
	badger = require('badger')(__filename),
	ApiError = require('./errors/api-error'),
	ErrorType = require('./errors/error-type'),
    _ = require('lodash');

var checkRequestValidity = function(req, accept, reject) {
	db.Session.model.validateToken(req.headers.token, req.headers.user_id, function(err, result) {
		if (err) {
            badger.error(err);
            return reject();
        }

        if (!result) return reject();

		req.authenticatedUser = { user_id: req.headers.user_id };

		accept();
	});
}

var checkRequestValidityWithNoId = function(req, accept, reject) {
    db.Session.model.validateTokenWithNoId(req.headers.token, function(err, result) {
        if (err) {
            badger.error(err);
            return reject();
        }

        if (!result) return reject();

        badger.debug('checkRequestValidityWithNoId');
        badger.debug(err, result.toJSON());

        req.authenticatedUser = { user_id: result.get('user_id') };

        accept();
    });
}

module.exports = {

	authenticate: function (req, res, next) {
		checkRequestValidity(req,
        function accept() {

			next();
		},
        function reject() {

			next(new ApiError(ErrorType.AUTHENTICATION_FAILED));
		});
	},

    authenticateWithNoId: function(req, res, next) {
        checkRequestValidityWithNoId(req,
        function accept() {

            next();
        },
        function reject() {

            next(new ApiError(ErrorType.AUTHENTICATION_FAILED));
        });
    },

	loadUser: function(req, res, next) {
		// find out which permissions this user has

		// no model necessary, since we're performing a raw query
		var nullModel = null;

		db.sequelize.query( 'SELECT p.id FROM users u '
			+ 'JOIN user_role ur ON u.id = ur.user_id '
			+ 'JOIN role r ON ur.role_id = r.id '
			+ 'JOIN role_permission rp ON r.id = rp.role_id '
			+ 'JOIN permission p ON rp.permission_id = p.id '
			+ 'WHERE u.id = :user_id'
				, nullModel,
				{ raw: true },
				{ user_id: req.authenticatedUser.user_id }
		)
		.then(function(permissions) {
			req.authenticatedUser.permissions = _.map(permissions, function(p) { return p.id });
			return next();
		}, function(err) {
			return next(err);
		});
	},

	requirePermission: function(permission) {
		return function(req, res, next) {
			db.Permission.model.find({ where: { name: permission.name } })
			.then(function(permission) {
				if(permission) {
					if( req.authenticatedUser.permissions.indexOf(permission.get('id')) !== -1) {
						// permissions found
						return next();
					} else {
						// User found but just doesn't have permission
						return next(new ApiError(ErrorType.UNAUTHORIZED));
					}
				} else {
					badger.error('Route attempted to call an undefined permission');
					return next(new Error('This permission is not defined'));
				}
			}, function(err) {
				return next(err);
			});
		}
	},

	andRestrictToSelf: function(req, res, next) {
		if(req.authenticatedUser.user_id === req.params.id) {
			return next();
		} else {
			return next(new ApiError(ErrorType.UNAUTHORIZED));
		}
	},

	andRestrictToSelfOrAdminWithPermission: function(permission) {
		return function(req, res, next) {
			if(req.authenticatedUser.user_id == req.params.id) {
				return next();
			} else {
				return module.exports.requirePermission(permission)(req, res, next);
			}
		}
	},

	optionalAuth: function(req, res, next) {
		if(req.headers.user_id) {
			module.exports.authenticate(req, res, next);
		} else {
			next();
		}
	}
}
