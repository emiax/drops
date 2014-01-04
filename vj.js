var VJ = function (simulationEnv) {
    this.simulationEnv = simulationEnv;
}


VJ.prototype.start = function () {
    var scope = this;
    /// to do : initialize other stuff.
    setInterval(function () {
        var splat = new Splat({
            duration: Math.random()*20,
            size: Math.random()*0.1,
            startPosition: {
                x: Math.random(),
                y: Math.random()
            }, 
            velocity: {
                x: Math.random()*0.1 - 0.05,
                y: Math.random()*0.1 - 0.05
            },
            totalAmount: Math.random()*0.7 + 0.3
        });
        scope.simulationEnv.splat(splat);
    }, 200);
//    this.simulationEnv.splat(splat);
}
