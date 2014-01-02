precision mediump float;

uniform sampler2D simulation;
varying vec2 vTextureCoordinates;

void main(void) {
  vec4 cmy = texture2D(simulation, vTextureCoordinates);
  gl_FragColor = vec4(1.0 - cmy.x, 1.0 - cmy.y, 1.0 - cmy.z, 1.0);
}
