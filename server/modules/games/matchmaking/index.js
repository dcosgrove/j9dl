var Combinatorics = require('js-combinatorics');
var _ = require('lodash');

module.exports = {

	findBalancedTeams: function(compare) {
		
		return function(game) {
		
			var players = game.players;

			var teamSize = players.length / 2;

			var generator = Combinatorics.combination(players, teamSize);

			var combination;

			var maxQuality = 0;
			var finalTeams;
			
			while(combination = generator.next()) {

				var teamA = combination;
				var teamB = _.xor(players, teamA);

				var quality = compare([teamA, teamB]);
				
				if(quality >= maxQuality) {
					maxQuality = quality;
					finalTeams = [ teamA, teamB ];
				}
			}
		
			return {
				teams: finalTeams,
				quality: maxQuality
			};
		}
	}
}
