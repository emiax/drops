(function () {
    var canvas = document.getElementById('canvas');
    var gl = getContext(canvas);
    var stats = new Stats();



    var textures = {};

    /**
     * GLSL rendering program
     */
    var renderingProgram = null;

    /**
     * GLSL simulation program
     */
    var simulationProgram = null;


    /**
     * Number of seeds. (splat points)
     */
    var nSeeds = 8;


    /**
     * Simulation Env
     */
    var simulationEnv = null;

    /**
     * Time
     */
    var t = 0;

    /**
     * Try to exctract the webgl context
     */
    function getContext() {
        var gl;
        try {
            gl = canvas.getContext('webgl');
        } catch (e) {
            alert("could not initialize webgl.");
        }
        return gl;
    }


    /**
     * Get a shader source file from url and invoke cb(shader) when done.
     * If url ends with .vs the shader is treated as a vertex shader.
     */
    function getShader(url, cb) {
        var req = new XMLHttpRequest();
        var type = url.substr(url.indexOf('.') + 1) === 'vs' ? gl.VERTEX_SHADER : gl.FRAGMENT_SHADER;

        req.open("GET", url, true);
        req.onreadystatechange = function () {
            if (req.readyState == 4 && req.status == 200) {
                source = req.responseText;
                var shader = gl.createShader(type);
                gl.shaderSource(shader, source);
                gl.compileShader(shader);

                if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
                    console.log("'" + url + "' compiled successfully.");
                    if (cb) { cb(shader); }
                } else {
                    console.error(gl.getShaderInfoLog(shader));
                }
            }

        }
        req.send();
    }


    /**
     * Get multiple shaders and invoke cb(id->shader)
     * Spec is a map id->sourceUrl
     */
    function getShaders(spec, cb) {
        var shaders = {};

        function recieveShader(id, shader) {
            shaders[id] = shader;
            var done = true;
            Object.keys(spec).forEach(function (id) {
                if (!shaders[id]) {
                    done = false;
                }
            });
            if (done) cb(shaders);
        }

        Object.keys(spec).forEach(function (id) {
            var url = spec[id];
            getShader(url, function (shader) {
                recieveShader(id, shader);
            });
        });
    }


    /*
     * Get texture
     */
    function getTexture(url, cb) {
        var texture = gl.createTexture();
        texture.image = new Image();
        texture.image.onload = function () {
            gl.bindTexture(gl.TEXTURE_2D, texture);
            gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, texture.image);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
            gl.bindTexture(gl.TEXTURE_2D, null);
            console.log(texture);
            cb(texture);
        }
        texture.image.src = url;

    }


    /**
     * Get multiple shaders and invoke cb(id->texture)
     * Spec is a map id->imageUrl
     */
    function getTextures(spec, cb) {
        var textures = {};

        function recieveTexture(id, texture) {
            textures[id] = texture;
            var done = true;
            Object.keys(spec).forEach(function (id) {
                if (!textures[id]) {
                    done = false;
                }
            });
            if (done) cb(textures);
        }

        Object.keys(spec).forEach(function (id) {
            var url = spec[id];
            getTexture(url, function (texture) {
                recieveTexture(id, texture);
            });
        });
    }


    /**
     * Start rendering
     */
    function startRendering() {
        var mode = 0;
        function renderLoop() {
            stats.begin();
            mode = !mode;
            simulate(mode, simulationEnv);
            render(mode);
            tick();
            stats.end();
            requestAnimationFrame(renderLoop);
        }
        renderLoop();
    }


    function simulate(mode, simulationEnv) {
        // Prepare for rendering to back simulation buffer.
        var backBuffer = simulationBuffer(!mode);
        gl.bindFramebuffer(gl.FRAMEBUFFER, backBuffer);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.useProgram(simulationProgram);

        // Vertex buffer.
        var squareVB = squareVertexBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, squareVB);
        gl.vertexAttribPointer(simulationProgram.vertexPositionAttribute, squareVB.nDimensions, gl.FLOAT, false, 0, 0);

        // Send in the front buffer (old simulation step)
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, simulationTexture(mode));
        gl.uniform1i(simulationProgram.simulationUniform, 0);

        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, textures['reference']);
        gl.uniform1i(simulationProgram.referenceUniform, 1);

        var seeds = simulationEnv.emit();

        var scatter = new Float32Array(nSeeds);
        var size = new Float32Array(nSeeds);
        var position = new Float32Array(nSeeds*2);
        var amount = new Float32Array(nSeeds);

        seeds.forEach(function (v, k) {
            v = v || {};
            scatter[k] = v.scatter || 0;
            size[k] = v.size || 0;
            if (v.position) {
                position[k*2] = v.position.x;
                position[k*2+1] = v.position.y;
            } else {
                position[k*2] = 0;
                position[k*2 + 1] = 0;
            }
            amount[k] = v.amount || 0;
        });
        
        gl.uniform1fv(simulationProgram.scatterUniform, scatter);
        gl.uniform1fv(simulationProgram.sizeUniform, size);
        gl.uniform2fv(simulationProgram.positionUniform, position);
        gl.uniform1fv(simulationProgram.amountUniform, amount);

