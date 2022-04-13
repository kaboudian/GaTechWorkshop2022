#version 300 es
/*@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
 * initShader   :   Initialize Beeler-Reuter Variables 
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

uniform sampler2D crdtTxt, phaseTxt ;

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
    vec3 cc   = texture(crdtTxt, pixPos ).xyz ;
    float phase  = texture(phaseTxt, pixPos).r ;
    vec4 trgt = vec4(0.,1.,0.0,.0) ;

    if ( phase >=1. ){
        if ( cc.z <0.5 )
            if(cc.x >0.50 && cc.x<0.55 )
                trgt.r = 1. ;
            else if ( cc.x >0.3 && cc.x <0.5 )
                trgt.g = .4 ;

    }
    outFtrgt = trgt ;
    outStrgt = trgt ;
    return ;
}
