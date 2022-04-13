#version 300 es
/*@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
 * compShader   :   3-Variable Minimal Model 
 *
 * PROGRAMMER   :   ABOUZAR KABOUDIAN
 * DATE         :   Thu 14 Jun 2018 17:26:46 (EDT)
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

uniform sampler2D   inTrgt ;

uniform vec3        domainResolution ;
uniform vec3        domainSize ;
uniform int         thickness ;
#define fthick      float(thickness)
uniform float       mx , my ;

uniform sampler2D   crdtTxt ;
uniform sampler2D   phaseTxt , nsewAvgTxt , updnAvgTxt ;

uniform float       ds_x, ds_y ;
uniform float       dt ;
uniform float       diffCoef, C_m ;
uniform float       minVlt, maxVlt ;
uniform float       tau_pv, 
                    tau_v1, 
                    tau_v2, 
                    tau_pw, 
                    tau_mw, 
                    tau_d, 
                    tau_0, 
                    tau_r,
                    tau_si,
                    K,
                    V_sic, 
                    V_c,
                    V_v ;

uniform float   C_si ;


/*------------------------------------------------------------------------
 * It turns out for my current graphics card the maximum number of 
 * drawBuffers is limited to 8 
 *------------------------------------------------------------------------
 */
layout (location = 0 )  out vec4 outTrgt ;

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
 * Main body of the shader
 *========================================================================
 */
void main() {
    vec3 cdd = domainResolution/domainSize ;
    cdd  *= cdd ;

/*------------------------------------------------------------------------
 * reading from textures
 *------------------------------------------------------------------------
 */
    vec4    phasVal = texture( phaseTxt, pixPos ) ;
    vec4    trgtVal = texture( inTrgt, pixPos ) ;
    vec4    C = trgtVal ;

    if (phasVal.r < 0.01){
        outTrgt = trgtVal ;
        return ;
    }

/*------------------------------------------------------------------------
 * Extracting values
 *------------------------------------------------------------------------
 */
    float   vlt = C.r ;
    float   fig = C.g ;
    float   sig = C.b ;

/*-------------------------------------------------------------------------
 * Calculating right hand side vars
 *-------------------------------------------------------------------------
 */
    float p = step(V_c, vlt) ;
    float q = step(V_v, vlt) ;

    float tau_mv = (1.0-q)*tau_v1   +  q*tau_v2 ;

    float Ifi  = -fig*p*(vlt - V_c)*(1.0-vlt)/tau_d ;
    float Iso  =  vlt*(1.0  - p )/tau_0 + p/tau_r ;

    float tn = tanh(K*(vlt-V_sic)) ;
    float Isi  = -sig*(1.0  + tn) /(2.0*tau_si) ;
    Isi *= C_si ;
    float dFig2dt  = (1.0-p)*(1.0-fig)/tau_mv - p*fig/tau_pv ;
    float dSig2dt  = (1.0-p)*(1.0-sig)/tau_mw - p*sig/tau_pw ;

    fig += dFig2dt*dt ;
    sig += dSig2dt*dt ;

/*-------------------------------------------------------------------------
 * Laplacian
 *-------------------------------------------------------------------------
 */
    vec3 cc = texture( crdtTxt, pixPos ).xyz ;
    vec3 ii = vec3(1.,0.,0.)/domainResolution ;
    vec3 jj = vec3(0.,1.,0.)/domainResolution ;
    vec3 kk = vec3(0.,0.,1.)/domainResolution ;

    vec4    nsewAvg    = texture( nsewAvgTxt, pixPos ) ;
    vec4    updnAvg    = texture( updnAvgTxt, pixPos ) ;

    float   nGrad = nsewAvg.r*(Texture3D( inTrgt, cc+jj ).r - trgtVal.r) ;
    float   sGrad =-nsewAvg.a*(Texture3D( inTrgt, cc-jj ).r - trgtVal.r) ;
    float   eGrad = nsewAvg.g*(Texture3D( inTrgt, cc+ii ).r - trgtVal.r) ;
    float   wGrad =-nsewAvg.b*(Texture3D( inTrgt, cc-ii ).r - trgtVal.r) ;
    float   uGrad = updnAvg.r*(Texture3D( inTrgt, cc+kk ).r - trgtVal.r) ;
    float   dGrad =-updnAvg.b*(Texture3D( inTrgt, cc-kk ).r - trgtVal.r) ;

    float gamma = 1./3. ;

    float dVlt2dt   = (eGrad - wGrad)*cdd.x 
                    + (nGrad - sGrad)*cdd.y 
                    + (uGrad - dGrad)*cdd.z
                    ;
    dVlt2dt *= diffCoef ;

/*------------------------------------------------------------------------
 * I_sum
 *------------------------------------------------------------------------
 */
    float I_sum = Isi + Ifi + Iso ;

/*------------------------------------------------------------------------
 * Time integration for membrane potential
 *------------------------------------------------------------------------
 */
    dVlt2dt -= I_sum/C_m ;
    vlt += dVlt2dt*dt ;

/*------------------------------------------------------------------------
 * ouputing the shader
 *------------------------------------------------------------------------
 */

    outTrgt = vec4(vlt,fig,sig,0.);

    return ;
}
