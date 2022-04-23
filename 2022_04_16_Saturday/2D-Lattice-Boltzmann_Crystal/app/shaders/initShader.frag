#version 300 es
/*@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
 * initShader   :   Initialize LBM Method 
 *
 * PROGRAMMER   :   ABOUZAR KABOUDIAN
 * DATE         :   Wed 24 Oct 2018 18:11:01 (EDT)
 * PLACE        :   Chaos Lab @ GaTech, Atlanta, GA
 *@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
 */
precision highp float;
precision highp int;

/*------------------------------------------------------------------------
 * Interface variables : 
 *------------------------------------------------------------------------
 */
in vec2 pixPos ;

uniform float           C0 ;
uniform float           b0 ;
uniform float           u0 ;
uniform int             obstacle ;

/*------------------------------------------------------------------------
 * It turns out for my current graphics card the maximum number of 
 *------------------------------------------------------------------------
 */
layout (location = 0 )  out vec4 out_n_s_e_w ;
layout (location = 1 )  out vec4 out_ne_se_nw_sw  ;
layout (location = 2 )  out vec4 out_n0_rho_ux_uy  ;
layout (location = 3 )  out vec4 out_fluid_curl  ;
layout (location = 4 )  out vec4 out_g_n_s_e_w ;
layout (location = 5 )  out vec4 out_g_ne_se_nw_sw ;
layout (location = 6 )  out vec4 out_g0_c_b_b0 ;

/*========================================================================
 * Main body of the shader
 *========================================================================
 */
void main() {
    float   nN  ; 
    float   nS  ; 
    float   nE  ; 
    float   nW  ; 
    float   nNE ; 
    float   nSE ; 
    float   nNW ; 
    float   nSW ; 
    float   n0  ; 
    float   rho ; 
    float   ux  ; 
    float   uy  ; 
    
    float   gN  ; 
    float   gS  ; 
    float   gE  ; 
    float   gW  ; 
    float   gNE ; 
    float   gSE ; 
    float   gNW ; 
    float   gSW ; 
    float   g0  ; 
    float   sb0 ;
    float   sb ;
    float   cs ;

    float   newux   = u0 ;
    float   newuy   = 0. ;
    float   newrho  = 1. ;
    float   ux3 = 3. * newux;
    float   uy3 = 3. * newuy;
    float   ux2 = newux * newux;
    float   uy2 = newuy * newuy;
    float   uxuy2 = 2. * newux * newuy;
    float   u2 = ux2 + uy2;
    float   u215 = 1.5 * u2;
    
    float four9ths  = 4./9. ;
    float one9th    = 1./9. ;
    float one36th   = 1./36. ;
    n0  = four9ths * newrho * (1.                              - u215);
    nE  = one9th   * newrho * (1. + ux3       + 4.5*ux2        - u215);
    nW  = one9th   * newrho * (1. - ux3       + 4.5*ux2        - u215);
    nN  = one9th   * newrho * (1. + uy3       + 4.5*uy2        - u215);
    nS  = one9th   * newrho * (1. - uy3       + 4.5*uy2        - u215);
    nNE = one36th  * newrho * (1. + ux3 + uy3 + 4.5*(u2+uxuy2) - u215);
    nSE = one36th  * newrho * (1. + ux3 - uy3 + 4.5*(u2-uxuy2) - u215);
    nNW = one36th  * newrho * (1. - ux3 + uy3 + 4.5*(u2-uxuy2) - u215);
    nSW = one36th  * newrho * (1. - ux3 - uy3 + 4.5*(u2+uxuy2) - u215);
    rho = newrho;
    ux  = newux;
    uy  = newuy;

    out_n_s_e_w     = vec4(nN,nS,nE,nW) ;
    out_ne_se_nw_sw = vec4( nNE,    nSE,    nNW,    nSW ) ;
    out_n0_rho_ux_uy= vec4( n0,     rho,    ux,     uy  ) ;
    out_fluid_curl  = vec4(1.,0.,0.,0.) ;

    if ( length(pixPos - vec2(0.5))<0.002){
        out_fluid_curl.r = 0. ;
      //  if ( pixPos.y <0.5 ){
      //      if(obstacle == 1)
      //          out_fluid_curl.r = 0. ;
      //  }else{
      //      if(obstacle == 0){
      //          out_fluid_curl.r = 0. ;
      //      }
      //  }
    }

    /* initiating concentrations */
    float   sc = C0 ;
    g0  = four9ths* sc* (1. - u215) ;
    gE  = one9th*   sc* (1.+ux3+     4.5*ux2         - u215) ;

    gW  = one9th*   sc* (1.-ux3+     4.5*ux2         - u215) ;
    gN  = one9th*   sc* (1.+uy3+     4.5*uy2         - u215) ;
    gS  = one9th *  sc* (1.-uy3+     4.5*uy2         - u215) ;

    gNE = one36th*  sc* (1.+ux3+uy3+ 4.5*(u2+uxuy2)  - u215) ;
    gSE = one36th*  sc* (1.+ux3-uy3+ 4.5*(u2-uxuy2)  - u215) ;
    gNW = one36th*  sc* (1.-ux3+uy3+ 4.5*(u2-uxuy2)  - u215) ;
    gSW = one36th*  sc* (1.-ux3-uy3+ 4.5*(u2+uxuy2)  - u215) ;
    sb0 = b0 ;
    sb  = b0 ;
    
    out_g_n_s_e_w       = vec4( gN,     gS,     gE,     gW  ) ;
    out_g_ne_se_nw_sw   = vec4( gNE,    gSE,    gNW,    gSW ) ;
    out_g0_c_b_b0       = vec4( g0,     sc,     sb,     sb0 ) ;

    return ;
}
