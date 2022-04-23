#version 300 es
/*@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
 * crystalizeAndCurlShader  :   Calculate Crystalization and 
 *                              Curl of Velocity
 *
 * PROGRAMMER   :   ABOUZAR KABOUDIAN
 * DATE         :   Tue 06 Nov 2018 10:54:20 (EST)
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

uniform float           Ptr ;
uniform sampler2D       in_n0_rho_ux_uy ;
uniform sampler2D       in_g0_c_b_b0 ;

uniform sampler2D       in_fluid_curl ;
uniform usampler2D      in_state_0 ;
uniform usampler2D      in_state_1 ;

/*------------------------------------------------------------------------
 * output layers
 *------------------------------------------------------------------------
 */
layout (location = 0)  out vec4     out_fluid_curl ;
layout (location = 1)  out vec4     out_solid ;
layout (location = 2)  out vec4     out_transition ;
layout (location = 3)  out uvec4    out_state_0 ;
layout (location = 4)  out uvec4    out_state_1 ;


#define     isFluid(pos)    texture(in_fluid_curl, pos).r>0.5
#define     isOverSaturated(pos)    \
    ((texture(in_g0_c_b_b0, pos).b/texture(in_g0_c_b_b0, pos).a)>2.)


#define     four9ths    (4./9.)
#define     one9th      (1./9.)
#define     one36th     (1./36.)

/*------------------------------------------------------------------------
 * Global variables
 *------------------------------------------------------------------------
 */
vec4    fluid_curl ;
vec2    ii , jj, cc ;
uvec4   state_0,  state_1 ;

#define MAX_INT 4294967295

uint safeAdd(uint a, uint b){
    if ( a > (uint(MAX_INT)-b) ){ return (a+b) ;}
    else if ( a>b ){ return (a-b) ;}
    else { return (b-a) ;}
}
/*========================================================================
 * rand :   calculate a random number between 0-1 using xorwow algorithm
 *========================================================================
 */
float rand(){
    uint d = state_1.r ;
    uint s, t = state_0.a ;    
    t ^= t >> 2 ;
    t ^= t << 1 ;
    state_0.a = state_0.b ; 
    state_0.b = state_0.g ; 
    state_0.g = (s = state_0.r) ;
    t ^= s ;
    t ^= s << 4 ;	
    state_0.r = t ;
    state_1.r = safeAdd(state_1.r , state_1.g) ;
    return float(t + state_1.r)/4294967295. ;
    // Older Machines could not handle the above version and
    // I used the following hack! The following hack is not suggested 
    // for simulations which are more sensitive to the random number
    // generation algorithm.
    //return float(t+d)/4294967295. ;
}

/*========================================================================
 * calculateCurl
 *========================================================================
 */
void calculateCurl(){
    fluid_curl = texture( in_fluid_curl, cc ) ;

    if (    cc.x > ii.x         &&
            cc.x < (1.-ii.x)    &&
            cc.y > jj.y         && 
            cc.y < (1.-jj.y)        ){
        fluid_curl.g = 
                texture( in_n0_rho_ux_uy, cc + ii ).a 
            -   texture( in_n0_rho_ux_uy, cc - ii ).a
            +   texture( in_n0_rho_ux_uy, cc + jj ).b
            -   texture( in_n0_rho_ux_uy, cc - jj ).b ;
    }

    /* set curl to zero on external boundaries */
    if (    cc.y < 2.*jj.y      || 
            cc.y > 1.-2.*jj.y   || 
            cc.x < ii.x*2.      || 
            cc.x > 1.-2.*ii.x       ){
        fluid_curl.g = 0. ;
    }

    return ;
}

/*========================================================================
 * hasSolidNeighbor 
 *========================================================================
 */
bool hasSolidNeighbor(vec2 pos){

    for(int i=-1; i<2 ;i++){
        for(int j=-1; j<2; j++){
            if ( texture( in_fluid_curl, 
                        pos + float(i)*ii + float(j)*jj).r < 0.5)
                return true ;
        }
    }
    return false ;
}

/*========================================================================
 * transition : checks if a node has reached critical concentration and 
 *              makes a transition with probability of prob
 *========================================================================
 */
bool transition(vec2 pos, float prob){
    vec4 inpt = texture( in_g0_c_b_b0 , pos ) ;
    float rate = inpt.b/inpt.a ;
    if (    (rate)>2.  && 
            /* isFluid(pos)        && */
            hasSolidNeighbor(pos) )
        if ( rand() < prob*Ptr )
            return true ;
    else
        return false ;
}

/*========================================================================
 * phaseTransition
 *========================================================================
 */
void phaseTransition(){
    bool crystalized = false ;
    
    bool c0,c1,c2,c3,c4,c5,c6,c7,c8 ;
    if (    cc.x < 2.*ii.x     || 
            cc.x > 1.-2.*ii.x  ||
            cc.y < 2.*jj.y      ||
            cc.y > 1.-2.*jj.y      ){
        return ;
    }
    if ( isFluid(cc) && hasSolidNeighbor(cc) ){
        c0 = transition(cc,      four9ths    ) ; 
        c1 = transition(cc+ii,   one9th      ) ;
        c2 = transition(cc-ii,   one9th      ) ;
        c3 = transition(cc+jj,   one9th      ) ;
        c4 = transition(cc-jj,   one9th      ) ;
        c5 = transition(cc+ii+jj,one36th     ) ;
        c6 = transition(cc-ii+jj,one36th     ) ;
        c7 = transition(cc+ii-jj,one36th     ) ;
        c8 = transition(cc-ii-jj,one36th     ) ;

        if (c0) out_transition = vec4( 0.,   0.,    0.,1.) ;
        if (c1) out_transition = vec4(-1.,   0.,    0.,1.) ;
        if (c2) out_transition = vec4( 1.,   0.,    0.,1.) ;
        if (c3) out_transition = vec4( 0.,  -1.,    0.,1.) ;
        if (c4) out_transition = vec4( 0.,   1.,    0.,1.) ;
        if (c5) out_transition = vec4(-1.,  -1.,    0.,1.) ;
        if (c6) out_transition = vec4( 1.,  -1.,    0.,1.) ;
        if (c7) out_transition = vec4(-1.,   1.,    0.,1.) ;
        if (c8) out_transition = vec4( 1.,   1.,    0.,1.) ;

        if (c0||c1||c2||c3||c4||c6||c7||c8) {
            fluid_curl.r = 0. ;
            fluid_curl.a = fluid_curl.b ;
            return ;
        }
    }
}

/*========================================================================
 * main body of the shader
 *========================================================================
 */
void main(){
    vec2    size = vec2(textureSize( in_fluid_curl, 0 ) ); 
    cc = pixPos ;

    out_transition = vec4(0.) ;

    /* unit vectors in x and y directions */ 
    ii = vec2(1.,0.)/size ;
    jj = vec2(0.,1.)/size ;

    state_0 = texture( in_state_0, cc ) ;
    state_1 = texture( in_state_1, cc ) ;

    calculateCurl() ;
    phaseTransition() ;
    fluid_curl.z += 0.5 ;
    out_fluid_curl = fluid_curl ;
    out_solid  = vec4(1.-out_fluid_curl.r) ;

    out_state_0 = state_0 ;
    out_state_1 = state_1 ;

    out_state_0 = state_0 ;
    out_state_1 = state_1 ;

    return ;
}
