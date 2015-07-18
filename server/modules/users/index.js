var Promise = require('bluebird');
var bcrypt = require('bcrypt');
var SteamStrategy = require('passport-steam').Strategy;
var findOrCreate = require('mongoose-findorcreate');

// users
module.exports = function(db, io, passport) {

	var userSchema = db.Schema({
		createdAt: {
			type: Date,
			default: Date.now
		},
		admin: {
			type: Boolean,
			default: false
		},
		currentGame: {
			type: db.Schema.ObjectId,
			ref: 'Game'
		},
		rating: {
			mean: {
				type: Number,
				default: 25.0
			},
			standardDeviation: {
				type: Number,
				default: 25.0 / 3
			}
		},
		steamProfile: {
			type: db.Schema.Types.Mixed
		}
	});
	userSchema.plugin(findOrCreate);

	var User = db.model('User', userSchema);

	passport.serializeUser(function(user, done) {
	  	done(null, user.id);
	});

	passport.deserializeUser(function(id, done) {
		User.findById(id, function(err, user) {
			done(err, user);
		});
	});

	var host = 'http://www.dcosgrove.com';
	passport.use(new SteamStrategy({
	    returnURL: host + '/j9dl/api/auth/steam/callback',
	    realm: host,
	    apiKey: process.env.STEAM_API_KEY || 'A7D8CF2938F12BB6732994AC5312F9B9'
	  },
	  function(identifier, profile, done) {
	    User.findOrCreate({'steamProfile.id': profile.id}, { steamProfile: profile }, { upsert: true },
    	function (err, user) {
	    	if (err) { return done(err); }
	    	return done(null, user);
    	});
	  }
	));

	var updateSteamFields = function(steamPayload) {
		var newUser = Promise.promisify(function(steamFields) {
			var user = new User({
				steam: steamFields
			});

			return user.save();
		});	

		return newUser(steamPayload)
		.then(function(user) {
			// reload to get default selection
			return User.findById(user.steam.id);
		});
	};

	return {

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

		passportAuthenticate: passport.authenticate('steam', { failureRedirect: '/j9dl/api/error-auth' }),

		steamAuth: function(req, res, next) {
		  	res.redirect('/j9dl');
		},

		steamCallback: function(req, res, next) {
		  	res.redirect('/j9dl');
		},

		logout: function(req, res, next) {
			req.session.destroy(function(err) {
				if(err) {
					return next(err);
				} else {
					res.status(200).json({});
				}
			});

			req.logout();
			// res.redirect('/j9dl');
		},

		getSession: function(req, res, next) {
			if(req.user) {
				res.status(200).json(req.user);
			} else {
				// not logged in case
				res.status(404).json({
					error: 'Not logged in'
				});
			}
		}
	}
}
