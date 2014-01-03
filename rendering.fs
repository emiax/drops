precision mediump float;

uniform sampler2D simulation;
varying vec2 vTextureCoordinates;

void main(void) {
  vec4 color = texture2D(simulation, vTextureCoordinates)*2.0;
  //  gl_FragColor = vec4(0.2, 0.2, 0.3, 1.0);
  gl_FragColor = vec4(1.0 - color.x, 1.0 - color.y, 1.0 - color.z, color.a*4.0);

  //  gl_FragColor = vec4(color.a, color.a, color.a, 1.0);

}



/// TODO: blur, normal calculation, fresnel based shading?
/// TODO: Get rid of erasing color. 
/// TODO: Try uning coord2.
/// TODO: Normal blening mode instead of subtract.
/// TODO: A nicer way to do splashes.
