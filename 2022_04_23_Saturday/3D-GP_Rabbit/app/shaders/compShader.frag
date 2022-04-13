#version 300 es
/*@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
 * compShader   :   3D Gray Pathnamathan Rabbit Model 
 *
 * PROGRAMMER   :   ABOUZAR KABOUDIAN
 * DATE         :   Tue 12 Jun 2018 06:34:26 PM EDT 
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

uniform float   gNa ;
uniform float   Em  ;
uniform float   km  ;
uniform float   tm  ;
uniform float   Eh  ;
uniform float   kh  ;
uniform float   t0h ;
uniform float   dh  ;
uniform float   gK  ;
uniform float   b   ;
uniform float   ENa ;
uniform float   EK  ;


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
    vec4    C   = inVal ;

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
    float   u = C.r ;
    float   m = C.g ;
    float   h = C.b ;

/*------------------------------------------------------------------------
 * updating m
 *------------------------------------------------------------------------
 */
    float   m_inf   = 1./(1.+exp((u-Em)/km)) ;
    float   tau_m     = tm ;
    m = m_inf - ( m_inf - m)*exp(-dt/tau_m) ;

/*------------------------------------------------------------------------
 * updating h
 *------------------------------------------------------------------------
 */
    float   h_inf = 1./(1.+exp((u-Eh)/kh)) ;
    float   tau_h = 2.*t0h*exp(dh*(u-Eh)/kh)/(1.+exp((u-Eh)/kh)) ;
    h = h_inf - ( h_inf - h ) * exp( -dt/tau_h ) ;

/*-------------------------------------------------------------------------
 * Iionic Currents 
 *-------------------------------------------------------------------------
 */
    float   I_Na    = gNa*m*m*m*h*(u-ENa) ;
    float   I_K     = gK*exp(-b*(u-EK))*(u-EK) ;
    
    float   I_sum   = I_Na + I_K ;

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
 * Time integration for membrane potential
 *------------------------------------------------------------------------
 */
    du2dt  -= I_sum/C_m ;
    u += du2dt*dt ;

/*------------------------------------------------------------------------
 * ouputing the shader
 *------------------------------------------------------------------------
 */

    outTrgt = vec4(u,m,h,1.0);

    return ;
}
