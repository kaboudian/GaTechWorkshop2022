#version 300 es
/*@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
 * collideShader:   Calculate collisions in the LBM method
 *
 * PROGRAMMER   :   ABOUZAR KABOUDIAN
 * DATE         :   Mon 29 Oct 2018 19:24:48 (EDT) 
 * PLACE        :   Chaos Lab @ GaTech, Atlanta, GA
 *@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
 */
precision highp float;

/*------------------------------------------------------------------------
 * Interface variables : 
 *------------------------------------------------------------------------
 */
in vec2 pixPos ;

uniform sampler2D       in_n_s_e_w ;
uniform sampler2D       in_ne_se_nw_sw;
uniform sampler2D       in_n0_rho_ux_uy ;
uniform sampler2D       in_fluid_curl ;

uniform sampler2D       in_g_n_s_e_w ;
uniform sampler2D       in_g_ne_se_nw_sw;
uniform sampler2D       in_g0_c_b_b0 ;

uniform float           viscosity ;
uniform float           diffusivity ;
uniform float           Cs ;

/*------------------------------------------------------------------------
 * It turns out for my current graphics card the maximum number of 
 *------------------------------------------------------------------------
 */
layout (location = 0 ) out vec4 out_n_s_e_w ;
layout (location = 1 ) out vec4 out_ne_se_nw_sw  ;
layout (location = 2 ) out vec4 out_n0_rho_ux_uy ;

layout (location = 3 ) out vec4 out_g_n_s_e_w ;
layout (location = 4 ) out vec4 out_g_ne_se_nw_sw ;
layout (location = 5 ) out vec4 out_g0_c_b_b0 ;

/*========================================================================
 * main body of the shader
 *========================================================================
 */
