var _ = require('lodash');
var math = require('mathjs');
var gaussian = require('gaussian')(0, 1);

var TruncatedGaussianCorrectionFunctions = require('./truncated-gaussian-correction-functions');
var Defaults = require('./defaults');

var getDrawMarginFromDrawProbability = function(drawProbability, beta) {
    return gaussian.ppf(.5 * (drawProbability + 1))* math.sqrt(2) * beta;
};

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
};

var calculateNewRatings = function(game, teams) {

    var team1 = teams[0];
    var team2 = teams[1];

    var results;
};

var calculateStakes = function(game, teams) {

    var drawMargin = getDrawMarginFromDrawProbability(game.drawProbability, game.beta);
    var betaSquared = math.square(game.beta);
    var tauSquared = math.square(game.dynamicsFactor);

    var teamA = {
        players: teams[0],
        meanSum: _.sum(teams[0], function(player) { return player.rating.mean; }),
        stdDevSum: _.sum(teams[0], function(player) { return player.rating.standardDeviation; })
    };

    var teamB = {
        players: teams[1],
        meanSum: _.sum(teams[1], function(player) { return player.rating.mean; }),
        stdDevSum: _.sum(teams[1], function(player) { return player.rating.standardDeviation; })
    };    

    var totalPlayers = teamA.players.length + teamB.players.length;

    var c = math.sqrt( teamA.stdDevSum + teamB.stdDevSum + (totalPlayers * betaSquared) );

    var getStakesForOutcome = function(winner, loser) {

        var meanDelta = winner.meanSum - loser.meanSum;

        var v = TruncatedGaussianCorrectionFunctions.VExceedsMargin(meanDelta, drawMargin, c);
        var w = TruncatedGaussianCorrectionFunctions.WExceedsMargin(meanDelta, drawMargin, c);

        var calculateNewRatingsForPlayer = function(isWinner) {

            var rankMultiplier = isWinner ? 1 : -1;
            return function(player) {
                var oldRating = player.rating;

                var meanMultiplier = (math.square(oldRating.standardDeviation) + tauSquared) / c;
                var stdDevMultiplier = (math.square(oldRating.standardDeviation) + tauSquared) / math.square(c);

                var playerMeanDelta = meanMultiplier * v * rankMultiplier;
                var newMean = oldRating.mean + playerMeanDelta;

                var newStdDev = math.sqrt((math.square(oldRating.standardDeviation) + tauSquared ) * ( 1 - w * stdDevMultiplier ));

                return {
                    name: player.name,
                    rating: {
                        mean: newMean,
                        standardDeviation: newStdDev
                    }
                }
            }
        };

        return {
            winner: _.map(winner.players, calculateNewRatingsForPlayer(true)),
            loser: _.map(loser.players, calculateNewRatingsForPlayer(false))
        }
    };

    return {
        teamAWins: getStakesForOutcome(teamA, teamB),
        teamBWins: getStakesForOutcome(teamB, teamA)
    }
};

// tests

var testGame = new Defaults.game();

var testTeamA = [ 
    { name: 'vita', rating: { mean: 25, standardDeviation: 8.33 }},
    { name: 'rsp', rating: { mean: 25, standardDeviation: 8.33 }},
    { name: 'pojo', rating: { mean: 25, standardDeviation: 4 }}
];

var testTeamB = [ 
    { name: 'gorge', rating: { mean: 25, standardDeviation: 8.33 }},
    { name: 'shy', rating: { mean: 25, standardDeviation: 8.33 }},
    { name: 'firetako', rating: { mean: 25, standardDeviation: 8.33 }}
];

var stakes = calculateStakes(testGame, [ testTeamA, testTeamB ]);
console.log('---------------');
console.log('team A wins');

_.forEach(stakes.teamAWins.winner, function(player) {
    console.log(player.name, 'm', player.rating.mean, 't', player.rating.standardDeviation);
});

_.forEach(stakes.teamAWins.loser, function(player) {
    console.log(player.name, 'm', player.rating.mean, 't', player.rating.standardDeviation);
});

console.log('---------------');
console.log('team B wins');

_.forEach(stakes.teamBWins.loser, function(player) {
    console.log(player.name, 'm', player.rating.mean, 't', player.rating.standardDeviation);
});

_.forEach(stakes.teamBWins.winner, function(player) {
    console.log(player.name, 'm', player.rating.mean, 't', player.rating.standardDeviation);
});
 console.log('---------------');

