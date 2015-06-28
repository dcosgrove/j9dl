var Promise = require('bluebird');
var _ = require('lodash');

var tsr = require('./trueskill');
var matchmaking = require('./matchmaking');


// games
module.exports = function(db, io) {

	var gameSchema = db.Schema({
		
		creator: { 
			type: db.Schema.ObjectId,
			ref: 'User',
			required: true
		},
		players: [{ 
			type:  db.Schema.ObjectId ,
			ref: 'User'
		}],
		teamA: [[{ 
			type:  db.Schema.ObjectId ,
			ref: 'User'
		}]],
		createdAt: {
			type: Date,
			default: Date.now
		},
		mode: {
			type: String,
			required: true,
			default: 'SG',
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
		winner: {
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
			});
		});
	};

	var abortGame = function(game) {
		return Promise.all(_.map(game.players, removePlayer))
		.then(function() {
			return Game.findByIdAndRemove(game.id);
		});
	};

	var joinGame = function(game, player) {
		
		// TODO - more restrictions here
		return Game.findById(game)
		.then(function(game) {

			if(game.players.length >= 10) {
				throw new Error('Game is full');
			}

			game.players.push(player);
			return game.save()
			.then(function(game) {
				return User.findById(player)
				.then(function(user) {
					user.currentGame = game.id;
					return user.save();
				})
				.then(function() {
					return game;
				});
			});
		});
	};

	var checkGameParameters = function(game) {

		// TODO - validate game to ensure it's ok to start
		return true;
	};

	var beginGame = function(gameId) {

		return Game.findById(gameId)
		.then(function(game) {
			return checkGameParameters(game);
		})
		.then(function(game) {
			return Promise.resolve(matchmaking.findBalancedTeams(tsr.calculateMatchQuality)(game))
			.then(function(teamInfo) {
				game.teams = teamInfo.teams
			})
		});
	};

	return {

		create: function(req, res, next) {
				
			if(!req.session.user) {
				next(new Error('Must be logged in'));
			}

			var fields = req.body || {};
			fields.creator = req.session.user;
			
			return create(fields)
			.then(function(player) {
				res.status(201).json({
					game: player.currentGame
				});
			}, function(err) {
				next(err);
			});
		},

		withdraw: function(req, res, next) {

			if(!req.session.user) {
				next(new Error('Must be logged in'));
			} else if(req.session.user != req.params.user) {
				// current limitation: player can withdraw themselves only
				// TODO: admin can do it too
				next(new Error('Authorization error'));
			}

			return removePlayer(req.params.user)
			.then(function() {
				res.status(200).json({});
			}, function(err) {
				next(err);
			});
		},

		abort: function(req, res, next) {
			
			if(!req.session.user) {
				next(new Error('Must be logged in'));
			}

			return Game.findById(req.params.id)
			.then(function(game) {
				if (game.creator == req.session.user) {
					return abortGame(game);
				} else {
					throw new Error('Authorization error');
				}
			})
			.then(function() {
				res.status(200).json({});
			}, function(err) {
				next(err);
			});
		},

		join: function(req, res, next) {

			if(!req.session.user) {
				next(new Error('Must be logged in'));
			}

			return User.findById(req.session.user)
			.then(function(user) {

				if(user.currentGame) {
					// move player out of current game if they're in one
					// consider making this an error in the future				
					return removePlayer(user.id);
				}
			})
			.then(function() {
				return joinGame(req.params.id, req.session.user);
			})
			.then(function(game) {
				res.status(200).json({
					game: game
				});
			}, function(err) {
				next(err);
			});
		},

		get: function(req, res, next) {

			return Game.findById(req.params.id)
			.then(function(game) {
				
				if(!game) {
					throw new Error('Game not found');
				}

				return game.populateAsync('players creator')
			})
			.then(function(game) {
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
		},

		begin: function(req, res, next) {

			if(!req.session.user) {
				next(new Error('Must be logged in'));
			}

			return Game.findById(req.params.id)
			.then(function(game) {

				if(req.session.user == game.creator) {
					return beginGame(req.params.id);
				}
				
				res.status(200).json(game);
			}, function(err) {
				next(err);
			});
		}
	}
}