void main(){
    /* read Domain Resolution */
    vec2    size = vec2(textureSize( in_n_s_e_w, 0 ) ); 
    vec2    cc = pixPos ;

    /* unit vectors in x and y directions */ 
    vec2    ii = vec2(1.,0.)/size ;
    vec2    jj = vec2(0.,1.)/size ;

    /* extracting colors of each node */
    vec4    n_s_e_w     = texture( in_n_s_e_w,      cc ) ;
    vec4    ne_se_nw_sw = texture( in_ne_se_nw_sw,  cc ) ;
    vec4    n0_rho_ux_uy= texture( in_n0_rho_ux_uy, cc ) ;
    vec4    fluid_curl  = texture( in_fluid_curl,   cc ) ;

    vec4    g_n_s_e_w       = texture( in_g_n_s_e_w,    cc ) ;
    vec4    g_ne_se_nw_sw   = texture( in_g_ne_se_nw_sw,cc ) ;
    vec4    g0_c_b_b0       = texture( in_g0_c_b_b0,    cc ) ;
    

    out_n_s_e_w         = n_s_e_w ;
    out_ne_se_nw_sw     = ne_se_nw_sw ;
    out_n0_rho_ux_uy    = n0_rho_ux_uy ;
    out_g_n_s_e_w       = g_n_s_e_w ;
    out_g_ne_se_nw_sw   = g_ne_se_nw_sw ;
    out_g0_c_b_b0       = g0_c_b_b0 ;

    if ( fluid_curl.r < 0.5 ){
        return ;
    }

/*------------------------------------------------------------------------
 * localizing variables
 *------------------------------------------------------------------------
 */
    /* flow variables   */
    float   nN  = n_s_e_w.r ;
    float   nS  = n_s_e_w.g ;
    float   nE  = n_s_e_w.b ;
    float   nW  = n_s_e_w.a ;
    float   nNE = ne_se_nw_sw.r ;
    float   nSE = ne_se_nw_sw.g ;
    float   nNW = ne_se_nw_sw.b ;
    float   nSW = ne_se_nw_sw.a ;
    float   n0  = n0_rho_ux_uy.r ;
    float   rho = n0_rho_ux_uy.g ;
    float   ux  = n0_rho_ux_uy.b ;
    float   uy  = n0_rho_ux_uy.a ;

    /* salute variables */
    float   gN  = g_n_s_e_w.r ;
    float   gS  = g_n_s_e_w.g ;
    float   gE  = g_n_s_e_w.b ;
    float   gW  = g_n_s_e_w.a ;
    float   gNE = g_ne_se_nw_sw.r ;
    float   gSE = g_ne_se_nw_sw.g ;
    float   gNW = g_ne_se_nw_sw.b ;
    float   gSW = g_ne_se_nw_sw.a ;
    float   g0  = g0_c_b_b0.r ;
    float   sc  = g0_c_b_b0.g ;
    float   sb  = g0_c_b_b0.b ;
    float   sb0 = g0_c_b_b0.a ;

    /* reciprocal of relaxation time */
    float   omegaf = 1./(3.*viscosity + 0.5 ) ;     
    float   omegag = 1./(3.*diffusivity + 0.5 ) ;     

/*------------------------------------------------------------------------
 * calculate the collisions within the boundaries
 *------------------------------------------------------------------------
 */
    if (    cc.x > ii.x     && 
            cc.x <(1.-ii.x) &&
            cc.y > jj.y     && 
            cc.y <(1.-jj.y) ){

        rho = n0 + nN + nS + nE + nW + nNW + nNE + nSW + nSE ;
        sc  = g0 + gN + gS + gE + gW + gNW + gNE + gSW + gSE ;

        ux = (nE + nNE + nSE - nW - nNW - nSW) / rho;
        uy = (nN + nNE + nNW - nS - nSE - nSW) / rho;

        float one9thrho = rho/9. ;
        float one9thc   = sc/9. ;
        float four9thrho= rho*4./9. ;
        float four9thc  = sc*4./9. ;
        float one36thrho= rho/36. ;
        float one36thc  = sc/36. ;

        float   ux3 = 3. * ux;
        float   uy3 = 3. * uy;
        float   ux2 = ux * ux;
        float   uy2 = uy * uy;
        float   uxuy2 = 2. * ux * uy;
        float   u2 = ux2 + uy2;
        float   u215 = 1.5 * u2;

        /* flow field update    */
            n0  += 
        omegaf*(four9thrho* (1.                          - u215)-n0  );

            nE  += 
        omegaf*(one9thrho * (1.+ux3+     4.5*ux2         - u215)-nE  );

            nW  += 
        omegaf*(one9thrho * (1.-ux3+     4.5*ux2         - u215)-nW  );

            nN  += 
        omegaf*(one9thrho * (1.+uy3+     4.5*uy2         - u215)-nN  );

            nS  += 
        omegaf*(one9thrho * (1.-uy3+     4.5*uy2         - u215)-nS  );

            nNE += 
        omegaf*(one36thrho* (1.+ux3+uy3+ 4.5*(u2+uxuy2)  - u215)-nNE );

            nSE += 
        omegaf*(one36thrho* (1.+ux3-uy3+ 4.5*(u2-uxuy2)  - u215)-nSE );

            nNW += 
        omegaf*(one36thrho* (1.-ux3+uy3+ 4.5*(u2-uxuy2)  - u215)-nNW );

            nSW += 
        omegaf*(one36thrho* (1.-ux3-uy3+ 4.5*(u2+uxuy2)  - u215)-nSW );

        /* concentration update */
            g0  += 
        omegag*(four9thc  * (1.                          - u215)-g0  );

            gE  += 
        omegag*(one9thc   * (1.+ux3+     4.5*ux2         - u215)-gE  );

            gW  += 
        omegag*(one9thc   * (1.-ux3+     4.5*ux2         - u215)-gW  );

            gN  += 
        omegag*(one9thc   * (1.+uy3+     4.5*uy2         - u215)-gN  );

            gS  += 
        omegag*(one9thc   * (1.-uy3+     4.5*uy2         - u215)-gS  );

            gNE += 
        omegag*(one36thc  * (1.+ux3+uy3+ 4.5*(u2+uxuy2)  - u215)-gNE );

            gSE += 
        omegag*(one36thc  * (1.+ux3-uy3+ 4.5*(u2-uxuy2)  - u215)-gSE );

            gNW += 
        omegag*(one36thc  * (1.-ux3+uy3+ 4.5*(u2-uxuy2)  - u215)-gNW );

            gSW += 
        omegag*(one36thc  * (1.-ux3-uy3+ 4.5*(u2+uxuy2)  - u215)-gSW );
    }

/*------------------------------------------------------------------------
 * at right end, copy left-flowing densities from next row to the left
 *------------------------------------------------------------------------
 */
    if ( cc.y> ii.y && cc.y < (1.-2.*ii.y) && cc.x > (1.-ii.x)){
        nW  = texture( in_n_s_e_w ,         cc - ii ).a ;
        nNW = texture( in_ne_se_nw_sw,      cc - ii ).b ; 
        nSW = texture( in_ne_se_nw_sw,      cc - ii ).a ;

        gW  = texture( in_g_n_s_e_w ,       cc - ii ).a ;
        gNW = texture( in_g_ne_se_nw_sw,    cc - ii ).b ; 
        gSW = texture( in_g_ne_se_nw_sw,    cc - ii ).a ;
    }
    
/*------------------------------------------------------------------------
 * update outputs
 *------------------------------------------------------------------------
 */
    out_n_s_e_w     = vec4( nN,     nS,     nE,     nW  ) ;
    out_ne_se_nw_sw = vec4( nNE,    nSE,    nNW,    nSW ) ;
    out_n0_rho_ux_uy= vec4( n0,     rho,    ux,     uy  ) ;

    out_g_n_s_e_w   = vec4( gN,     gS,     gE,     gW  ) ;
    out_g_ne_se_nw_sw=vec4( gNE,    gSE,    gNW,    gSW ) ;
    out_g0_c_b_b0   = vec4( g0,     sc,     sb,     sb0 ) ;

    return ;
}
