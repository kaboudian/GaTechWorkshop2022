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
 * interface variables
 *------------------------------------------------------------------------
 */
in vec2 cc ;
uniform sampler2D mazeTxt ;
uniform float a,b, D, epsilon, dt ;

layout (location = 0 )  out float outFV ;
layout (location = 1 )  out float outSV ;


/*========================================================================
 * Main body of the shader
 *========================================================================
 */
void main() {
    float V = max(a,b) ;
    vec4 maze = texture(mazeTxt, cc) ;
    if (maze.r<0.5) V = 0. ;
  
    //if (cc.x<0.5) V = 0. ;
    outFV = V ;
    outSV = V ;

    return ;
}
