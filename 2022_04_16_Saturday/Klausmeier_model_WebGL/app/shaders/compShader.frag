#version 300 es
/*@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
 * compShader   :   Beeler-Reuter Compute Shader
 *
 * PROGRAMMER   :   ABOUZAR KABOUDIAN
 * DATE         :   Wed 26 Jul 2017 10:36:21 AM EDT
 * PLACE        :   Chaos Lab @ GaTech, Atlanta, GA
 *@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
 */
precision highp float;
precision highp int ;

/*------------------------------------------------------------------------
 * Interface variables : 
 * varyings change to "in" types in fragment shaders 
 * and "out" in vertexShaders
 *------------------------------------------------------------------------
 */
in vec2 pixPos ;

uniform sampler2D	inWn ;
 
uniform float       ds_x, ds_y ;
uniform float       dt ;
uniform float       minDsy, maxDsy ;
uniform float		a ;
uniform float		v ;
uniform float		m ;
uniform float		D ;

/*------------------------------------------------------------------------
 * It turns out for my current graphics card the maximum number of 
 * drawBuffers is limited to 8 
 *------------------------------------------------------------------------
 */
layout (location = 0 )	out vec4 outWn ;

/*========================================================================
 * Main body of the shader
 *========================================================================
 */
void main() {
    vec2    cc = pixPos ;
//    vec2    size    = vec2(textureSize( inVcxf, 0 ) );
	vec2	size	= vec2(textureSize(	inWn, 0) ) ;
	float	dx		= ds_x/size.x ;
    float   cddx    = size.x/ds_x ;
    float   cddy    = size.y/ds_y ;

    cddx *= cddx ;
    cddy *= cddy ;

/*------------------------------------------------------------------------
 * reading from textures
 *------------------------------------------------------------------------
 */
	vec4	wnVal 	= texture( inWn, cc ) ;
	float	w		= wnVal.r ;
	float	n		= wnVal.g ;

/*------------------------------------------------------------------------
 * dw/dt
 *------------------------------------------------------------------------
 */
	vec2 ii = vec2(1.0,0.0)/size ;
    vec2 jj = vec2(0.0,1.0)/size ;
	
		float dw2dt ;
		if ( v > 0. ){
			dw2dt = v *(texture(inWn,cc+ii).r - w)/dx ;
		}else{
			dw2dt = v *( w-texture(inWn,cc-ii).r)/dx ;
		}
	dw2dt	+= (a - w - w*n*n) ;
        w		+= dw2dt*dt ; 
		
/*------------------------------------------------------------------------
 * Laplacian_n and dn/dt
 *------------------------------------------------------------------------
 */
        float   dn2dt =
    D * (( texture(inWn, cc+ii).g -2.*n + texture(inWn,cc-ii ).g)*cddx 
    +   ( texture(inWn, cc+jj).g -2.*n + texture(inWn,cc-jj ).g)*cddy) ;
 	dn2dt	+=	(w*n*n - m*n) ;
        n		+= dn2dt*dt ;
		
/*------------------------------------------------------------------------
 * ouputing the shader
 *------------------------------------------------------------------------
 */
	outWn = vec4(w,n,0.,0.) ;

    return ;
}
