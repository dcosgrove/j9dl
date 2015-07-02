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
		// mongoose doesn't support array of array of type...luckily we always have 2 teams
		teamA: [{ 
			type:  db.Schema.ObjectId,
			ref: 'User'
		}],
		teamB: [{ 
			type:  db.Schema.ObjectId ,
			ref: 'User'
		}],
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
		results: [{
			player: {
				type: db.Schema.ObjectId,
				ref: 'User'
			},
			vote: {
				type: String,
				validate: function(s) {
					return (s == 'A' || s == 'B' || s == 'scratch');
				}
			}
		}],
		matchQuality: {
			type: Number
		},
		stakes: db.Schema.Types.Mixed
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

			return game.populateAsync('players');
		})
		.then(function(game) {
			if(checkGameParameters(game)) {
				return game;
			} else {
				throw new Error('Unable to start');
			}
		})
		.then(function(game) {
			return Promise.resolve(matchmaking.findBalancedTeams(tsr.calculateMatchQuality)(game))
			.then(function(teamInfo) {

				var teamA = teamInfo.teams[0];
				var teamB = teamInfo.teams[1];
				game.teamA = teamA;
				game.teamB = teamB;

				game.matchQuality = teamInfo.quality;

				game.stakes = tsr.calculateStakes([ teamA, teamB ]);
				game.status = 'In Progress';

				return game.save();
			});
		});
	};

	var finalizeGameResult = function(game, outcome) {
		
	};	

	var checkGameResult = function(game) {

		var playerCount = game.players.length; 

		var votes = _.reduce(game.results, function(tally, vote) {
			tally[vote]++;
			return tally;
		}, {
			A: 0,
			B: 0,
			scratch: 0
		});

		var outcome;

		_.each(votes, function(count, result) {
			if(count > playerCount / 2) {
				outcome = result;
			}
		});

		return outcome;
	};

	var resultGame = function(gameId, playerId, vote) {

		return Game.findById(gameId)
		.then(function(game) {

			// ensure player is actually in the game they're trying to vote on
			var isPlaying = _.find(game.players, function(player) {
				return player == playerId;
			});

			if(isPlaying) {
				return game;
			} else {
				throw new Error('Player must be participating to result a game')
			}
		})
		.then(function(game) {


			var index = _.findIndex(game.results, function(result) {
				return playerId == results.player;
			});	

			if(index) {
				// vote changing case
				game.results[index] = { player: playerId, vote: vote };
			} else {
				// new vote
				game.results.push({ player: playerId, vote: vote });
			}

			return game.save();
		})
		.then(function(game) {
			return checkGameResult(game);
		})
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
				} else {
					throw new Error('Must be creator');
				}
			})
			.then(function(game) {
				res.status(200).json(game);
			}, function(err) {
				next(err);
			});
		},

		result: function(req, res, next) {
			
			if(!req.session.user) {
				next(new Error('Must be logged in'));
			}

			return resultGame(req.params.id, req.session.user, req.body.vote)
			.then(function(game) {
				res.status(200).json(game);
			}, function(err) {
				next(err);
			});
		}
	}
}
