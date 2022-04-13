#version 300 es
/*@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
 * compShader   :   One-Variable Maze Solver
 *
 * PROGRAMMER   :   ABOUZAR KABOUDIAN
 * DATE         :   Tue 20 Aug 2019 14:36:07 (EDT)
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

// Uniforms ..............................................................
uniform sampler2D   inV ;
uniform sampler2D   newsTxt ;
uniform sampler2D   mazeTxt ;

uniform float       dt ;
uniform float       D;
uniform float       a, b, epsilon ;

// Shader output .........................................................
layout (location = 0 )  out float outV ;

/*========================================================================
 * Laplacian
 *========================================================================
 */
vec4 Laplacian(sampler2D samp, vec2 cc, vec2 ii, vec2 jj){
    vec4 news = texture(newsTxt,cc) ;
   // return (
   //         texture(samp, cc+ii*news.g)+texture(samp, cc+ii*news.b)+
   //         texture(samp, cc+jj*news.r)+texture(samp, cc+jj*news.a)-
   //         4.*texture(samp, cc) ) ;
    return (
            texture(samp, cc-ii)+texture(samp, cc+ii)+
            texture(samp, cc-jj)+texture(samp, cc+jj)-
            4.*texture(samp, cc) ) ;

}

/*========================================================================
 * Main body of the shader
 *========================================================================
 */
void main() {
    // Unit vectors ......................................................
    vec2 size   = vec2(textureSize( inV, 0 ) );
    vec2 ii     = vec2(1.0,0.0)/size ;
    vec2 jj     = vec2(0.0,1.0)/size ; 

    // Reading from the textures .........................................
    float   V = texture( inV , cc ).r ;
    float   V_old = V ;
    vec4    maze = texture(mazeTxt, cc) ;

    // Handling walls ....................................................
    if (maze.r<0.5){ outV = 0. ; return ; } 

    // Handling exits ....................................................
    if (maze.g>0.5){ outV = max(a,b) ; return ; }

    // Calculating diffusion .............................................
    float dV2dt = Laplacian(inV, cc, ii, jj).r*D ; 
    V += dV2dt*dt ;

    // Adding reaction terms .............................................
    dV2dt += epsilon*V*(V-a)*(b-V) ;

    
    // Sending the info out ..............................................
    outV = V_old + dV2dt*dt;

    return ;
}