/*        var scatter = Math.sin(time()*10)*15 + 20;
        var size = 0.1;//Math.abs(0.2 - time()/100.0);//Math.abs(Math.sin(time()*0.4)/10) + 0.2;
        var position = {
            x: (Math.sin(time()*13) + 1.0)/2,
            y: (Math.cos(time()*17) + 1.0)/2
        }
        var amount = (time() % 0.7 < 0.10) ? size*3.0*Math.random() : 0;
        var decay = time() % 8.0 < 0.01 ? 1/255 : 0;*/
        var decay = simulationEnv.decay();

        gl.uniform1f(simulationProgram.decayUniform, decay);
        gl.uniform1f(simulationProgram.timeUniform, time());
        
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, squareVB.nVertices);
    }


    function time() {
        return t;
    }


    function tick() {
        t+=0.01;
    }

    /**
     * Render one frame
     */
    function render(mode) {
        // Prepare for rendering.
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.useProgram(renderingProgram);

        // Vertex buffer.
        var squareVB = squareVertexBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, squareVB);
        gl.vertexAttribPointer(renderingProgram.vertexPositionAttribute, squareVB.nDimensions, gl.FLOAT, false, 0, 0);

        // Simuulation texture.
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, simulationTexture(mode));
        gl.uniform1i(renderingProgram.simulationUniform, 0);

        // Background texture.
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, textures['background']);
        gl.uniform1i(renderingProgram.backgroundUniform, 1);
        
        // Rendering needs time uniform.
        gl.uniform1f(renderingProgram.timeUniform, time());
        
        // Now render!
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, squareVB.nVertices);

    }


    /**
     * Create a square vertex buffer if it does not yet exist.
     * Return it.
     */
    var squareVertexBuffer = (function() {
        var vertexBuffer = null;
        // The real function is returned
        return (function () {
            if (!vertexBuffer) {
                // create a nice square.
                vertices = [
                        +1, +1,
                        -1, +1,
                        +1, -1,
                        -1, -1
                ];

                var vertexBuffer = gl.createBuffer();
                gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
                gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

                vertexBuffer.nDimensions = 2;
                vertexBuffer.nVertices = 4;
            }
            return vertexBuffer;
        })
    }());


    /**
     * Create a simulation framebuffer with id if it does not yet exist.
     * Return it.
     */
    var simulationBuffer = (function () {
        var framebuffers = [];
        // The real function is returned
        return (function(id) {
            if (!framebuffers[id]) {
                framebuffers[id] = gl.createFramebuffer();
                gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffers[id]);


                var renderbuffer = gl.createRenderbuffer();
                gl.bindRenderbuffer(gl.RENDERBUFFER, renderbuffer);
                gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, canvas.width, canvas.height);

                gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, simulationTexture(id), 0);
                gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, renderbuffer);


                gl.bindRenderbuffer(gl.RENDERBUFFER, null);
                gl.bindFramebuffer(gl.FRAMEBUFFER, null);
            }
            return framebuffers[id];
        });
    }());

    /**
     * Create a simulation texture with id if it does not yet exist.
     * Return it.
     */
    var simulationTexture = (function () {
        var textures = [];
        // The real function is returned
        return (function(id) {
            if (!textures[id]) {
                textures[id] = gl.createTexture();
                gl.bindTexture(gl.TEXTURE_2D, textures[id]);
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, canvas.width, canvas.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);
                gl.generateMipmap(gl.TEXTURE_2D);

                gl.bindTexture(gl.TEXTURE_2D, null);
            }
            return textures[id];
        })
    }());

    /**
     * Link vertexShader vs and fragmentShader fs to one shader program and return it.
     */
    function createShaderProgram(vs, fs) {
        program = gl.createProgram();
        gl.attachShader(program, vs);
        gl.attachShader(program, fs);
        gl.linkProgram(program);

        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            console.error("Could not link program");
        }

        return program;
    }


    /**
     * Initialize scene.
     */
    function init(shaders, tex) {
        //set up stats
//        stats.setMode(1); // 0: fps, 1: ms
        
        // Align top-left
        stats.domElement.style.position = 'absolute';
        stats.domElement.style.left = '0px';
        stats.domElement.style.top = '0px';
        document.body.appendChild( stats.domElement );

        // shasders
        var vs = shaders['vs'];
        var simulation = shaders['simulation'];
        var rendering = shaders['rendering'];
        
        simulationEnv = new SimulationEnv(nSeeds);
        var vj = new VJ(simulationEnv);
        vj.start();

        simulationProgram = createShaderProgram(vs, simulation);
        renderingProgram = createShaderProgram(vs, rendering);
        textures = tex;

        var squareVB = squareVertexBuffer();

        console.log("all shaders compiled");

        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.clearColor(0.0, 0.0, 0.0, 0.0);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

        // Attribute & Uniform Locations for simulation
        simulationProgram.squarePositionAttribute = gl.getAttribLocation(simulationProgram, 'aVertexPosition');
        simulationProgram.simulationUniform = gl.getUniformLocation(simulationProgram, 'simulation');
        simulationProgram.referenceUniform = gl.getUniformLocation(simulationProgram, 'reference');
        simulationProgram.timeUniform = gl.getUniformLocation(simulationProgram, 'time');
        simulationProgram.decayUniform = gl.getUniformLocation(simulationProgram, 'decay');

        simulationProgram.scatterUniform = gl.getUniformLocation(simulationProgram, 'scatter');
        simulationProgram.sizeUniform = gl.getUniformLocation(simulationProgram, 'size');
        simulationProgram.positionUniform = gl.getUniformLocation(simulationProgram, 'position');
        simulationProgram.amountUniform = gl.getUniformLocation(simulationProgram, 'amount');

        gl.enableVertexAttribArray(simulationProgram.squarePositionAttribute);
        gl.enableVertexAttribArray(simulationProgram.textureCoordinatesAttribute);

        // Attribute & Uniform Locations for rendering
        renderingProgram.squarePositionAttribute = gl.getAttribLocation(renderingProgram, 'aVertexPosition');
        renderingProgram.timeUniform = gl.getUniformLocation(renderingProgram, 'time');
        renderingProgram.simulationUniform = gl.getUniformLocation(renderingProgram, 'simulation');
        renderingProgram.backgroundUniform = gl.getUniformLocation(renderingProgram, 'background');
        gl.enableVertexAttribArray(renderingProgram.squarePositionAttribute);
        gl.enableVertexAttribArray(renderingProgram.textureCoordinatesAttribute);

        startRendering();
    }

    // Load shaders and start the simulation/rendering.
    getShaders({
        vs: 'vertexShader.vs',
        simulation: 'simulation.fs',
        rendering: 'rendering.fs'
    }, function (shaders) {
        getTextures({
            reference: 'scream.jpg',
            background: 'scream.jpg',
            text: 'scream.jpg'
        }, function (textures) {
            init(shaders, textures);
        })
    });
})();
