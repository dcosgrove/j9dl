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
		forbids: [{ 
			type:  db.Schema.ObjectId ,
			ref: 'User'
		}],
		teamA: [{
			player: {
				type:  db.Schema.ObjectId,
				ref: 'User'
			},
			stakes: {
				win: {
					mean: {
						type: Number
					},
					standardDeviation: {
						type: Number
					}				
				},
				lose: {
					mean: {
						type: Number
					},
					standardDeviation: {
						type: Number
					}				
				},
			}
		}],
		teamB: [{
			player: {
				type:  db.Schema.ObjectId,
				ref: 'User'
			},
			stakes: {
				win: {
					mean: {
						type: Number
					},
					standardDeviation: {
						type: Number
					}				
				},
				lose: {
					mean: {
						type: Number
					},
					standardDeviation: {
						type: Number
					}				
				},
			}
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
		}
	});

	var Game = db.model('Game', gameSchema);
	var User = db.model('User');

	var create = function(fields) {
		return User.findById(fields.creator)
		.then(function(creator) {

			if(creator.currentGame) {
				throw new Error('Unable to create game, leave your current game first');
			}

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

	var forbidPlayer = function(player, caller) {

		return User.findById(player)
		.then(function(user) {
			return Game.findById(user.currentGame)
			.then(function(game) {
				if (!game.creator.equals(caller._id)) {
					throw new Error('Must be host to forbid');
				}

				if (game.players.indexOf(player) !== -1) game.players.remove(player);
				if (game.forbids.indexOf(player) === -1) game.forbids.push(player);
				return game.save();
			})
			.then(function() {
				user.currentGame = null;
				return user.save();
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

		return game.populateAsync('players')
		.then(function(game) {
			return Promise.all(_.map(game.players, function(player) {
				player.currentGame = null;
				return player.save();
			}));
		})
		.then(function() {
			return Game.removeAsync(game);
		});
	};

	var joinGame = function(game, player) {
		
		// TODO - more restrictions here
		return Game.findById(game)
		.then(function(game) {
			if (game.players.length >= 10) {
				throw new Error('Game is full');
			} else if (game.forbids.indexOf(player._id) !== -1) {
				throw new Error('You have been forbidden to join this game');
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
		if(game.players.length < 10) {
			return false
		}
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

				var stakes = tsr.calculateStakes([ teamA, teamB ]);

				game.matchQuality = teamInfo.quality;

				game.teamA = _.map(teamA, function(player) {

					return {
						player: player.id,
						stakes: {
							win: _.result(_.find(stakes.teamAWins, function(ratings) {
								return ratings.playerId == player.id;
							}), 'rating'),
							lose: _.result(_.find(stakes.teamBWins, function(ratings) {
								return ratings.playerId == player.id;
							}), 'rating')
						}
					}
				});

				game.teamB = _.map(teamB, function(player) {

					return {
						player: player.id,
						stakes: {
							win: _.result(_.find(stakes.teamBWins, function(ratings) {
								return ratings.playerId == player.id;
							}), 'rating'),
							lose: _.result(_.find(stakes.teamAWins, function(ratings) {
								return ratings.playerId == player.id;
							}), 'rating')
						}
					}
				});
				
				game.status = 'In Progress';

				return game.save();
			});
		});
	};

	var finalizeGame = function(game, outcome) {
		
		if(outcome == 'scratch') {
			// TODO - maybe save the voided game?? 
			return abortGame(game);
		} else {
			game.status = 'Complete';

			return game.populateAsync('teamA.player teamB.player')
			.then(function(game) {

				var teamAResult = outcome == 'A' ? 'win' : 'lose';
				var teamBResult = outcome == 'B' ? 'win' : 'lose';
				
				var ratingUpdates = [].concat(
					_.map(game.teamA, function(member) {
						member.player.rating = member.stakes[teamAResult];
						member.player.currentGame = null;
						return member.player.save();
					}),
					_.map(game.teamB, function(member) {
						member.player.rating = member.stakes[teamBResult];
						member.player.currentGame = null;
						return member.player.save();
					})
				);

				return Promise.all(ratingUpdates);
			})
			.then(function() {
				return game.save();
			});
		}
	};	

	var checkGameResult = function(game) {

		var playerCount = game.players.length; 

		var votes = _.reduce(game.results, function(tally, result) {
			tally[result.vote]++;
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

		return Promise.resolve(outcome);
	};

	var voteGame = function(gameId, playerId, vote) {

		return Game.findById(gameId)
		.then(function(game) {

			// ensure player is actually in the game they're trying to vote on
			var isPlaying = _.find(game.players, function(player) {
				return player.equals(playerId);
			});

			if(!isPlaying) {
				throw new Error('Player must be participating to result a game')
			} else if(game.status != 'In Progress') {
				throw new Error('Can only vote on games that are in progress');
			} else {
				return game;
			}
		})
		.then(function(game) {

			var index = _.findIndex(game.results, function(result) {
				return playerId.equals(result.player);
			});	

			if(index >= 0) {
				game.results.splice(index, 1);
				game.results.push({ player: playerId, vote: vote });
			} else {
				// new vote
				game.results.push({ player: playerId, vote: vote });
			}

			return game.save();
		})
		.then(function(game) {
			return checkGameResult(game)
			.then(function(outcome) {
				if(!outcome) {
					return game; // no update needed
				} else {
					return finalizeGame(game, outcome);
				}
			});
		});
	};

	return {

		create: function(req, res, next) {
				
			if(!req.user) {
				next(new Error('Must be logged in'));
			}

			var fields = req.body || {};
			fields.creator = req.user;

			return create(fields)
			.then(function(player) {
				res.status(201).json({
					id: player.currentGame
				});
			}, function(err) {
				next(err);
			});
		},

		withdraw: function(req, res, next) {

			if(!req.user) {
				next(new Error('Must be logged in'));
			} else if(req.user != req.params.user) {
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

		forbid: function(req, res, next) {

			if(!req.user) {
				next(new Error('Must be logged in'));
			}

			return forbidPlayer(req.params.user, req.user)
			.then(function() {
				res.status(200).json({});
			}, function(err) {
				next(err);
			});
		},

		abort: function(req, res, next) {
			
			if(!req.user) {
				next(new Error('Must be logged in'));
			}

			return Game.findById(req.params.id)
			.then(function(game) {
				if (game.creator.equals(req.user._id)) {
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

			if(!req.user) {
				next(new Error('Must be logged in'));
			}

			return User.findById(req.user)
			.then(function(user) {
				if(user.currentGame) {
					throw new Error('Unable to join, leave your current game first');
				}
			})
			.then(function() {
				return joinGame(req.params.id, req.user);
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

				return game.populateAsync('players creator teamA.player teamB.player')
			})
			.then(function(game) {
				res.status(200).json(game);
			})
			.catch(function(err) {
				next(err);
			})
		},

		list: function(req, res, next) {

			return Game.find().populate('creator')
			.then(function(games) {
				res.status(200).json(games);
			})
			.catch(function(err) {
				next(err);
			})
		},

		begin: function(req, res, next) {

			if(!req.user) {
				next(new Error('Must be logged in'));
			}

			return Game.findById(req.params.id)
			.then(function(game) {
				if(game.creator.equals(req.user._id)) {
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
			
			if(!req.user) {
				next(new Error('Must be logged in'));
			}

			return voteGame(req.params.id, req.user._id, req.body.vote)
			.then(function(game) {
				res.status(200).json(game);
			}, function(err) {
				next(err);
			});
		}
	}
}
