/*@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
 * WEBGL 2.0    :   2D Lattice-Boltzmann 
 *
 * PROGRAMMER   :   ABOUZAR KABOUDIAN
 * DATE         :   Wed 24 Oct 2018 16:45:17 (EDT) 
 * PLACE        :   Chaos Lab @ GaTech, Atlanta, GA
 *@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
 */
define([    'require',
            'shader!vertShader.vert',
            'shader!initShader.frag',
            'shader!collideShader.frag',
            'shader!streamShader.frag',
            'shader!crystalizeAndCurlShader.frag',
            'shader!boundaryShader.frag',
            'shader!paceShader.frag',
            'shader!clickShader.frag',
            'shader!bvltShader.frag',
            'shader!transShader.frag',
            ],
function(   require,
            vertShader,
            initShader,
            collideShader,
            streamShader,
            crystalizeAndCurlShader,
            boundaryShader,
            paceShader,
            clickShader,
            bvltShader,
            transShader,
            ){
"use strict" ;

/*========================================================================
 * Global Parameters
 *========================================================================
 */
var log = console.log ;
var params ;
var env ;
var gui ;
var pan ;
/*========================================================================
 * createGui
 *========================================================================
 */
function createGui(){
    env.gui = new Abubu.Gui() ;
    gui = env.gui.addPanel({width:300}) ;
/*-------------------------------------------------------------------------
 * Model Parameters
 *-------------------------------------------------------------------------
 */
    gui.mdlPrmFldr  =   gui.addFolder( 'Model Parameters'   ) ;
    gui.mdlPrmFldr.add( env, 'viscosity').onChange(function(){
            env.stream.uniforms.viscosity.value = env.viscosity ;
            env.collide.uniforms.viscosity.value = env.viscosity ;
            } ) ;
    gui.mdlPrmFldr.add( env, 'diffusivity').onChange(function(){
            env.stream.uniforms.diffusivity.value = env.diffusivity;
            env.collide.uniforms.diffusivity.value = env.diffusivity;
            } ) ;

    gui.mdlPrmFldr.add( env, 'u0').onChange(function(){
            env.stream.uniforms.u0.value = env.u0 ;
            env.e_init.uniforms.u0.value = env.u0 ;
            env.o_init.uniforms.u0.value = env.u0 ;
    } ) ;
    gui.mdlPrmFldr.add( env, 'Cs').onChange(function(){
            env.stream.uniforms.Cs.value = env.Cs ;
            env.collide.uniforms.Cs.value = env.Cs ;
    } ) ;

    gui.mdlPrmFldr.add( env, 'C0').onChange(function(){
            env.stream.uniforms.C0.value = env.C0 ;
            env.e_init.uniforms.C0.value = env.C0 ;
            env.o_init.uniforms.C0.value = env.C0 ;
    } ) ;

    gui.mdlPrmFldr.add( env, 'kr').onChange(function(){
            env.stream.uniforms.kr.value = env.kr ;
    } ) ;

    gui.mdlPrmFldr.add( env, 'Ptr').onChange(function(){
            env.e_crystalizeAndCurl.uniforms.Ptr.value = env.Ptr ;
            env.o_crystalizeAndCurl.uniforms.Ptr.value = env.Ptr ;
    } ) ;

    gui.mdlPrmFldr.add( env, 'obstacle').min(0).max(1).step(1).onChange(function(){
            env.e_init.uniforms.obstacle.value = env.obstacle ;
            env.o_init.uniforms.obstacle.value = env.obstacle ;
            env.e_init.render() ;
            env.o_init.render() ;
            refreshDisplay() ;
    } ) ;

    gui.mdlPrmFldr.open() ;

/*------------------------------------------------------------------------
 * Display Parameters
 *------------------------------------------------------------------------
 */
    gui.dspPrmFldr  = gui.addFolder( 'Display Parameters' ) ;
    gui.dspPrmFldr.add( env, 'colormap', Abubu.getColormapList() )
                .onChange(  function(){
                                env.disp.setColormap(env.colormap);
                                refreshDisplay() ;
                            }   ).name('Colormap') ;
    
    gui.dspPrmFldr.add( env, 'range' ).min(0).onChange(function(){
        //env.disp.setMinValue( -env.range ) ;
        env.disp.setMaxValue(  env.range );
        refreshDisplay() ;
    } ) ;

    gui.dspPrmFldr.add( env, 'frameRate').name('Frame Rate Limit')
        .min(0).max(36000).step(.1) ;
    gui.dspPrmFldr.open() ;

/*------------------------------------------------------------------------
 * save
 *------------------------------------------------------------------------
 */
    var svePrmFldr = gui.addFolder('Save Canvases') ;
    svePrmFldr.add( env, 'savePlot2DPrefix').name('File Name Prefix') ;
    svePrmFldr.add( env, 'savePlot2D' ).name('Save Plot2D') ;

/*------------------------------------------------------------------------
 * Simulation
 *------------------------------------------------------------------------
 */
    gui.smlPrmFldr  = gui.addFolder(    'Simulation'    ) ;
    gui.smlPrmFldr.add( env,  'clickRadius' )
        .min(0.002).max(.1).step(0.001)
        .name('Click Radius')
        .onChange(function(){
                env.click.setUniform('clickRadius',env.clickRadius) ;
                } ) ;
    gui.smlPrmFldr.add( env,
        'clicker',
        [   'Create Barrier',
            'Clear Barrier',
              ] ).name('Clicker Type') ;
    gui.smlPrmFldr.add( env, 'stopTime').onChange(function(){
        env.range = env.stopTime ;
        env.disp.setMaxValue(  env.range );
        gui.updateDisplay() ;
        refreshDisplay() ;
    } );
    gui.smlPrmFldr.add( env, 'time').name('Solution Time').listen() ;
    gui.smlPrmFldr.add( env, 'initialize').name('Initialize') ;
    gui.smlPrmFldr.add( env, 'solve').name('Solve/Pause') ;
    gui.smlPrmFldr.open() ;

/*------------------------------------------------------------------------
 * addCoeficients
 *------------------------------------------------------------------------
 */
    function addCoeficients( fldr,
            coefs,
            solvers ,
            options ){
        var coefGui = {} ;
        var min = undefined ;
        var max = undefined ;
        if (options != undefined ){
            if (options.min != undefined ){
                min = options.min ;
            }
            if (options.max != undefined ){
                max = options.max ;
            }
        }
        for(var i=0; i<coefs.length; i++){
            var coef = addCoef(fldr,coefs[i],solvers) ;
            if (min != undefined ){
                coef.min(min) ;
            }
            if (max != undefined ){
                coef.max(max) ;
            }
            coefGui[coefs[i]] = coef ;
        }
        return coefGui ;

        /* addCoef */
        function addCoef( fldr,
                coef,
                solvers     ){
            var coefGui =   fldr.add( env, coef )
                .onChange(
                        function(){
                        Abubu.setUniformInSolvers(  coef,
                                env[coef],
                                solvers  ) ;
                        } ) ;

            return coefGui ;

        }
    }

    return ;
} /* End of createGui */

/*========================================================================
 * Environment
 *========================================================================
 */
function Environment(){
    this.running = false ;

    /* model parameters         */
    this.viscosity   = 1.0 ;
    this.diffusivity= 80 ;
    this.Cs         = 1.0 ;
    this.C0         = 1.2 ;
    this.kr         = 160.0 ;
    this.u0         = 0.0 ;
    this.b0         = 1.0 ;
    this.Ptr        = 0.005 ;

    /* Display Parameters       */
    this.colormap    =   'jet';
    this.dispWidth   =   400 ;
    this.dispHeight  =   400 ;
    this.frameRate   =   600 ;
    this.timeWindow  =   1000 ;
    this.probeVisiblity = false ;
    this.range      = 4000 ;
    this.obstacle   = 0 ;

    /* Solver Parameters        */
    this.width       =   400 ;
    this.height      =   400 ;
    this.dt          =   1 ;

    /* Solve                    */
    this.solve       = function(){
        this.running = !this.running ;
        return ;
    } ;
    this.time        = 0.0 ;
    this.clicker     = 'Create Barrier';


    this.savePlot2DPrefix = '' ;
    this.savePlot2D    = function(){
        //this.running = true ;
        var prefix ;
        try{
            prefix = eval(env.savePlot2DPrefix) ;
        }catch(e){
            prefix = this.savePlot2DPrefix ;
        }
        Abubu.saveCanvas( 'canvas_1',
        {
            number  : this.time ,
            postfix : '_'+this.colormap ,
            prefix  : prefix,
            format  : 'png'
        } ) ;
    }
    this.stopTime       = 4000 ;

    /* Clicker                  */
    this.clickRadius    = 0.01 ;
    this.clickPosition  = [0.5,0.5] ;
    this.clickValue     = [0.,0,0,0] ;
}

var canvas_1 ;
/*========================================================================
 * Initialization of the GPU and Container
 *========================================================================
 */
function loadWebGL()
{
    env = new Environment() ;

    canvas_1 = document.createElement('canvas') ;
    canvas_1.setAttribute('id','canvas_1') ;
    document.body.append(canvas_1) ;
    canvas_1.width = env.dispWidth ;
    canvas_1.height= env.dispHeight ;

/*-------------------------------------------------------------------------
 * stats
 *-------------------------------------------------------------------------
 */
    var stats       = new Stats() ;
    document.body.appendChild( stats.domElement ) ;
    
/*------------------------------------------------------------------------
 * defining all render targets
 *------------------------------------------------------------------------
 */
    var width   = env.width ;
    var height  = env.height ;

    env.e_n_s_e_w       = new Abubu.Float32Texture( width, height ) ;
    env.o_n_s_e_w       = new Abubu.Float32Texture( width, height ) ;
    
    env.e_ne_se_nw_sw   = new Abubu.Float32Texture( width, height ) ;
    env.o_ne_se_nw_sw   = new Abubu.Float32Texture( width, height ) ;
    
    env.e_n0_rho_ux_uy  = new Abubu.Float32Texture( width, height ) ;
    env.o_n0_rho_ux_uy  = new Abubu.Float32Texture( width, height ) ;
    
    env.e_g_n_s_e_w     = new Abubu.Float32Texture( width, height ) ;
    env.o_g_n_s_e_w     = new Abubu.Float32Texture( width, height ) ;
    
    env.e_g_ne_se_nw_sw = new Abubu.Float32Texture( width, height ) ;
    env.o_g_ne_se_nw_sw = new Abubu.Float32Texture( width, height ) ;
    
    env.e_g0_c_b_b0     = new Abubu.Float32Texture( width, height ) ;
    env.o_g0_c_b_b0     = new Abubu.Float32Texture( width, height ) ;

    env.e_fluid_curl    = new Abubu.Float32Texture( width, height ) ;
    env.o_fluid_curl    = new Abubu.Float32Texture( width, height ) ;
    env.solid           = new Abubu.Float32Texture( width, height ) ;
    env.e_m             = new Abubu.Float32Texture( width, height ) ;

    env.transition    = new Abubu.Float32Texture( width, height ) ;

/*------------------------------------------------------------------------
 * random seeds
 *------------------------------------------------------------------------
 */
    env.seed_0 = new Uint32Array( width*height*4 ) ;
    env.seed_1 = new Uint32Array( width*height*4 ) ;
    
    for( var i=0 ; i < width; i++){
        for(var j=0 ; j< height ; j++){
            for(var k=0 ; k<4 ; k++){
                var idx = (i*height+j)*4 + k ;
                env.seed_0[idx] = Abubu.xorwow() ;
                env.seed_1[idx] = Abubu.xorwow() ;
            }
        }
    }

    env.e_state_0 = new Abubu.Uint32Texture(width, height, {
        data: env.seed_0 } ) ;
    env.e_state_1 = new Abubu.Uint32Texture(width, height, {
        data: env.seed_1 } ) ;
    
    env.o_state_0 = new Abubu.Uint32Texture(width, height, { 
        data: env.seed_0 } ) ;
    env.o_state_1 = new Abubu.Uint32Texture(width, height, {
        data: env.seed_1 } ) ;

/*------------------------------------------------------------------------
 * random seeds
 *------------------------------------------------------------------------
 */
    env.seed_0 = new Uint32Array( width*height*4 ) ;
    env.seed_1 = new Uint32Array( width*height*4 ) ;
    
    for( var i=0 ; i < width; i++){
        for(var j=0 ; j< height ; j++){
            for(var k=0 ; k<4 ; k++){
                var idx = (i*height+j)*4 + k ;
                env.seed_0[idx] = Abubu.xorwow() ;
                env.seed_1[idx] = Abubu.xorwow() ;
            }
        }
    }

    env.e_state_0 = new Abubu.Uint32Texture(width, height, {
        data: env.seed_0 } ) ;
    env.e_state_1 = new Abubu.Uint32Texture(width, height, {
        data: env.seed_1 } ) ;
    
    env.o_state_0 = new Abubu.Uint32Texture(width, height, { 
        data: env.seed_0 } ) ;
    env.o_state_1 = new Abubu.Uint32Texture(width, height, {
        data: env.seed_1 } ) ;

/*------------------------------------------------------------------------
 * init solver to initialize all textures
 *------------------------------------------------------------------------
 */
    env.e_init  = new Abubu.Solver( {
        fragmentShader  : initShader.value ,
        vertexShader    : vertShader.value ,
        uniforms: { 
            u0 : { type : 'f', value : env.u0 } ,
            C0 : { type : 'f', value : env.C0 } ,
            b0 : { type : 'f', value : env.b0 } ,
            obstacle : { type : 'i', value : env.obstacle } ,
        } ,
        renderTargets   : {
        out_n_s_e_w     : { location : 0, target: env.e_n_s_e_w         } ,
        out_ne_se_nw_sw : { location : 1, target: env.e_ne_se_nw_sw     } ,
        out_n0_rho_ux_uy: { location : 2, target: env.e_n0_rho_ux_uy    } , 
        out_fluid_curl  : { location : 3, target: env.e_fluid_curl      } ,
        out_g_n_s_e_w   : { location : 4, target: env.e_g_n_s_e_w       } ,
        out_g_ne_se_nw_sw:{ location : 5, target: env.e_g_ne_se_nw_sw   } ,
        out_g0_c_b_b0   : { location : 6, target: env.e_g0_c_b_b0       } , 
       }
    } ) ;
    env.o_init  = new Abubu.Solver( {
        fragmentShader  : initShader.value ,
        vertexShader    : vertShader.value ,
        uniforms: { 
            u0 : { type : 'f', value : env.u0 } ,
            C0 : { type : 'f', value : env.C0 } ,
            b0 : { type : 'f', value : env.b0 } ,
            obstacle : { type : 'i', value : env.obstacle } ,
        } ,
        renderTargets   : {
        out_n_s_e_w     : { location : 0, target: env.o_n_s_e_w         } ,
        out_ne_se_nw_sw : { location : 1, target: env.o_ne_se_nw_sw     } ,
        out_n0_rho_ux_uy: { location : 2, target: env.o_n0_rho_ux_uy    } , 
        out_fluid_curl  : { location : 3, target: env.o_fluid_curl      } ,
        out_g_n_s_e_w   : { location : 4, target: env.o_g_n_s_e_w       } ,
        out_g_ne_se_nw_sw:{ location : 5, target: env.o_g_ne_se_nw_sw   } ,
        out_g0_c_b_b0   : { location : 6, target: env.o_g0_c_b_b0       } , 
       }
    } ) ;

/*------------------------------------------------------------------------
 * even and odd collide solvers
 *------------------------------------------------------------------------
 */
    env.collide = new Abubu.Solver({
        fragmentShader : collideShader.value ,
        vertexShader   : vertShader.value ,
        uniforms : {
            in_n_s_e_w      : { type : 't', value : env.e_n_s_e_w       } ,
            in_ne_se_nw_sw  : { type : 't', value : env.e_ne_se_nw_sw   } ,
            in_n0_rho_ux_uy : { type : 't', value : env.e_n0_rho_ux_uy  } ,
            in_fluid_curl   : { type : 't', value : env.e_fluid_curl    } ,
            in_g_n_s_e_w    : { type : 't', value : env.e_g_n_s_e_w     } ,
            in_g_ne_se_nw_sw: { type : 't', value : env.e_g_ne_se_nw_sw } ,
            in_g0_c_b_b0    : { type : 't', value : env.e_g0_c_b_b0     } ,

            viscosity       : { type : 'f', value : env.viscosity       } ,
            diffusivity     : { type : 'f', value : env.diffusivity     } ,
            Cs              : { type : 'f', value : env.Cs              } ,
        } ,
        renderTargets  : {
            out_n_s_e_w     : 
                { location  : 0 , target : env.o_n_s_e_w                } ,
            out_ne_se_nw_sw : 
                { location  : 1 , target : env.o_ne_se_nw_sw            } ,
            out_n0_rho_ux_uy: 
                { location  : 2 , target : env.o_n0_rho_ux_uy           } ,
            out_g_n_s_e_w   : 
                { location  : 3 , target : env.o_g_n_s_e_w              } ,
            out_g_ne_se_nw_sw: 
                { location  : 4 , target : env.o_g_ne_se_nw_sw          } ,
            out_g0_c_b_b0   : 
                { location  : 5 , target : env.o_g0_c_b_b0              } ,
        } ,
 
        clear   : true
    } ) ;

/*------------------------------------------------------------------------
 * stream 
 *------------------------------------------------------------------------
 */
    env.stream = new Abubu.Solver({
        fragmentShader  : streamShader.value ,
        vertexShader    : vertShader.value ,
        uniforms    : {
            in_n_s_e_w      : { type : 't', value : env.o_n_s_e_w       } ,
            in_ne_se_nw_sw  : { type : 't', value : env.o_ne_se_nw_sw   } ,
            in_n0_rho_ux_uy : { type : 't', value : env.o_n0_rho_ux_uy  } ,
            in_fluid_curl   : { type : 't', value : env.o_fluid_curl    } ,
            
            in_g_n_s_e_w    : { type : 't', value : env.o_g_n_s_e_w     } ,
            in_g_ne_se_nw_sw: { type : 't', value : env.o_g_ne_se_nw_sw } ,
            in_g0_c_b_b0    : { type : 't', value : env.o_g0_c_b_b0     } ,
            
            viscosity       : { type : 'f', value : env.viscosity       } ,
            diffusivity     : { type : 'f', value : env.diffusivity     } ,
            u0              : { type : 'f', value : env.u0              } ,
            b0              : { type : 'f', value : env.b0              } ,
            Cs              : { type : 'f', value : env.Cs              } ,
            C0              : { type : 'f', value : env.C0              } ,
            kr              : { type : 'f', value : env.kr              } ,
        } ,
        renderTargets: {
            out_n_s_e_w     : 
                { location  : 0 , target : env.e_n_s_e_w     } ,
            out_ne_se_nw_sw : 
                { location  : 1 , target : env.e_ne_se_nw_sw } ,
            out_n0_rho_ux_uy: 
                { location  : 2 , target : env.e_n0_rho_ux_uy} ,
            out_g_n_s_e_w   : 
                { location  : 3 , target : env.e_g_n_s_e_w              } ,
            out_g_ne_se_nw_sw: 
                { location  : 4 , target : env.e_g_ne_se_nw_sw          } ,
            out_g0_c_b_b0   : 
                { location  : 5 , target : env.e_g0_c_b_b0              } ,
            out_m   : 
                { location  : 6 , target : env.e_m                      } ,

        } ,
        clear : true ,
    } ) ;

/*------------------------------------------------------------------------
 * calculate crystalizeAndCurl 
 *------------------------------------------------------------------------
 */
    env.e_crystalizeAndCurl = new Abubu.Solver({
        fragmentShader  : crystalizeAndCurlShader.value ,
        vertexShader    : vertShader.value ,
        uniforms        : {
            Ptr             : { type : 'f', value : env.Ptr             } ,
            in_n0_rho_ux_uy : { type : 't', value : env.e_n0_rho_ux_uy  } ,
            in_g0_c_b_b0    : { type : 't', value : env.e_g0_c_b_b0     } ,
            in_fluid_curl   : { type : 't', value : env.e_fluid_curl    } ,
            in_state_0      : { type : 't', value : env.e_state_0       } ,
            in_state_1      : { type : 't', value : env.e_state_1       } ,
        } ,
        renderTargets   : { 
            out_fluid_curl : 
                { location : 0 , target : env.o_fluid_curl  } ,
            out_solid   : 
                { location : 1 , target : env.solid         } ,
            out_transition :
                { location : 2 , target : env.transition    } ,
            out_state_0 : 
                { location : 3 , target : env.o_state_0     } ,
            out_state_1 : 
                { location : 4 , target : env.o_state_1     } ,
                    } ,
        clear : true ,
    } ) ;

    env.o_crystalizeAndCurl = new Abubu.Solver({
        fragmentShader  : crystalizeAndCurlShader.value ,
        vertexShader    : vertShader.value ,
        uniforms        : {
            Ptr             : { type : 'f', value : env.Ptr             } ,
            in_n0_rho_ux_uy : { type : 't', value : env.e_n0_rho_ux_uy  } ,
            in_g0_c_b_b0    : { type : 't', value : env.e_g0_c_b_b0     } ,
            in_fluid_curl   : { type : 't', value : env.o_fluid_curl    } ,
            in_state_0      : { type : 't', value : env.o_state_0       } ,
            in_state_1      : { type : 't', value : env.o_state_1       } ,
        } ,
        renderTargets   : { 
            out_fluid_curl : 
                { location : 0 , target : env.e_fluid_curl  } ,
            out_solid   : 
                { location : 1 , target : env.solid         } ,
            out_transition :
                { location : 2 , target : env.transition    } ,

            out_state_0 : 
                { location : 3 , target : env.e_state_0     } ,
            out_state_1 : 
                { location : 4 , target : env.e_state_1     } ,

        } ,
        clear : true ,
    } ) ;

    env.crystalizeAndCurl = function(){
        env.e_crystalizeAndCurl.render() ;
        env.o_crystalizeAndCurl.render() ;
    } ;

/*------------------------------------------------------------------------
 * trans
 *------------------------------------------------------------------------
 */
    env.e_trans = new Abubu.Solver( {
        fragmentShader  : transShader.value ,
        vertexShader    : vertShader.value ,
        uniforms :{ 
            in_g0_c_b_b0  : { type : 't' , value : env.e_g0_c_b_b0  } ,
            in_transition : { type : 't' , value : env.transition   } ,
        } ,
        renderTargets:{
            out_g0_c_b_b0 : { location : 0, target : env.o_g0_c_b_b0 } ,
        }

    } ) ;
    env.o_trans = new Abubu.Copy( env.o_g0_c_b_b0, env.e_g0_c_b_b0 ) ;

    
    env.trans = function(){
        env.e_trans.render() ;
        env.o_trans.render() ;
    }
/*------------------------------------------------------------------------
 * click solver
 *------------------------------------------------------------------------
 */
    env.click = new Abubu.Solver( {
        vertexShader    : vertShader.value ,
        fragmentShader  : clickShader.value ,
        uniforms        : {
            in_fluid        : { type: 't',  value : env.o_fluid_curl   } ,
            clickPosition   : { type: 'v2', value : env.clickPosition  } ,
            clickValue      : { type: 'v4', value : env.clickValue     } ,
            clickRadius     : { type: 'f',  value : env.clickRadius    } ,
        } ,
        renderTargets   : {
            out_fluid   : { location : 0,   target : env.e_fluid_curl   } ,
            out_solid   : { location : 1,   target : env.solid          } ,
            
        } ,
        clear           : true ,
    } ) ;
    env.clickCopy = new Abubu.Copy(env.e_fluid_curl, env.o_fluid_curl ) ;
    
/*------------------------------------------------------------------------
 * disp
 *------------------------------------------------------------------------
 */
    env.disp= new Abubu.Plot2D({
        target : env.e_fluid_curl ,
        phase  : env.solid ,
        phaseColor : [1,1,1] ,
        channel: 'a',
        colormap : env.colormap,
        canvas : canvas_1 ,
        minValue: 0  ,
        maxValue:  env.range ,
        colorbar : true ,
        unit : '',
    } );

/*------------------------------------------------------------------------
 * initialize
 *------------------------------------------------------------------------
 */
    env.initialize = function(){
        env.time = 0 ;
        env.paceTime = 0 ;
        env.breaked = false ;
        env.e_state_0.updateData() ;
        env.e_state_1.updateData() ;
        env.o_state_0.updateData() ;
        env.o_state_1.updateData() ;

        env.e_init.render() ;
        env.o_init.render() ;
        env.crystalizeAndCurl() ;
        env.disp.initialize() ;
        refreshDisplay() ;
    }

/*-------------------------------------------------------------------------
 * Render the programs
 *-------------------------------------------------------------------------
 */
   env.initialize() ;

/*------------------------------------------------------------------------
 * createGui
 *------------------------------------------------------------------------
 */
   createGui() ;

/*------------------------------------------------------------------------
 * clicker
 *------------------------------------------------------------------------
 */
    canvas_1.addEventListener("click",      onClick,        false   ) ;
    canvas_1.addEventListener('mousemove',
            function(e){
                if ( e.buttons >=1 ){
                    onClick(e) ;
                }
            } , false ) ;

    env.noSteps = 0 ;
    env.lapsed = 0 ;
    
/*------------------------------------------------------------------------
 * rendering the program ;
 *------------------------------------------------------------------------
 */
    env.render = function(){
        if (env.time >= env.stopTime){
            env.running = false ;
        }
        if (env.running){
            env.startDate = performance.now() ;
            for(var i=0 ; i< env.frameRate/60 ; i++){
                env.collide.render() ;
                env.stream.render() ;
                
                env.crystalizeAndCurl() ;
                env.trans() ;

                stats.update() ;
                env.time += 1 ;
                if(env.time >= env.stopTime) {
                    env.running = false ;
                    break ;
                }
            }
            refreshDisplay();
        }
        if (env.frameRate < 60 ){
            var delay = 1000/env.frameRate ;
            window.setTimeout(function(){
                    requestAnimationFrame(env.render) ;
                    } , delay ) ;
        }else{
            requestAnimationFrame(env.render) ;
        }
    }

/*------------------------------------------------------------------------
 * add environment to document
 *------------------------------------------------------------------------
 */
    document.env = env ;

/*------------------------------------------------------------------------
 * render the webgl program
 *------------------------------------------------------------------------
 */
    env.render();

}/*  End of loadWebGL  */

/*========================================================================
 * refreshDisplay
 *========================================================================
 */
function refreshDisplay(){
    env.disp.render() ;
}

/*========================================================================
 * onClick
 *========================================================================
 */
function onClick(e){
    env.clickPosition[0] =
        (e.clientX-canvas_1.offsetLeft) / env.dispWidth ;
    env.clickPosition[1] =  1.0-
        (e.clientY-canvas_1.offsetTop) / env.dispHeight ;

    env.click.setUniform('clickPosition',env.clickPosition) ;

    if (    env.clickPosition[0]   >   1.0 ||
            env.clickPosition[0]   <   0.0 ||
            env.clickPosition[1]   >   1.0 ||
            env.clickPosition[1]   <   0.0 ){
        return ;
    }
    clickRender() ;
    return ;
}

/*========================================================================
 * Render and display click event
 *========================================================================
 */
function clickRender(){
    switch( env['clicker']){
    case 'Create Barrier':
        env.click.setUniform('clickValue', [0,0,0,0]) ;
        clickSolve() ;
        requestAnimationFrame(clickSolve) ;
        break ;
    case 'Clear Barrier':
        env.click.setUniform('clickValue', [1,0,0,0]) ;
        clickSolve() ;
        requestAnimationFrame(clickSolve) ;
        break ;
   case 'Signal Loc. Picker':
        env.plot.setProbePosition( env.clickPosition ) ;
        env.disp.setProbePosition( env.clickPosition ) ;
        env.plot.init() ;
        refreshDisplay() ;
        break ;
    case 'Autopace Loc. Picker':
        ///pacePos = new THREE.Vector2(clickPos.x, env.clickPosition[1]) ;
        paceTime = 0 ;
    }
    return ;
}
/*========================================================================
 * solve click event
 *========================================================================
 */
function clickSolve(){
    env.click.render() ;
    env.clickCopy.render() ;
    refreshDisplay() ;
}

/*@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
 * End of require()
 *@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
 */
loadWebGL() ;
} ) ;
