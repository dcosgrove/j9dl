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
		}
	});

	var User = db.model('User', userSchema);

	var create = function(user) {

		var hash = Promise.promisify(bcrypt.hash);
		hash(user.password, 8)
		.then(function(hashed) {
			var user = new User({
				username: user.username,
				password: hash,
				email: user.email
			});

			return user.save();
		})
	}



	return {
		create: function(req, res, next) {
			
			if(!req.body.username || !req.body.password) {
				throw new Error('Username and password must be specified');
			}

			create(req.body)
			.then(function(user) {
				console.log('successfully created user:', req.body.username);
				res.json(user);
			}, function(err) {
				next(err);
			});
		},

		get: function(req, res, next) {

		},

		list: function(req, res, next) {

		}
	}
}

