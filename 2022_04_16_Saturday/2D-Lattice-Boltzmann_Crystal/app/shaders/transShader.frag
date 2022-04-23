#version 300 es
/*@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
 * transShader  :   updates solid mass if crystalization happened
 *
 * PROGRAMMER   :   ABOUZAR KABOUDIAN
 * DATE         :   Tue 06 Nov 2018 10:19:33 (EST)
 * PLACE        :   Chaos Lab @ GaTech, Atlanta, GA
 *@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
 */
precision highp float;
precision highp int ;
precision highp usampler2D ;

/*------------------------------------------------------------------------
 * Interface variables : 
 *------------------------------------------------------------------------
 */
in vec2 pixPos ;

uniform sampler2D   in_g0_c_b_b0 ;
uniform sampler2D   in_transitioned ;

/*------------------------------------------------------------------------
 * output of the shader
 *------------------------------------------------------------------------
 */
layout (location = 0) out vec4  out_g0_c_b_b0 ;

/*------------------------------------------------------------------------
 * Global variables
 *------------------------------------------------------------------------
 */
vec2    cc, ic ;

/*========================================================================
 * Check if a node caused a neighbor's crystalization
 *========================================================================
 */
bool transitionedNeighbor(vec2 pos){
    vec4 trans ;
    for(int i=-1; i<2 ; i++){
        for(int j=-1; j<2 ; j++){
            trans = texture( in_transitioned , pos + vec2(i,j)*ic ) ;
            if (trans.a > 0.5 ){
                if ( length(trans.xy-vec2(i,j))<0.5 ){
                    return true ;
                }
            }
        }
    }
    return false ;
}

/*========================================================================
 * main body of the shader 
 *========================================================================
 */
void main(){
    vec2 size = vec2(textureSize( in_g0_c_b_b0, 0 ) ) ;
    cc = pixPos ;
    ic = vec2(1.)/size ;

    out_g0_c_b_b0 = texture(in_g0_c_b_b0 , cc ) ;

    if (transitionedNeighbor(cc)){
        out_g0_c_b_b0.b = out_g0_c_b_b0.a ;
    }
    return ;
}
