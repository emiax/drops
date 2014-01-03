(function () {
    var canvas = document.getElementById('canvas');
    var gl = getContext(canvas);


    var loadedTexture = false;

    /**
     * GLSL rendering program
     */
    var renderingProgram = null;

    /**
     * GLSL simulation program
     */
    var simulationProgram = null;

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


    /**
     * Start rendering
     */
    function startRendering() {
        var mode = 0;
        function renderLoop() {
            mode = !mode;
            simulate(mode);
            render(mode);
            tick();
            requestAnimationFrame(renderLoop);
        }
        renderLoop();
    }


    function simulate(mode) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, simulationBuffer(!mode));
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.useProgram(simulationProgram);

        var squareVB = squareVertexBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, squareVB);
        gl.vertexAttribPointer(simulationProgram.vertexPositionAttribute, squareVB.nDimensions, gl.FLOAT, false, 0, 0);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, simulationTexture(mode));
        gl.uniform1i(simulationProgram.simulationUniform, 0);
        
        referenceTexture();
        if (loadedTexture) {
            gl.activeTexture(gl.TEXTURE1);
            gl.bindTexture(gl.TEXTURE_2D, referenceTexture());
            gl.uniform1i(simulationProgram.referenceUniform, 1);
        }


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
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.useProgram(renderingProgram);

        var squareVB = squareVertexBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, squareVB);
        gl.vertexAttribPointer(renderingProgram.vertexPositionAttribute, squareVB.nDimensions, gl.FLOAT, false, 0, 0);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, simulationTexture(mode));
        gl.uniform1i(renderingProgram.simulationUniform, 0);

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


    var referenceTexture = (function () {
        var texture = null;
        return function (id) {
            if (!texture) {
                texture = gl.createTexture();
                texture.image = new Image();
                texture.image.onload = function () {
                    loadedTexture = true;
                    console.log("LOADED!");
                    gl.bindTexture(gl.TEXTURE_2D, texture);
                    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
                    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, texture.image);
                    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
                    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
                    gl.bindTexture(gl.TEXTURE_2D, null);
                }
                texture.image.src = "scream.jpg";
            }
            return texture;
        };
        
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
    function init(shaders) {
        var vs = shaders['vs'];
        var simulation = shaders['simulation'];
        var rendering = shaders['rendering'];

        simulationProgram = createShaderProgram(vs, simulation);
        renderingProgram = createShaderProgram(vs, rendering);

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

        gl.enableVertexAttribArray(simulationProgram.squarePositionAttribute);
        gl.enableVertexAttribArray(simulationProgram.textureCoordinatesAttribute);

        // Attribute & Uniform Locations for rendering
        renderingProgram.squarePositionAttribute = gl.getAttribLocation(renderingProgram, 'aVertexPosition');
        renderingProgram.simulationUniform = gl.getUniformLocation(renderingProgram, 'simulation');
        gl.enableVertexAttribArray(renderingProgram.squarePositionAttribute);
        gl.enableVertexAttribArray(renderingProgram.textureCoordinatesAttribute);

        startRendering();
    }

    // Load shaders and start the simulation/rendering.
    getShaders({
        vs: 'vertexShader.vs',
        simulation: 'simulation.fs',
        rendering: 'rendering.fs'
    }, init);
})();
