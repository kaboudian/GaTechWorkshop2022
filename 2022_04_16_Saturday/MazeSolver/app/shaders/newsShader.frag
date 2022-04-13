#version 300 es
/*@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
 * newsShader   :   Determine the nodes on n, e, w, and s boundaries
 *
 * PROGRAMMER   :   ABOUZAR KABOUDIAN
 * DATE         :   Tue 20 Aug 2019 12:15:22 (EDT)
 * PLACE        :   Chaos Lab @ GaTech, Atlanta, GA
 *@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
 */
precision highp float;
precision highp int ;

/*------------------------------------------------------------------------
 * Interface variables
 *------------------------------------------------------------------------
 */
in vec2 cc ;
uniform sampler2D phase ;

// Shader output .........................................................
layout (location = 0) out vec4 news ;

/*========================================================================
 * neighborFactor
 *========================================================================
 */
float neighborFactor(vec2 dir){
    if ( texture(phase, cc+dir).r >0.5 ){
        return 1. ;
    }else if ( texture(phase, cc-dir).r>0.5 ){
        return -1. ;
    }else{
        return 0. ;
    }
}

/*========================================================================
 * main
 *========================================================================
 */
void main(){
    // Unit vectors ......................................................
    vec2 size   = vec2(textureSize(phase,0)) ;
    vec2 ii     = vec2(1.,0.)/size ;
    vec2 jj     = vec2(0.,1.)/size ;

    // East ..............................................................
    float e =  neighborFactor(  ii ) ;
    
    // West ..............................................................
    float w = -neighborFactor( -ii ) ;

    // North .............................................................
    float n =  neighborFactor(  jj ) ;

    // South .............................................................
    float s = -neighborFactor( -jj ) ;

    // Shader output .....................................................
    news = vec4(n,e,w,s) ;

    return ;
}
