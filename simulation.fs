precision mediump float;

uniform sampler2D simulation;
varying vec2 vTextureCoordinates;

void main(void) {
  vec4 previous = texture2D(simulation, vTextureCoordinates);
  gl_FragColor = vec4(previous.x + 0.02, previous.y + 0.01, previous.z + 0.005, 1.0);
}
