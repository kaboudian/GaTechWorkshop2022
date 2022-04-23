#version 300 es
/*@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
 * streamShader :   
 *
 * PROGRAMMER   :   ABOUZAR KABOUDIAN
 * DATE         :   Wed 24 Oct 2018 21:15:57 (-0400)
 * PLACE        :   Chaos Lab @ GaTech, Atlanta, GA
 *@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
 */
precision highp float;
precision highp int ;

/*------------------------------------------------------------------------
 * Interface variables
 *------------------------------------------------------------------------
 */
in vec2 pixPos ;

uniform sampler2D       in_n_s_e_w ;
uniform sampler2D       in_ne_se_nw_sw ;
uniform sampler2D       in_n0_rho_ux_uy ;

uniform sampler2D       in_g_n_s_e_w ;
uniform sampler2D       in_g_ne_se_nw_sw;
uniform sampler2D       in_g0_c_b_b0 ;

uniform sampler2D       in_fluid_curl ;

uniform float           viscosity ;
uniform float           diffusivity ;
uniform float           Cs ;
uniform float           C0 ;
uniform float           b0 ;

uniform float           u0 ;
uniform float           kr ;

/*------------------------------------------------------------------------
 * output layers
 *------------------------------------------------------------------------
 */
layout (location = 0 ) out vec4 out_n_s_e_w ;
layout (location = 1 ) out vec4 out_ne_se_nw_sw  ;
layout (location = 2 ) out vec4 out_n0_rho_ux_uy ;

layout (location = 3 ) out vec4 out_g_n_s_e_w ;
layout (location = 4 ) out vec4 out_g_ne_se_nw_sw ;
layout (location = 5 ) out vec4 out_g0_c_b_b0 ;
layout (location = 6 ) out vec4 out_m ;

#define     isFluid(pos)    texture(in_fluid_curl, pos).r>0.5

/*========================================================================
 * global variables
 *========================================================================
 */
vec2    ii , jj, cc ;

/*========================================================================
 * hasSolidNeighbor 
 *========================================================================
 */
bool hasSolidNeighbor(vec2 pos){

    for(int i=-1; i<2 ;i++){
        for(int j=-1; j<2; j++){
            if ( texture( in_fluid_curl, 
                        pos + float(i)*ii + float(j)*jj).r < 0.5)
                return true ;
        }
    }
    return false ;
}


/*========================================================================
 * main body of the shader
 *========================================================================
 */
