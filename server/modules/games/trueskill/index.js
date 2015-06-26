var _ = require('lodash');
var math = require('mathjs');
var gaussian = require('gaussian')(0, 1);

var TruncatedGaussianCorrectionFunctions = require('./truncated-gaussian-correction-functions');
var Defaults = require('./defaults');

var getDrawMarginFromDrawProbability = function(drawProbability, beta) {

    return 0; // draw probability is always 0 for us
    // return gaussian.ppf(.5 * (drawProbability + 1))* math.sqrt(2) * beta;
};

var calculateMatchQuality = function(game, teams) {

    var teamA = teams[0];
    var teamB = teams[1];

    var teamAcount = teamA.length;
    var teamBcount = teamB.length;

    var totalPlayers = teamAcount + teamBcount;

    var betaSquared = math.square(game.beta);
    
    var teamAMeanSum = _.sum(teamA, 'rating.mean');

    var teamAStdDevSquared = _.sum(teamA, function(p) {
        return math.square(p.rating.standardDeviation);
    });

    var teamBMeanSum = _.sum(teamB, 'rating.mean');

    var teamBSigmaSquared = _.sum(teamB, function(p) {
        return math.square(p.rating.standardDeviation);
    });


    var sqrtPart = math.sqrt(
        (totalPlayers*betaSquared) / (totalPlayers * betaSquared + teamAStdDevSquared + teamBSigmaSquared)
    );

    var expPart = math.exp(
        (-1 * math.square(teamAMeanSum -  teamBMeanSum)) / (2 * (totalPlayers * betaSquared + teamAStdDevSquared + teamBSigmaSquared))
    );

    return expPart * sqrtPart;
};

var calculateStakes = function(game, teams) {

    var drawMargin = getDrawMarginFromDrawProbability(game.drawProbability, game.beta);
    var betaSquared = math.square(game.beta);
    var tauSquared = math.square(game.dynamicsFactor);

    var teamA = {
        players: teams[0],
        meanSum: _.sum(teams[0], function(player) { return player.rating.mean; }),
        stdDevSquareSum: _.sum(teams[0], function(player) { return math.square(player.rating.standardDeviation); })
    };

    var teamB = {
        players: teams[1],
        meanSum: _.sum(teams[1], function(player) { return player.rating.mean; }),
        stdDevSquareSum: _.sum(teams[1], function(player) { return math.square(player.rating.standardDeviation); })
    };    

    var totalPlayers = teamA.players.length + teamB.players.length;

    var c = math.sqrt( teamA.stdDevSquareSum + teamB.stdDevSquareSum + (totalPlayers * betaSquared) );

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

                var newStdDev = math.sqrt(
                     (math.square(oldRating.standardDeviation) + tauSquared ) * ( 1 - (w * stdDevMultiplier) )
                );

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

module.exports = {
    calculateStakes: calculateStakes,
    calculateMatchQuality: calculateMatchQuality
};


// debug tests
// compare to: http://boson.research.microsoft.com/trueskill/rankcalculator.aspx

var testAndPrint = function() {
    
    var testGame = new Defaults.game();

    var testTeamA = [ 
        { name: 'vita', rating: { mean: 25, standardDeviation: 8.333 }},
        { name: 'rsp', rating: { mean: 25, standardDeviation: 8.333 }},
        { name: 'pojo', rating: { mean: 25, standardDeviation: 8.333 }},
        { name: 'deadprez', rating: { mean: 25, standardDeviation: 8.333 }}
    ];

    var testTeamB = [ 
        { name: 'gorge', rating: { mean: 25, standardDeviation: 8.333 }},
        { name: 'shy', rating: { mean: 25, standardDeviation: 8.333 }},
        { name: 'firetako', rating: { mean: 25, standardDeviation: 8.333 }},
        { name: 'teddy', rating: { mean: 25, standardDeviation: 8.333 }}
    ];

    var stakes = calculateStakes(testGame, [ testTeamA, testTeamB ]);
    console.log('---------------');
    console.log('team A wins');

    console.log(':::team A:::')
    _.forEach(stakes.teamAWins.winner, function(player) {
        console.log(player.name, 'm', player.rating.mean, 't', player.rating.standardDeviation);
    });

    console.log(':::team B:::')
    _.forEach(stakes.teamAWins.loser, function(player) {
        console.log(player.name, 'm', player.rating.mean, 't', player.rating.standardDeviation);
    });

    console.log('---------------');
    console.log('match quality', calculateMatchQuality(testGame, [testTeamA, testTeamB]));
}

// testAndPrint();

