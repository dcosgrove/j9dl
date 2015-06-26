var gaussian = require('gaussian')(0, 1);
var math = require('mathjs');

var epsilon = 1e-20; // TODO - ensure epsilon @ 1e-20 is low enough

var VExceedsMargin = function(teamPerformanceDifference, drawMargin, c) {

    teamPerformanceDifference /= c;
    drawMargin /= c;

    var d = gaussian.cdf(teamPerformanceDifference - drawMargin);

    if(d < epsilon) {
        return -teamPerformanceDifference + drawMargin;
    }

    return gaussian.pdf(teamPerformanceDifference - drawMargin) / d;
};

var WExceedsMargin = function(teamPerformanceDifference, drawMargin, c) {

    teamPerformanceDifference /= c;
    drawMargin /= c;

    var vWin = VExceedsMargin(teamPerformanceDifference, drawMargin, 1); // don't divide by d again
    var result = vWin * (vWin + teamPerformanceDifference - drawMargin);

    var d = gaussian.cdf(teamPerformanceDifference - drawMargin);

    if (d < epsilon)
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
