
var defaultInitialMean = 25.0;

module.exports = {

    // values from: https://github.com/moserware/Skills/blob/master/Skills/GameInfo.cs
    game: {
        beta: defaultInitialMean / 6.0,
        drawProbability: 0.10,
        initialMean: defaultInitialMean,
        dynamicsFactor: defaultInitialMean / 300.0,
        initialStandardDeviation:  defaultInitialMean / 3.0
    }
}
