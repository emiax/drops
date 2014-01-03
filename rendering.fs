precision mediump float;

uniform sampler2D simulation;
varying vec2 vTextureCoordinates;
//////////////////////////////////////////////////// SIMPLEX NOISE
//
// Description : Array and textureless GLSL 2D/3D/4D simplex 
//               noise functions.
//      Author : Ian McEwan, Ashima Arts.
//  Maintainer : ijm
//     Lastmod : 20110822 (ijm)
//     License : Copyright (C) 2011 Ashima Arts. All rights reserved.
//               Distributed under the MIT License. See LICENSE file.
//               https://github.com/ashima/webgl-noise
// 

vec3 mod289(vec3 x) {
  return x - floor(x * (1.0 / 289.0)) * 289.0;
}

vec4 mod289(vec4 x) {
  return x - floor(x * (1.0 / 289.0)) * 289.0;
}

vec4 permute(vec4 x) {
     return mod289(((x*34.0)+1.0)*x);
}

vec4 taylorInvSqrt(vec4 r)
{
  return 1.79284291400159 - 0.85373472095314 * r;
}

float snoise(vec3 v)
  { 
  const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
  const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);

// First corner
  vec3 i  = floor(v + dot(v, C.yyy) );
  vec3 x0 =   v - i + dot(i, C.xxx) ;

// Other corners
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min( g.xyz, l.zxy );
  vec3 i2 = max( g.xyz, l.zxy );

  //   x0 = x0 - 0.0 + 0.0 * C.xxx;
  //   x1 = x0 - i1  + 1.0 * C.xxx;
  //   x2 = x0 - i2  + 2.0 * C.xxx;
  //   x3 = x0 - 1.0 + 3.0 * C.xxx;
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy; // 2.0*C.x = 1/3 = C.yx
  vec3 x3 = x0 - D.yyy;      // -1.0+3.0*C.x = -0.5 = -D.y

// Permutations
  i = mod289(i); 
  vec4 p = permute( permute( permute( 
             i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
           + i.y + vec4(0.0, i1.y, i2.y, 1.0 )) 
           + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));

// Gradients: 7x7 points over a square, mapped onto an octahedron.
// The ring size 17*17 = 289 is close to a multiple of 49 (49*6 = 294)
  float n_ = 0.142857142857; // 1.0/7.0
  vec3  ns = n_ * D.wyz - D.xzx;

  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);  //  mod(p,7*7)

  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_ );    // mod(j,N)

  vec4 x = x_ *ns.x + ns.yyyy;
  vec4 y = y_ *ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);

  vec4 b0 = vec4( x.xy, y.xy );
  vec4 b1 = vec4( x.zw, y.zw );

  //vec4 s0 = vec4(lessThan(b0,0.0))*2.0 - 1.0;
  //vec4 s1 = vec4(lessThan(b1,0.0))*2.0 - 1.0;
  vec4 s0 = floor(b0)*2.0 + 1.0;
  vec4 s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));

  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;

  vec3 p0 = vec3(a0.xy,h.x);
  vec3 p1 = vec3(a0.zw,h.y);
  vec3 p2 = vec3(a1.xy,h.z);
  vec3 p3 = vec3(a1.zw,h.w);

//Normalise gradients
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;

// Mix final noise value
  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1), 
                                dot(p2,x2), dot(p3,x3) ) );
  }


//////////////////////////////////////////////////// MAIN



vec4 normalBlend(vec4 front, vec4 back) {
  vec3 color = front.rgb*front.a + back.rgb*(1.0 - front.a)*back.a;
  float alpha = front.a + back.a*(1.0 - front.a);
  return vec4(color, alpha);
}

void main(void) {
  vec4 color = texture2D(simulation, vTextureCoordinates);
  
  vec4 enhancedColor = color;

  vec2 coord0 = vTextureCoordinates;
  enhancedColor.a = clamp(color.a*10.0, 0.0, 1.1);

  
  //  gl_FragColor = vec4(0.2, 0.2, 0.3, 1.0);

  
  float pixelSize = 1.0/1024.0;


  vec4 sampleAA = texture2D(simulation, vec2(coord0.x - pixelSize, coord0.y - pixelSize));
  vec4 sampleA0 = texture2D(simulation, vec2(coord0.x - pixelSize, coord0.y));
  vec4 sampleAB = texture2D(simulation, vec2(coord0.x - pixelSize, coord0.y + pixelSize));

  vec4 sample0A = texture2D(simulation, vec2(coord0.x, coord0.y - pixelSize));
  //  vec4 sample00 = texture2D(simulation, vec2(coord0.x, coord0.y));
  vec4 sample0B = texture2D(simulation, vec2(coord0.x, coord0.y + pixelSize));

  vec4 sampleBA = texture2D(simulation, vec2(coord0.x + pixelSize, coord0.y - pixelSize));
  vec4 sampleB0 = texture2D(simulation, vec2(coord0.x + pixelSize, coord0.y));
  vec4 sampleBB = texture2D(simulation, vec2(coord0.x + pixelSize, coord0.y + pixelSize));

  float derX = sampleA0.a - sampleB0.a;
  float derY = sample0A.a - sample0B.a;

  //  if (coord0.x > 0.5) {
  //   color.a = (sampleAA.a + 2.0*sampleA0.a + sampleAB.a + 2.0*sample0A.a + color.a*2.0 + 2.0*sample0B.a + sampleBA.a + 2.0*sampleB0.a + sampleBB.a)/8.0;
  // }
    

  vec3 backgroundColor0 = vec3(0.04, 0.04, 0.04);
  vec3 backgroundColor1 = vec3(0.03, 0.03, 0.03);

  float fractal =  1.0*snoise(vec3(coord0*5.0, 0.42));
  fractal += 0.5*snoise(vec3(coord0*10.0, 0.28));
  fractal += 0.25*snoise(vec3(coord0*20.0, 3.28));

  vec4 backgroundColor = vec4(mix(backgroundColor0, backgroundColor1, fractal), 1.0);
  
  float diffuse = clamp(derX - derY, -1.0, 1.0);
  //  float shadow = clamp(-derX - derY, 0.0, 1.0);

  //  baseColor.xyz += 10.0*diffuse;

  gl_FragColor = normalBlend(enhancedColor, backgroundColor);
  gl_FragColor.rgb -= 2.0*diffuse;
  
  //  gl_FragColor = backgroundColor;

  //  gl_FragColor
  /*  if (coord0.x > 0.5) {
    if (coord0.y > 0.66) {
      // top
      gl_FragColor = vec4(color.a, color.a, color.a, 1.0);
    } else if (coord0.y > 0.33) {
      // middle
      gl_FragColor = vec4(0.5 + 10.0*derX, 0.5 + 10.0*derY, 1.0, 1.0);
    } else {
      // bottom
      gl_FragColor = vec4(color.rgb, 1.0);
    }
    }*/
  //   
  //      

}



/// TODO: blur, normal calculation, fresnel based shading?
/// TODO: Get rid of erasing color. 
/// TODO: Try uning coord2.
/// TODO: Normal blening mode instead of subtract.
/// TODO: A nicer way to do splashes.
