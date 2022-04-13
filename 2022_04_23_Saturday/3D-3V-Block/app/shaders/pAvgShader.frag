#version 300 es
/*@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
 * pAvgShader   :   average of phase-field value
 *
 * PROGRAMMER   :   ABOUZAR KABOUDIAN
 * DATE         :   Tue 08 Aug 2017 12:12:30 PM EDT
 * PLACE        :   Chaos Lab @ GaTech, Atlanta, GA
 *@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
 */
precision highp     float;
precision highp     int ;


/*------------------------------------------------------------------------
 * interface variables
 *------------------------------------------------------------------------
 */
in      vec2        pixPos ;

uniform sampler2D   crdtTxt, phaseTxt ;
uniform vec3        domainResolution ;
uniform float       mx , my ;

layout  (location = 0 ) out vec4 nsew ;
layout  (location = 1 ) out vec4 updn ;

/*========================================================================
 * Texture3D
 *========================================================================
 */
vec4 Texture3D( sampler2D S, vec3 texCoord )
{
    vec4    vColor1, vColor2 ;
    float   x, y ;
    float   wd = mx*my - 1.0 ;

    float zSliceNo  = floor( texCoord.z*mx*my) ;

    x = texCoord.x / mx ;
    y = texCoord.y / my ;

    x += (mod(zSliceNo,mx)/mx) ;
    y += floor((wd-zSliceNo)/ mx )/my ;

    vColor1 = texture( S,  vec2(x,y) ) ;

    zSliceNo = ceil( texCoord.z*mx*my) ;

    x = texCoord.x / mx ;
    y = texCoord.y / my ;

    x += (mod(zSliceNo,mx)/mx) ;
    y += floor((wd-zSliceNo)/ mx )/my ;
    vColor2 = texture( S,  vec2(x,y) ) ;

    return mix(
        vColor2,
        vColor1,
        zSliceNo/(mx*my)-texCoord.z
    ) ;
}

/*========================================================================
 * main body of the shader
 *========================================================================
 */
void main(){
    vec3    cc      = texture(crdtTxt, pixPos).xyz ;
    vec3    ii      = vec3(1.,0.,0.)/domainResolution ;
    vec3    jj      = vec3(0.,1.,0.)/domainResolution ;
    vec3    kk      = vec3(0.,0.,1.)/domainResolution ;

    float   c   = texture(phaseTxt, pixPos).r ;     /* center   value   */ 
    float   n   = Texture3D(phaseTxt, cc+jj ).r ;   /* north    value   */
    float   s   = Texture3D(phaseTxt, cc-jj ).r ;   /* south    value   */
    float   e   = Texture3D(phaseTxt, cc+ii ).r ;   /* east     value   */
    float   w   = Texture3D(phaseTxt, cc-ii ).r ;   /* west     value   */
    float   u   = Texture3D(phaseTxt, cc+kk ).r ;   /* up       value   */
    float   d   = Texture3D(phaseTxt, cc-kk ).r ;   /* down     value   */
    
    nsew = 0.5*(vec4(c)+vec4(n,e,w,s)) ;
    updn = 0.5*(vec4(c)+vec4(u,u,d,d)) ;
}