void main(){
    /* read Domain Resolution */
    vec2    size = vec2(textureSize( in_n_s_e_w, 0 ) ); 
    cc = pixPos ;

    /* unit vectors in x and y directions */ 
    ii = vec2(1.,0.)/size ;
    jj = vec2(0.,1.)/size ;

    /* extracting colors of each node */
    vec4    n_s_e_w     = texture( in_n_s_e_w,      cc ) ;
    vec4    ne_se_nw_sw = texture( in_ne_se_nw_sw,  cc ) ;
    vec4    n0_rho_ux_uy= texture( in_n0_rho_ux_uy, cc ) ;

    vec4    g_n_s_e_w       = texture( in_g_n_s_e_w,    cc ) ;
    vec4    g_ne_se_nw_sw   = texture( in_g_ne_se_nw_sw,cc ) ;
    vec4    g0_c_b_b0       = texture( in_g0_c_b_b0,    cc ) ;

/*------------------------------------------------------------------------
 * localizing variables
 *------------------------------------------------------------------------
 */
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

    /* reciprocal of relaxation time */
    float   omega = 1./(3.*viscosity + 0.5 ) ;    

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

/*------------------------------------------------------------------------
 * update streams
 *------------------------------------------------------------------------
 */
    if (    cc.x > ii.x         && 
            cc.x < (1.-ii.x)    &&
            cc.y > jj.y         && 
            cc.y < (1.-jj.y)        ){

        /* flow in the appropriate direction if the neighbor is fluid 
           otherwise bounce back off of the obstackle                    */
        nN  = (isFluid( cc-jj )) ? 
            texture(in_n_s_e_w , cc - jj    ).r :  /* neighbor is fluid  */
            texture(in_n_s_e_w , cc         ).g ;  /* bounce off barrier */

        nS  = (isFluid( cc+jj)) ?
            texture(in_n_s_e_w , cc + jj    ).g : 
            texture(in_n_s_e_w , cc         ).r ; 

        nE  = (isFluid(cc-ii)) ?
            texture(in_n_s_e_w , cc - ii    ).b : 
            texture(in_n_s_e_w , cc         ).a ;
        
        nW  = (isFluid(cc+ii)) ?
            texture(in_n_s_e_w , cc + ii    ).a : 
            texture(in_n_s_e_w , cc         ).b ;

        nNE = ( isFluid( cc - ii - jj ) ) ? 
            texture(in_ne_se_nw_sw ,  cc - ii - jj      ).r :
            texture(in_ne_se_nw_sw ,  cc                ).a ;

        nSE = ( isFluid( cc - ii + jj ) ) ?
            texture(in_ne_se_nw_sw ,  cc - ii + jj      ).g :
            texture(in_ne_se_nw_sw ,  cc                ).b ;
            
        nNW = (isFluid( cc + ii - jj ) ) ?
            texture(in_ne_se_nw_sw ,  cc + ii - jj      ).b :
            texture(in_ne_se_nw_sw ,  cc                ).g ;

        nSW = (isFluid( cc + ii + jj ) ) ? 
            texture(in_ne_se_nw_sw ,  cc + ii + jj      ).a :
            texture(in_ne_se_nw_sw ,  cc                ).r ;
  
/*------------------------------------------------------------------------
 * applying boundary conditions
 *------------------------------------------------------------------------
 */ 
    }else if ( cc.x < ii.x  ){ // Inlet B.C.
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
    }else if ( cc.x > (1.-ii.x) ){ // Outlet B.C.
        n_s_e_w     = texture( in_n_s_e_w,      cc - ii ) ;
        ne_se_nw_sw = texture( in_ne_se_nw_sw,  cc - ii ) ;
        n0_rho_ux_uy= texture( in_n0_rho_ux_uy, cc - ii ) ;

        nN  = n_s_e_w.r ;
        nS  = n_s_e_w.g ;
        nE  = n_s_e_w.b ;
        nW  = n_s_e_w.a ;
        nNE = ne_se_nw_sw.r ;
        nSE = ne_se_nw_sw.g ;
        nNW = ne_se_nw_sw.b ;
        nSW = ne_se_nw_sw.a ;
        n0  = n0_rho_ux_uy.r ;
        rho = n0_rho_ux_uy.g ;
        ux  = n0_rho_ux_uy.b ;
        uy  = n0_rho_ux_uy.a ;
    }else if( cc.y <  jj.y ){    //  Bottom Boundary
        n_s_e_w     = texture(in_n_s_e_w , cc ) ;
        ne_se_nw_sw = texture( in_ne_se_nw_sw , cc )  ;

        /* Specular Bounce Back */
        nN  = n_s_e_w.g ; 
        nNE = ne_se_nw_sw.g ;
        nNW = ne_se_nw_sw.a ; 

        /* Regular stream function */
        nS  = (isFluid( cc+jj)) ?
            texture(in_n_s_e_w , cc + jj    ).g : 
            texture(in_n_s_e_w , cc         ).r ; 

        nE  = (isFluid(cc-ii)) ?
            texture(in_n_s_e_w , cc - ii    ).b : 
            texture(in_n_s_e_w , cc         ).a ;
        
        nW  = (isFluid(cc+ii)) ?
            texture(in_n_s_e_w , cc + ii    ).a : 
            texture(in_n_s_e_w , cc         ).b ;
        
        nSE = ( isFluid( cc - ii + jj ) ) ?
            texture(in_ne_se_nw_sw ,  cc - ii + jj      ).g :
            texture(in_ne_se_nw_sw ,  cc                ).b ;
            
        
        nSW = (isFluid( cc + ii + jj ) ) ? 
            texture(in_ne_se_nw_sw ,  cc + ii + jj      ).a :
            texture(in_ne_se_nw_sw ,  cc                ).r ;
    }else if ( cc.y > (1.-jj.y)){ // Top Boundary
        
        /* Specular bounce back */
        nS  = texture(in_n_s_e_w ,      cc  ).r ; 
        nSE = texture(in_ne_se_nw_sw ,  cc  ).r ;
        nSW = texture(in_ne_se_nw_sw ,  cc  ).b ;

        nN  = (isFluid( cc-jj )) ? 
            texture(in_n_s_e_w , cc - jj    ).r :  
            texture(in_n_s_e_w , cc         ).g ;  

        nE  = (isFluid(cc-ii)) ?
            texture(in_n_s_e_w , cc - ii    ).b : 
            texture(in_n_s_e_w , cc         ).a ;
        
        nW  = (isFluid(cc+ii)) ?
            texture(in_n_s_e_w , cc + ii    ).a : 
            texture(in_n_s_e_w , cc         ).b ;

        
        nNE = ( isFluid( cc - ii - jj ) ) ? 
            texture(in_ne_se_nw_sw ,  cc - ii - jj      ).r :
            texture(in_ne_se_nw_sw ,  cc                ).a ;

                    
        nNW = (isFluid( cc + ii - jj ) ) ?
            texture(in_ne_se_nw_sw ,  cc + ii - jj      ).b :
            texture(in_ne_se_nw_sw ,  cc                ).g ;
    }
    rho = n0 + nN + nS + nE + nW + nNW + nNE + nSW + nSE ;
    ux = (nE + nNE + nSE - nW - nNW - nSW) / rho;
    uy = (nN + nNE + nNW - nS - nSE - nSW) / rho;
 
/*------------------------------------------------------------------------
 * update outputs
 *------------------------------------------------------------------------
 */
    out_n_s_e_w     = vec4( nN,     nS,     nE,     nW  ) ;
    out_ne_se_nw_sw = vec4( nNE,    nSE,    nNW,    nSW ) ;
    out_n0_rho_ux_uy= vec4( n0,     rho,    ux,     uy  ) ;


/*------------------------------------------------------------------------
 * updating concentrations
 *------------------------------------------------------------------------
 */
    float   beta= kr/(8.*diffusivity) ;
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
    nN  = n_s_e_w.r ;
    nS  = n_s_e_w.g ;
    nE  = n_s_e_w.b ;
    nW  = n_s_e_w.a ;
    nNE = ne_se_nw_sw.r ;
    nSE = ne_se_nw_sw.g ;
    nNW = ne_se_nw_sw.b ;
    nSW = ne_se_nw_sw.a ;
    n0  = n0_rho_ux_uy.r ;
    rho = n0_rho_ux_uy.g ;
    ux  = n0_rho_ux_uy.b ;
    uy  = n0_rho_ux_uy.a ;
    rho = n0 + nN + nS + nE + nW + nNW + nNE + nSW + nSE ;
    ux = (nE + nNE + nSE - nW - nNW - nSW) / rho;
    uy = (nN + nNE + nNW - nS - nSE - nSW) / rho;
 

    ux3 = 3. * ux;
    uy3 = 3. * uy;
    ux2 = ux * ux;
    uy2 = uy * uy;
    uxuy2 = 2. * ux * uy;
    u2 = ux2 + uy2;
    u215 = 1.5 * u2;

    sc  = g0 + gN + gS + gE + gW + gNW + gNE + gSW + gSE ;
    
    out_g_n_s_e_w       = g_n_s_e_w ;
    out_g_ne_se_nw_sw   = g_ne_se_nw_sw ;
    out_g0_c_b_b0       = g0_c_b_b0 ;
 
    if (    cc.x > ii.x         && 
            cc.x < (1.-ii.x)    &&
            cc.y > jj.y         && 
            cc.y < (1.-jj.y)        ) {

        /* Cardinal Terms */
        if ( isFluid( cc - jj ) ){
            gN = texture( in_g_n_s_e_w , cc - jj ).r ;
            out_g_n_s_e_w.r = gN ;
        }else if ( isFluid(cc+jj)){
            gS = texture( in_g_n_s_e_w , cc + jj ).g ;
            sc = (gS + beta*Cs )/(one9th + beta) ;

            float geqN = one9th*sc*(1.+uy3+ 4.5*uy2 - u215) ;
            float geqS = one9th*sc*(1.-uy3+ 4.5*uy2 - u215) ;

            gN = geqN + geqS - gS ;

            out_g_n_s_e_w.r = gN ;
        }

        if ( isFluid(cc + jj ) ) {
            gS = texture( in_g_n_s_e_w , cc + jj ).g ;
            out_g_n_s_e_w.g = gS ;
        }else if ( isFluid(cc-jj)){
            gN =  texture( in_g_n_s_e_w , cc - jj ).r ;
            sc = (gN + beta*Cs )/(one9th + beta) ;

            float geqN = one9th*sc*(1.+uy3+ 4.5*uy2 - u215) ;
            float geqS = one9th*sc*(1.-uy3+ 4.5*uy2 - u215) ;

            gS = geqN + geqS - gN ;
            
            out_g_n_s_e_w.g = gS ;
        }
    
        if ( isFluid( cc - ii ) ) {
            gE = texture( in_g_n_s_e_w , cc - ii ).b ;
            out_g_n_s_e_w.b = gE ;
        }else if ( isFluid(cc+ii)){
            gW = texture( in_g_n_s_e_w , cc + ii ).a ;
            sc = (gW + beta*Cs )/(one9th + beta) ;

            float geqE = one9th*sc*(1.+ux3+     4.5*ux2         - u215) ;
            float geqW = one9th*sc*(1.-ux3+     4.5*ux2         - u215) ;
            gE = geqE + geqW - gW ;

            out_g_n_s_e_w.b = gE ;
        }

        if ( isFluid( cc + ii ) ) {
            gW = texture( in_g_n_s_e_w , cc + ii ).a ;
            out_g_n_s_e_w.a = gW ;
        }else if (isFluid(cc-ii)){
            gE = texture( in_g_n_s_e_w , cc - ii ).b ;
            sc = (gE + beta*Cs )/(one9th + beta) ;

            float geqE = one9th*sc*(1.+ux3+     4.5*ux2         - u215) ;
            float geqW = one9th*sc*(1.-ux3+     4.5*ux2         - u215) ;
            gW = geqE + geqW - gE ;

            out_g_n_s_e_w.a = gW ;
        }

        //        /* Diagonal terms */
        if ( isFluid( cc - ii + jj )){
            gSE = texture(in_g_ne_se_nw_sw ,  cc - ii + jj      ).g ;
            out_g_ne_se_nw_sw.g = gSE ;
        }else{
            bool c1 = isFluid( cc-jj ) ;
            bool c2 = isFluid( cc+ii ) ;
            if( c1 ) {
                /* Assuming cc+jj is not fluid */
                gN =  texture( in_g_n_s_e_w , cc - jj ).r ;
                sc = (gN + beta*Cs )/(one9th + beta) ;
            }else if(c2)  { 
                /* Assuming cc-ii is not fluid */
                gW = texture( in_g_n_s_e_w , cc + ii ).a ;
                sc = (gW + beta*Cs )/(one9th + beta) ;
            }
            if ( c1 || c2 ){
            gNW = texture(in_g_ne_se_nw_sw ,  cc + ii - jj      ).b ;
            float geqNW =one36th*sc*(1.-ux3+uy3+ 4.5*(u2-uxuy2)  - u215) ;
            float geqSE =one36th*sc*(1.+ux3-uy3+ 4.5*(u2-uxuy2)  - u215) ;

            gSE =  geqSE + geqNW - gNW ;
            out_g_ne_se_nw_sw.g = gSE ;
            }
        }

        if ( isFluid( cc + ii + jj ) ){
            gSW = texture(in_g_ne_se_nw_sw ,  cc + ii + jj      ).a ;
            out_g_ne_se_nw_sw.a = gSW ;
        }else{
            bool c1 = isFluid(cc-jj) ;
            bool c2 = isFluid(cc-ii) ;
            if( c1){
                /* cc+jj is not fluid */ 
                gN =  texture( in_g_n_s_e_w , cc - jj ).r ;
                sc = (gN + beta*Cs )/(one9th + beta) ;
            }else if ( c2 ){
                /* cc+ii is not fluid */
                gE = texture( in_g_n_s_e_w , cc - ii ).b ;
                sc = (gE + beta*Cs )/(one9th + beta) ;
            }
            if( c1 || c2 ){
            gNE = texture(in_g_ne_se_nw_sw ,  cc - ii - jj      ).r ;
            float geqNE = one36th*sc*(1.+ux3+uy3+ 4.5*(u2+uxuy2)  - u215) ;
            float geqSW = one36th*sc*(1.-ux3-uy3+ 4.5*(u2+uxuy2)  - u215) ;
            gSW = geqNE + geqSW - gNE ;
            out_g_ne_se_nw_sw.a = gSW ;
            }
        }

        if ( isFluid( cc - ii - jj ) ){
            gNE = texture(in_g_ne_se_nw_sw ,  cc - ii - jj      ).r ;
            out_g_ne_se_nw_sw.r = gNE ;
        }else{
            bool c1 = isFluid( cc + jj ) ;
            bool c2 = isFluid( cc + ii ) ;
            if( c1 ){
                /* cc-jj is not fluid */
                gS = texture( in_g_n_s_e_w , cc + jj ).g ;
                sc = (gS + beta*Cs )/(one9th + beta) ;

            }else if(c2){
                /* cc-ii is not fluid */
                gW = texture( in_g_n_s_e_w , cc + ii ).a ;
                sc = (gW + beta*Cs )/(one9th + beta) ;
            }
            if ( c1 || c2 ){
            gSW = texture(in_g_ne_se_nw_sw ,  cc + ii + jj ).a ;
            float geqSW = one36th*sc*(1.-ux3-uy3+ 4.5*(u2+uxuy2)  - u215) ;
            float geqNE = one36th*sc*(1.+ux3+uy3+ 4.5*(u2+uxuy2)  - u215) ;
            gNE = geqSW+geqNE - gSW ;

            out_g_ne_se_nw_sw.r = gNE ;
            }
        }

        if ( isFluid( cc + ii - jj ) ){
            gNW = texture(in_g_ne_se_nw_sw ,  cc + ii - jj      ).b ;
            out_g_ne_se_nw_sw.b = gNW ;
        }else{
            bool c1 = isFluid( cc+jj ) ;
            bool c2 = isFluid( cc-ii ) ;
            if( c1){
                /* cc-jj is not fluid */
                gS = texture( in_g_n_s_e_w , cc + jj ).g ;
                sc = (gS + beta*Cs )/(one9th + beta) ;
            }else if (c2){
                /* cc+ii is not fluid */
                gE = texture( in_g_n_s_e_w , cc - ii ).b ;
                sc = (gE + beta*Cs )/(one9th + beta) ;
            }
            if ( c1 || c2 ){
            gSE = texture(in_g_ne_se_nw_sw ,  cc - ii + jj      ).g ;
            float geqNW =one36th*sc*(1.-ux3+uy3+ 4.5*(u2-uxuy2)  - u215) ;
            float geqSE =one36th*sc*(1.+ux3-uy3+ 4.5*(u2-uxuy2)  - u215) ;
            gNW = geqSE + geqNW - gSE ;

            out_g_ne_se_nw_sw.b = gNW ;
            }
        }
    
    }else{
    
        /* inlet, outlet, top, bottom boundaries */
        sc  = C0 ;
        sb  = b0 ;

        g0  = four9ths* sc* (1. - u215) ;
        gE  = one9th*   sc* (1.+ux3+     4.5*ux2         - u215) ;

        gW  = one9th*   sc* (1.-ux3+     4.5*ux2         - u215) ;
        gN  = one9th*   sc* (1.+uy3+     4.5*uy2         - u215) ;
        gS  = one9th *  sc* (1.-uy3+     4.5*uy2         - u215) ;

        gNE = one36th*  sc* (1.+ux3+uy3+ 4.5*(u2+uxuy2)  - u215) ;
        gSE = one36th*  sc* (1.+ux3-uy3+ 4.5*(u2-uxuy2)  - u215) ;
        gNW = one36th*  sc* (1.-ux3+uy3+ 4.5*(u2-uxuy2)  - u215) ;
        gSW = one36th*  sc* (1.-ux3-uy3+ 4.5*(u2+uxuy2)  - u215) ;
        out_g_n_s_e_w       = vec4( gN,     gS,     gE,     gW  ) ;
        out_g_ne_se_nw_sw   = vec4( gNE,    gSE,    gNW,    gSW ) ;
        out_g0_c_b_b0       = vec4( g0,     sc,     sb,     sb0 ) ;
    }

    sc = g0 + gE + gW + gN + gS + gNE + gNW + gSW+ gSE ;
    if (hasSolidNeighbor(cc)){
        sb += kr*(sc-Cs) ;
    }
    
    out_g0_c_b_b0.b = sb ;
    out_m = vec4(1./(sb-.9)) ;

    return ;
}
