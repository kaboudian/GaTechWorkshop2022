#version 300 es
/*@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
 * initShader   :   Initialize Minimal Model 
 *
 * PROGRAMMER   :   ABOUZAR KABOUDIAN
 * DATE         :   Wed 19 Jul 2017 12:31:30 PM EDT
 * PLACE        :   Chaos Lab @ GaTech, Atlanta, GA
 *@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
 */
precision highp float;

/*------------------------------------------------------------------------
 * Interface variables : 
 * varyings change to "in" types in fragment shaders 
 * and "out" in vertexShaders
 *------------------------------------------------------------------------
 */
in vec2 pixPos ;


uniform sampler2D crdtTxt ;
uniform sampler2D dcmpMap ;

/*------------------------------------------------------------------------
 * It turns out for my current graphics card the maximum number of 
 * drawBuffers is limited to 8 
 *------------------------------------------------------------------------
 */
layout (location = 0 )  out vec4 outFtrgt ;
layout (location = 1 )  out vec4 outStrgt ;



/*========================================================================
 * Main body of the shader
 *========================================================================
 */
void main() {
    vec2    C  = texture( dcmpMap, pixPos   ).xy ;
    vec3    cc = texture( crdtTxt, C        ).xyz ;
    
    float   u = -83.0 ;
    float   m = 0.0 ;
    float   h = 0.85;
    float   j = 1.0 ;

    vec4 trgt = vec4(u,m,h,j) ;

    outFtrgt = trgt ; 
    outStrgt = trgt ; 
    return ;
}
