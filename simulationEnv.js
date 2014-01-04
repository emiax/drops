

var SimulationEnv = function (nSeeds) {
    this.nSeeds = nSeeds;
    this.splats = [];
}


SimulationEnv.prototype.splat = function (splat) {
    this.splats.push(splat);
};


SimulationEnv.prototype.removeFinishedSplats = function () {
    var i = 0, j = 0;
    var splats = this.splats;
    for (i = 0; i < splats.length; i++) {
        if (splats[i] && !splats[i].hasFinished()) {
            splats[j++] = splats[i];
        }
    }
    splats.length = j;
};


SimulationEnv.prototype.emit = function () {
    this.removeFinishedSplats();
    
    var seeds = new Array(nSeeds);
    var nSeeds = this.nSeeds;

    var i = 0;

    i = 0;
    this.splats.forEach(function (splat) {
        if (i >= nSeeds) {
            return;
        }
        var seed = splat.emit();
        seeds[i] = seed;
    });
    return seeds;
};

SimulationEnv.prototype.decay = function () {
    return 0;//1/255;
}


