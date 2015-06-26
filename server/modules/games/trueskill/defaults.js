
var defaultInitialMean = 25.0;

module.exports = {

    // values from: https://github.com/moserware/Skills/blob/master/Skills/GameInfo.cs
    game: function() {
        this.beta = defaultInitialMean / 6.0;
        this.drawProbability = 0.00;
        this.initialMean = defaultInitialMean;
        this.dynamicsFactor = defaultInitialMean / 300.0;
        this.initialStandardDeviation = defaultInitialMean / 3.0;
    }
}
