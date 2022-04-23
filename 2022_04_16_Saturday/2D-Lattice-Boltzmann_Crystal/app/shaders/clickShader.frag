#version 300 es
/*========================================================================
 * clickShader
 *
 * PROGRAMMER   :   ABOUZAR KABOUDIAN
 * DATE         :   Tue 06 Nov 2018 10:18:49 (EST)
 * PLACE        :   Chaos Lab @ GaTech, Atlanta, GA
 *========================================================================
 */
#include precision.glsl

/*------------------------------------------------------------------------
 * Interface variables
 *------------------------------------------------------------------------
 */

in      vec2        pixPos ;
uniform sampler2D   in_fluid ;
uniform vec2        clickPosition ;
uniform vec4        clickValue ;
uniform float       clickRadius ;

/*------------------------------------------------------------------------
 * output colors
 *------------------------------------------------------------------------
 */
layout (location = 0 )  out vec4 out_fluid ;
layout (location = 1 )  out vec4 out_solid ;

/*=========================================================================
 * Main body of Buffer Swap Shader 
 *=========================================================================
 */
void main()
{
    vec4 t = texture(in_fluid,pixPos) ;
    vec2 diffVec = pixPos - clickPosition ;
    if (length(diffVec) < clickRadius ){
        t.r = clickValue.r ;
    }
    out_solid = vec4(1.)-t ;
    out_fluid = t ;
}
