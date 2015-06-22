var _ = require('lodash');
var math = require('mathjs');

var calculateMatchQuality = function(game) {

    var team1 = game.teams[0];
    var team2 = game.teams[1];

    var team1count = team1.length;
    var team2count = team2.length;

    var totalPlayers = team1count + team2count;

    var betaSquared = math.square(game.beta);
    
    var team1MeanSum = _.sum(team1, 'mean');

    var team1StdDevSquare = _.sum(team1, function(r) {
        return math.square(r.standardDeviation);
    });

    var team2MeanSum = _.sum(team2, 'mean');

    var team2SigmaSquared = _.sum(team2, function(r) {
        return math.square(r.standardDeviation);
    });


    var sqrtPart = math.sqrt(
        (totalPlayers*betaSquared) / (totalPlayers * betaSquared + team1StdDevSquared + team2SigmaSquared)
    );

    var expPart = math.exp(
        (-1 * math.square(team1MeanSum -  team2MeanSum)) / (2 * (totalPlayers * betaSquared + team1StdDevSquared + team2SigmaSquared))
    );

    return expPart * sqrtPart;
}
