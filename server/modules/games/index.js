var Promise = require('bluebird');

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
			ref: 'User',
			required: true
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

			return game.save();
		});
	};

	return {

		create: function(req, res, next) {
				
			if(!req.session.user) {
				throw new Error('Must be logged in to create a game');
			}

			var fields = req.body || {};
			fields.creator = req.session.user;
			
			create(fields)
			.then(function(game) {

				req.session.currentGame = game.id;
				res.status(201).json({});
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

				res.status(200).json(game);
			})
			.catch(function(err) {
				next(err);
			})
		}
	}
}
