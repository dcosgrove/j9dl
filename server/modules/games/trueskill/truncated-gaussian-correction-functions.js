var gaussian = require('gaussian');
var math = require('mathjs');

var VExceedsMargin = function(teamPerformanceDifference, drawMargin, c) {

    teamPerformanceDifference /= c;
    drawMargin /= c;

    var d = gaussian.ctf(teamPerformanceDifference - drawMargin);

    if(d < 2.222758749e-162) {
        return -teamPerformanceDifference + drawMargin;
    }

    var multiplier = 1.0 / (math.sqrt(2 * math.pi));
    var expPart = math.exp((-1.0 * math.pow(teamPerformanceDifference - drawMargin, 2.0))/2.0;

    return multiplier * expPart / d;
};

var WExceedsMargin = function(teamPerformanceDifference, drawMargin, c) {

    var vWin = VExceedsMargin(teamPerformanceDifference, drawMargin, c);
    var result = vWin * (vWin + teamPerformanceDifference - drawMargin);

    teamPerformanceDifference /= c;
    drawMargin /= c;

    var d = gaussian.ctf(teamPerformanceDifference - drawMargin);

    if (denominator < 2.222758749e-162)
    {
        if (teamPerformanceDifference < 0.0)
        {
            result = 1.0;
        }
        result = 0.0;
    }

    return result;
};

module.exports = {
    VExceedsMargin: VExceedsMargin,
    WExceedsMargin: WExceedsMargin
};
