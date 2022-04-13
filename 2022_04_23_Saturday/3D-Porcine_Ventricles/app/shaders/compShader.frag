#version 300 es
/*@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
 * compShader   :   Porcine Minimal Model
 *
 * PROGRAMMER   :   ABOUZAR KABOUDIAN
 * DATE         :   Wed 13 Jun 2018 04:32:09 PM EDT
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

uniform sampler2D   phaseTxt , nsewAvgTxt , updnAvgTxt ;
uniform sampler2D   nhshMapTxt, etwtMapTxt, updnMapTxt ;

uniform float   ds_x, ds_y ;
uniform float   dt ;
uniform float   diffCoef, C_m ;

/*------------------------------------------------------------------------
 * It turns out for my current graphics card the maximum number of 
 * drawBuffers is limited to 8 
 *------------------------------------------------------------------------
 */
layout (location = 0 )  out vec4 outTrgt ;

/*========================================================================
 * Hyperbolic tangent 
 *========================================================================
 */
float Tanh(float x){
    if ( x<-3.0){
        return -1.0 ;
    } else if (x>3.0){
        return 1.0 ;
    } else {
        return x*(27.0 + x*x)/(27.0+9.0*x*x) ;
    }
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
    vec4    inVal   = texture( inTrgt, pixPos ) ;

/*------------------------------------------------------------------------
 * check if we are outside domain
 *------------------------------------------------------------------------
 */
    if (phasVal.r < 0.01){
        outTrgt = inVal ;
        return ;
    }
/*------------------------------------------------------------------------
 * Extracting local variables
 *------------------------------------------------------------------------
 */
    float u = inVal.r ;
    float v = inVal.g ;
    float w = inVal.b ;
 
/*-------------------------------------------------------------------------
 * Calculating right hand side vars
 *-------------------------------------------------------------------------
 */
    float p     =   0. ;
    float q     =   1. ;
    float pp    =   0. ;

    if ( u > 0.25   ) p  = 1.0 ;
    if ( u > 0.0025 ) q  = 0.0 ;
    if ( u > 0.25   ) pp = 1.0 ;

    float trx   =   5.0+30.0*(1.0-tanh(50.0*(u-0.85)))/2.0 ;
    float rrx   =   ( 1.0-tanh(10.0*(u-0.9))  )/2.0 ;
    float rr    =   ( 1.0+tanh(7.*(u-0.35))   )/
                    ((2.0*15.5)*(1.0+exp((u-0.9)*4.5))) ;

    float dv2dt =   (1.0-p)*(1.0-v)/
                    (40.0*q+(1.0-q)*2000.0)
                    -p*v/10.0 ;
    float dw2dt =   (1.0-p)*(1.0-w*w*w*w)/305.0
                    -p*w/320.0 ;

/*------------------------------------------------------------------------
 * Calculating currents
 *------------------------------------------------------------------------
 */
    float Ifi   =   -v*p*(u-0.1)*(0.97-u)/0.175 ;
    float Iso   =   (u-0.0)*(1.0-pp)*(1.0-v)/4.5 + p/trx ;
    float Isi   =   -w*rrx*rr;
    if ( u < 0.05 ) Isi = 0.0 ;

    float I_sum = (Ifi+Iso+Isi) ;

/*-------------------------------------------------------------------------
 * Laplacian
 *-------------------------------------------------------------------------
 */
    vec4 nhshMap = texture(nhshMapTxt, pixPos ) ;
    vec4 etwtMap = texture(etwtMapTxt, pixPos ) ;
    vec4 updnMap = texture(updnMapTxt, pixPos ) ;

    vec4    nsewAvg    = texture( nsewAvgTxt, pixPos ) ;
    vec4    updnAvg    = texture( updnAvgTxt, pixPos ) ;

    float   nGrad = nsewAvg.r*(texture(inTrgt,nhshMap.xy).r - inVal.r) ;
    float   sGrad =-nsewAvg.a*(texture(inTrgt,nhshMap.zw).r - inVal.r) ;
    float   eGrad = nsewAvg.g*(texture(inTrgt,etwtMap.xy).r - inVal.r) ;
    float   wGrad =-nsewAvg.b*(texture(inTrgt,etwtMap.zw).r - inVal.r) ;
    float   uGrad = updnAvg.r*(texture(inTrgt,updnMap.xy).r - inVal.r) ;
    float   dGrad =-updnAvg.b*(texture(inTrgt,updnMap.zw).r - inVal.r) ;

    float du2dt   = (eGrad - wGrad)*cdd.x 
                    + (nGrad - sGrad)*cdd.y 
                    + (uGrad - dGrad)*cdd.z
                    ;
    du2dt *= diffCoef ;

/*------------------------------------------------------------------------
 * Time integration
 *------------------------------------------------------------------------
 */
    du2dt  -= I_sum/C_m ;
    
    u += du2dt*dt ;
    v += dv2dt*dt ;
    w += dw2dt*dt ;

/*------------------------------------------------------------------------
 * ouputing the shader
 *------------------------------------------------------------------------
 */

    outTrgt = vec4(u,v,w,0.0);

    return ;
}
