var Promise = require('bluebird');
var _ = require('lodash');

// games
module.exports = function(db) {

	var gameSchema = db.Schema({
		
		creator: { 
			type: db.Schema.ObjectId,
			ref: 'User',
			required: true
		},
		players: { 
			type: [ db.Schema.ObjectId ],
			ref: 'User'
		},
		createdAt: {
			type: Date,
			default: Date.now
		},
		mode: {
			type: String,
			required: true,
			validate: function(s) {
				return (s == 'PD' || s == 'SG');
			}
		},
		status: {
			type: String,
			default: 'Pending',
			validate: function(s) {
				return (s == 'Pending' 
					|| s == 'In Progress'
					|| s == 'Complete'
					|| s == 'Void');
			}
		},
		result: {
			type: String
		}
	});

	var Game = db.model('Game', gameSchema);
	var User = db.model('User');

	var create = function(fields) {

		return User.findById(fields.creator)
		.then(function(creator) {

			var game = new Game({
				creator: creator,
				players: [ creator ],
				mode: fields.mode
			});

			return game.save()
			.then(function(game) {
				creator.currentGame = game.id;

				return creator.save();
			});
		});
	};

	var removePlayer = function(player) {

		return User.findById(player)
		.then(function(user) {
			return Game.findById(user.currentGame)
			.then(function(game) {

				if(!game) {
					throw new Error('User not in a game');
				}

				game.players.remove(player);
				return game.save();
			})
			.then(function() {
				user.currentGame = null;
				return user.save();
			})
		})
	};

	var abortGame = function(game) {

		return Promise.all(_.map(game.players, function(player) {
			return removePlayer(player.id);
		}))
		.then(function() {
			return Game.findByIdAndRemove(game.id);
		});
	};

	return {

		create: function(req, res, next) {
				
			if(!req.session.user) {
				throw new Error('Must be logged in');
			}

			var fields = req.body || {};
			fields.creator = req.session.user;
			
			return create(fields)
			.then(function() {
				res.status(201).json({});
			}, function(err) {
				next(err);
			});
		},

		withdraw: function(req, res, next) {

			if(!req.session.user) {
				throw new Error('Must be logged in');
			}

			return removePlayer(req.session.user)
			.then(function() {
				res.status(200).json({});
			}, function(err) {
				next(err);
			});
		},

		abort: function(req, res, next) {
			
			if(!req.session.user) {
				throw new Error('Must be logged in');
			}

			return Game.findById(req.params.id)
			.then(function(game) {
				if (game.creator == req.session.user) {
					return abortGame(game);
				} else {
					throw new Error('Authorization error');
				}
			});
		},

		get: function(req, res, next) {

			return Game.findById(req.params.id)
			.then(function(game) {
				
				if(!game) {
					throw new Error('Game not found');
				}

				res.status(200).json(game);
			})
			.catch(function(err) {
				next(err);
			})
		},


		list: function(req, res, next) {

			return Game.find()
			.then(function(games) {
				res.status(200).json(games);
			})
			.catch(function(err) {
				next(err);
			})
		}
	}
}
