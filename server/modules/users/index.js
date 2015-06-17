var Promise = require('bluebird');
var bcrypt = require('bcrypt');

// users
module.exports = function(db) {

	var userSchema = db.Schema({
		username: { 
			type: String,
			unique: true, 
			required: true, 
			validate: function(s) {
				return s && s.length;
			}
		},
		password: { 
			type: String,
			select: false,
			required: true
		},
		email: { 
			type: String, 
			select: false
		},
		createdAt: {
			type: Date,
			default: Date.now
		},
		admin: {
			type: Boolean,
			default: false
		},
		sessions: {
			type: [String]
		}
	});

	var User = db.model('User', userSchema);

	var create = function(fields) {
	
		var hash = Promise.promisify(bcrypt.hash);	
		return hash(fields.password, 8)
		.then(function(password) {

			var user = new User({
				username: fields.username,
				password: password,
				email: fields.email
			});

			return user.save();
		});
	};

	var authenticate = function(fields) {

		var compare = Promise.promisify(bcrypt.compare);
		
		return User.findOne({ username: fields.username }).select('password')
		.then(function(user) {

			if(!user) {
				throw new Error('Username not found');
			}

			return compare(fields.password, user.password)
			.then(function(matches) {
  				
  				if(!matches) {
					throw new Error('Wrong password');
				}

				return user;
			});
  		});
	};

	return {

		create: function(req, res, next) {
	
			if(!req.body.username || !req.body.password) {
				throw new Error(	'Username and password must be specified');
			}

			create(req.body)
			.then(function(user) {
				console.log('successfully created user:', req.body.username);

				req.session.userId = user.id;
				res.status(201).json({});
			}, function(err) {
				next(err);
			});
		},

		get: function(req, res, next) {

			return User.findById(req.params.id)
			.then(function(user) {
				
				if(!user) {
					throw new Error('User not found');
				}

				res.status(200).json(user);
			})
			.catch(function(err) {
				next(err);
			})
		},

		list: function(req, res, next) {
			
			return User.find()
			.then(function(users) {
				res.status(200).json(users);
			}, function(err) {
				next(err);
			});
		},

		login: function(req, res, next) {
			return authenticate(req.body)
			.then(function(user) {
				req.session.user = user.id;
				res.status(200).json({});
			}, function(err) {
				next(err);
			});
		},

		logout: function(req, res, next) {

			req.session.destroy(function(err) {
				if(err) {
					return next(err);
				} else {
					res.status(200).json({});
				}
			});
		}
	}
}
