var _ = require('lodash');
var math = require('mathjs');


var Defaults = require('./defaults');


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

// public override IDictionary<TPlayer, Rating> CalculateNewRatings<TPlayer>(GameInfo gameInfo,
//                                                                           IEnumerable
//                                                                               <IDictionary<TPlayer, Rating>>
//                                                                               teams, params int[] teamRanks)
// {
//     Guard.ArgumentNotNull(gameInfo, "gameInfo");
//     ValidateTeamCountAndPlayersCountPerTeam(teams);

//     RankSorter.Sort(ref teams, ref teamRanks);

//     IDictionary<TPlayer, Rating> team1 = teams.First();
//     IDictionary<TPlayer, Rating> team2 = teams.Last();

//     bool wasDraw = (teamRanks[0] == teamRanks[1]);

//     var results = new Dictionary<TPlayer, Rating>();

//     UpdatePlayerRatings(gameInfo,
//                         results,
//                         team1,
//                         team2,
//                         wasDraw ? PairwiseComparison.Draw : PairwiseComparison.Win);

//     UpdatePlayerRatings(gameInfo,
//                         results,
//                         team2,
//                         team1,
//                         wasDraw ? PairwiseComparison.Draw : PairwiseComparison.Lose);

//     return results;
// }

var calculateNewRatings = function(game, teams) {

    var team1 = teams[0];
    var team2 = teams[1];

    var results;
}



var calculateStakes = function(game, teams) {

    var drawMargin = getDrawMarginFromDrawProbability(game.drawProbability, game.beta);
    var betaSquared = math.square(game.beta);
    var tauSquared = math.square(game.dynamicsFactor);

    var teamA = {
        players: teams[0],
        meanSum: _.sum(teams[0], function(player) { return player.rating.mean; }),
        stdDevSum = _.sum(teams[0], function(player) { return player.rating.standardDeviation; })
    };

    var teamB = {
        players: teams[1],
        meanSum: _.sum(teams[1], function(player) { return player.rating.mean; }),
        stdDevSum = _.sum(teams[1], function(player) { return player.rating.standardDeviation; })
    };    

    var totalPlayers = teamA.players.length + teamB.players.length;

    var c = math.sqrt( teamA.stdDevSum + teamB.stdDevSum + (totalPlayers * betaSquared) );

    var getStakesForOutcome = function(winner, loser) {

        var meanDelta = winner.meanSum - loser.meanSum;

        var v = TruncatedGaussianCorrectionFunctions.VExceedsMargin(meanDelta, drawMargin, c);
        var w = TruncatedGaussianCorrectionFunctions.WExceedsMargin(meanDelta, drawMargin, c);

        var calculateNewRatingsForPlayer = function(player) {
            var oldRating = player.rating;

            var meanMultiplier = (math.square(oldRating.standardDeviation) + tauSquared) / c;
            var stdDevMultiplier = (math.square(oldRating.standardDeviation) + tauSquared) / math.square(c);

            var playerMeanDelta = meanMultiplier * v * rankMultiplier;
            var newMean = oldRating.mean + playerMeanDelta;

            var newStdDev = math.sqrt((math.square(oldRating.standardDeviation) + tauSquared ) * ( 1 - w * stdDevMultiplier ));

            return {
                mean: newMean,
                standardDeviation: newStdDev
            }
        });

        return {
            winner: _.map(winner.players, calculateNewRatingsForPlayer),
            loser: _.map(loser.players, calculateNewRatingsForPlayer)
        }
    };

    return {
        teamAWins: getStakesForOutcome(teamA, teamB),
        teamBWins: getStakesForOutcome(teamB, teamA)
    }
}