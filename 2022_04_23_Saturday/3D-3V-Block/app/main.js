/*@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
 * WEBGL 2.0    :   Volume Ray Casting a cube
 *
 * PROGRAMMER   :   ABOUZAR KABOUDIAN
 * DATE         :   Fri 15 Jun 2018 19:52:54 (EDT)
 * PLACE        :   Chaos Lab @ GaTech, Atlanta, GA
 *@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
 */
define([    'require',
            'shader!vertShader.vert',
            'shader!crdtShader.frag',
            'shader!initShader.frag',
            'shader!compShader.frag',
            'shader!pAvgShader.frag',
            'shader!clickShader.frag',
            'image!./structure-c.png',
            ],
function(   require,
            vertShader,
            crdtShader,
            initShader,
            compShader,
            pAvgShader,
            clickShader,
            structure,
            ){
            "use strict" ;

var log = console.log ;
var params ;        /* parameters = env         */
var env ;           /* environmental variables  */
var gui ;
/*========================================================================
 * createGui()
 *========================================================================
 */ 
function createGui(){
    env.gui = new Abubu.Gui();
    gui = env.gui.addPanel({width:300}) ;
/*-------------------------------------------------------------------------
 * Model Parameters
 *-------------------------------------------------------------------------
 */
    gui.mdlPrmFldr  =   gui.addFolder( 'Model Parameters'   ) ;
    gui.mdlPrmFldr.add(env,'Set_No',
            ['1','2','3','4','5','6','7','8','9','10'])
        .onChange(updateSet) ;
    addCoeficients( gui.mdlPrmFldr, 
        [   'tau_pv', 'tau_v1', 'tau_v2',   'tau_pw',   'tau_mw',
            'tau_d' , 'tau_0' , 'tau_r' ,   'tau_si',   'K'     , 
            'V_sic' , 'V_c'   , 'V_v'   ,   'C_si'  ,   
            'C_m', 'diffCoef'                                       ] , 
            [env.comp1,env.comp2], {min:0}) ;

    updateSet() ;
    gui.mdlPrmFldr.open() ;

/*------------------------------------------------------------------------
 * display
 *------------------------------------------------------------------------
 */
    gui.dispFldr = gui.addFolder('Display');
    gui.dispFldr.add( env, 'colormap',
            Abubu.getColormapList() )
                .onChange(  function(){
                                env.vrc.setColormap(env.colormap);
                                env.vrc.render() ;
                            }   ).name('Colormap') ;

    gui.dispFldr.add(env, 'frameRate').min(60).max(6000).step(60) ;
    gui.vrcFldr = gui.dispFldr.addFolder('Volume Ray Caster') ;

    gui.vrcFldr.add(env, 'alphaCorrection').name('Alpha Correction').
        min(0.003).max(1.0).onChange(function(){
                env.vrc.setAlphaCorrection( env.alphaCorrection ) ;
                } ) ;
    gui.vrcFldr.add(env, 'noSteps').name('Number of Steps').
        min(30).max(600).step(1).onChange(function(){
                env.vrc.setNoSteps(env.noSteps) ;
        } ) ;
    gui.vrcFldr.add(env, 'lightShift').step(0.05).onChange(function(){
        env.vrc.setLightShift( env.lightShift) ;
    } ) ;
    gui.vrcFldr.add(env, 'minVrcValue').step(0.01).onChange(function(){
            env.vrc.setMinValue(env.minVrcValue) ;
            env.vrc.setThreshold(env.minVrcValue) ;

            } ) ;
    gui.vrcFldr.add(env, 'maxVrcValue').step(0.01).onChange(function(){
            env.vrc.setMaxValue(env.maxVrcValue) ;
            } ) ;

    gui.vrcFldr.add(env, 'rayCast').onChange(function(){
            env.vrc.setRayCast(env.rayCast) ;
            } ) ;
    gui.cpfFldr = gui.vrcFldr.addFolder('Cutplanes and Filament') ;
    gui.cpfFldr.add(env, 'drawFilament').onChange(function(){
            env.vrc.setDrawFilament(env.drawFilament) ;
            } ) ;
    gui.cpfFldr.add(env, 'showXCut').onChange(function(){
            env.vrc.setShowXCut(env.showXCut) ;
            } ) ;
    gui.cpfFldr.add(env, 'showYCut').onChange(function(){
            env.vrc.setShowYCut(env.showYCut) ;
            } ) ;
    gui.cpfFldr.add(env, 'showZCut').onChange(function(){
            env.vrc.setShowZCut(env.showZCut) ;
            } ) ;   
   
    gui.cpfFldr.add(env, 'xLevel').min(0.1).max(0.9).onChange(
            function(){
                env.vrc.setXLevel( env.xLevel ) ;
            } ) ;
    gui.cpfFldr.add(env, 'yLevel').min(0.1).max(0.9).onChange(
            function(){
                env.vrc.setYLevel( env.yLevel ) ;
            } ) ;
    gui.cpfFldr.add(env, 'zLevel').min(0.1).max(0.9).onChange(
            function(){
                env.vrc.setZLevel( env.zLevel ) ;
            } ) ;


    gui.dispFldr.open() ;

/*------------------------------------------------------------------------
 * simulation
 *------------------------------------------------------------------------
 */
    gui.smlPrmFldr = gui.addFolder('Simulation') ;
    gui.smlPrmFldr.add( env, 'time').listen() ;
    gui.smlPrmFldr.add( env, 'initialize').name('Initialize Solution') ;
    gui.smlPrmFldr.add( env, 'solve' ).name('Solve/Pause') ;

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
            var coefGui =   fldr.add( params, coef )
                .onChange( 
                        function(){
                        Abubu.setUniformInSolvers(  coef, 
                                params[coef], 
                                solvers  ) ;
                        } ) ;

            return coefGui ;

        }
    }
}
/*========================================================================
 * changeParamType
 *========================================================================
 */ 
function updateSet(){
    switch (env.Set_No){
        case '1':
                env.tau_pv      = 3.33   ;
                env.tau_v1      = 19.6   ;
                env.tau_v2      = 1000   ;
                env.tau_pw      = 667    ;
                env.tau_mw      = 11     ;
                env.tau_d       = 0.42   ;
                env.tau_0       = 8.3    ;
                env.tau_r       = 50     ;
                env.tau_si      = 45     ;
                env.K           = 10     ;
                env.V_sic       = 0.85   ;
                env.V_c         = 0.13   ;
                env.V_v         = 0.055  ;
                env.C_si        = 1.0 ;
            break ;
        case '2':
                env.tau_pv      = 10.0   ;
                env.tau_v1      = 10.0   ;
                env.tau_v2      = 10.0   ;
                env.tau_pw      = 667    ;
                env.tau_mw      = 11     ;
                env.tau_d       = 0.25   ;
                env.tau_0       = 10.0   ;
                env.tau_r       = 190    ;
                env.tau_si      = 45     ;
                env.K           = 10     ;
                env.V_sic       = 0.85   ;
                env.V_c         = 0.13   ;
                env.V_v         = 0.055  ;
                env.C_si        = 0.0    ;
            break ;
        case '3':
                env.tau_pv      = 3.33   ;
                env.tau_v1      = 19.6   ;
                env.tau_v2      = 1250   ;
                env.tau_pw      = 870    ;
                env.tau_mw      = 41     ;
                env.tau_d       = 0.25   ;    
                env.tau_0       = 12.5   ;
                env.tau_r       = 33.33  ;
                env.tau_si      = 29     ;
                env.K           = 10     ;
                env.V_sic       = 0.85   ;
                env.V_c         = 0.13   ;
                env.V_v         = 0.04   ;
                env.C_si        = 1.0    ;
            break ;
        case '4':
                env.tau_pv      = 3.33   ;
                env.tau_v1      = 15.6   ;
                env.tau_v2      = 5      ;
                env.tau_pw      = 350    ;
                env.tau_mw      = 80     ;
                env.tau_d       = 0.407  ;
                env.tau_0       = 9      ;
                env.tau_r       = 34     ;
                env.tau_si      = 26.5   ;
                env.K           = 15     ;
                env.V_sic       = 0.45   ;
                env.V_c         = 0.15   ;
                env.V_v         = 0.04   ;
                env.C_si        = 1.00   ;
            break ;
        case '5':
                env.tau_pv      = 3.33   ;
                env.tau_v1      = 12     ;
                env.tau_v2      = 2      ;
                env.tau_pw      = 1000   ;
                env.tau_mw      = 100    ;
                env.tau_d       = 0.362  ;
                env.tau_0       = 5      ;
                env.tau_r       = 33.33  ;
                env.tau_si      = 29     ;
                env.K           = 15     ;
                env.V_sic       = 0.70   ;
                env.V_c         = 0.13   ;
                env.V_v         = 0.04   ;
                env.C_si        = 1.00   ;
            break ;
        case '6':
                env.tau_pv      = 3.33   ;
                env.tau_v1      = 9      ;
                env.tau_v2      = 8      ;
                env.tau_pw      = 250    ;
                env.tau_mw      = 60     ;
                env.tau_d       = 0.395  ;
                env.tau_0       = 9      ;
                env.tau_r       = 33.33  ;
                env.tau_si      = 29     ;
                env.K           = 15     ;
                env.V_sic       = 0.50   ;
                env.V_c         = 0.13   ;
                env.V_v         = 0.04   ;
                env.C_si        = 1.00   ;
            break ;
        case '7':
                env.tau_pv      = 10     ;
                env.tau_v1      = 7      ;
                env.tau_v2      = 7      ;
                env.tau_pw      = 250    ;
                env.tau_mw      = 60     ;
                env.tau_d       = 0.25   ;
                env.tau_0       = 12     ;
                env.tau_r       = 100    ;
                env.tau_si      = 29     ;
                env.K           = 15     ;
                env.V_sic       = 0.50   ;
                env.V_c         = 0.13   ;
                env.V_v         = 0.04   ;
                env.C_si        = 0.00;
            break ;

        case '8':
               env.tau_pv      =  13.03  ; 
               env.tau_v1      =  19.6   ; 
               env.tau_v2      =  1250   ; 
               env.tau_pw      =  800    ; 
               env.tau_mw      =  40     ; 
               env.tau_d       =  0.45   ; 
               env.tau_0       =  12.5   ; 
               env.tau_r       =  33.25  ; 
               env.tau_si      =  29     ; 
               env.K           =  10     ; 
               env.V_sic       =  0.85   ; 
               env.V_c         =  0.13   ; 
               env.V_v         =  0.04   ; 
               env.C_si        =  1.00;
            break ;
        case '9':
                env.tau_pv      = 3.33   ; 
                env.tau_v1      = 15     ; 
                env.tau_v2      = 2      ; 
                env.tau_pw      = 670    ; 
                env.tau_mw      = 61     ; 
                env.tau_d       = 0.25   ; 
                env.tau_0       = 12.5   ; 
                env.tau_r       = 28     ; 
                env.tau_si      = 29     ; 
                env.K           = 10     ; 
                env.V_sic       = 0.45   ; 
                env.V_c         = 0.13   ; 
                env.V_v         = 0.05   ; 
                env.C_si        = 1.00;
            break ;
        case '10':
                env.tau_pv      = 10     ; 
                env.tau_v1      = 40     ; 
                env.tau_v2      = 333    ; 
                env.tau_pw      = 1000   ; 
                env.tau_mw      = 65     ; 
                env.tau_d       = 0.115  ; 
                env.tau_0       = 12.5   ; 
                env.tau_r       = 25     ; 
                env.tau_si      = 22.22  ; 
                env.K           = 10     ; 
                env.V_sic       = 0.85   ; 
                env.V_c         = 0.13   ; 
                env.V_v         = 0.025  ; 
                env.C_si        = 1.00;
            break ;
    } /* End of switch */

    Abubu.setUniformsInSolvers( 
    [       'tau_pv',       'tau_v1',       'tau_v2',       'tau_pw',   
            'tau_mw',       'tau_d' ,       'tau_0' ,       'tau_r' ,   
            'tau_si',       'K'     ,       'V_sic' ,       'V_c'   , 
            'V_v'   ,       'C_si'  ,       'C_m',          'diffCoef'] ,
    [       env.tau_pv  ,   env.tau_v1  ,   env.tau_v2  ,   env.tau_pw  , 
            env.tau_mw  ,   env.tau_d   ,   env.tau_0   ,   env.tau_r   , 
            env.tau_si  ,   env.K       ,   env.V_sic   ,   env.V_c     , 
            env.V_v     ,   env.C_si    ,   env.C_m     ,   env.diffCoef
    ] , 

    [   env.comp1, env.comp2    ] ) ;

    gui.mdlPrmFldr.updateDisplay() ;
 
}

/*========================================================================
 * Environment : structure that holds all global variables
 *========================================================================
 */
function Environment(){
    this.width      = 2048 ;
    this.height     = 1024 ;

    this.mx         = 16 ;
    this.my         = 8 ;

    this.domainResolution   = [128,128,128] ;
    this.domainSize         = [16,16,16] ;


    this.minVlt     = -90 ;
    this.maxVlt     = 30 ;

    /* Model Parameters         */
    this.C_m        = 1.0 ;
    this.diffCoef   = 0.003 ;

    /* time coeficients         */
    this.Set_No      = '1' ;
    this.tau_pv      = 3.33    ;
    this.tau_v1      = 19.6    ;
    this.tau_v2      = 1000    ;
    this.tau_pw      = 667     ;
    this.tau_mw      = 11      ;
    this.tau_d       = 0.42    ;
    this.tau_0       = 8.3     ;
    this.tau_r       = 50      ;
    this.tau_si      = 45      ;
    this.K           = 10      ;
    this.V_sic       = 0.85    ;
    this.V_c         = 0.13    ;
    this.V_v         = 0.055   ;
    this.C_si        = 1.0     ;

    this.dt         = 5.e-2 ;
    this.time       = 0 ;

    /* Display Parameters       */
    this.colormap    =   'jet';
    this.dispWidth   =   512 ;
    this.dispHeight  =   512 ;
    this.frameRate   =   2400 ;
    this.timeWindow  =   1000 ;
    this.minVrcValue = 0.01 ;
    this.maxVrcValue = 1.1 ;

    this.showXCut = true ;
    this.showYCut = true ;
    this.showZCut = true ;
    this.drawFilament = true ;
    this.rayCast = true ;
    this.xLevel = 0.1 ;
    this.yLevel = 0.9 ;
    this.zLevel = 0.1 ;


    this.threshold  = 0.5 ;
    this.thickness = 3 ;

    this.clickRadius = 0.1 ;
    this.alphaCorrection = 0.14 ;
    this.noSteps    = 275 ;
    this.lightShift = 1.0 ;
    
    this.running    = false ;
    this.solve      = function(){
        this.running = !this.running ;
    }
}

/*========================================================================
 * loadWebGL
 *========================================================================
 */
function loadWebGL()
{
    /* Create a Global Environment */
    env = new Environment() ;

    params = env ;

    var canvas_1 = document.getElementById("canvas_1") ;
    canvas_1.width = env.dispWidth ;
    canvas_1.height= env.dispHeight ;

    /* full phase-field texture */
    env.fphaseTxt = new Abubu.ImageTexture(structure) ;

    env.width = params.fphaseTxt.width ;
    env.height= params.fphaseTxt.height ;

/*------------------------------------------------------------------------
 * stats
 *------------------------------------------------------------------------
 */
    env.stats   = new Stats() ;
    document.body.appendChild( env.stats.domElement ) ;

/*------------------------------------------------------------------------
 * coordinates
 *------------------------------------------------------------------------
 */
    env.crdtTxt  = new Abubu.FloatRenderTarget(
            env.width,
            env.height
    ) ;
    env.coordinator  = new Abubu.Solver( {
        vertexShader    : vertShader.value ,
        fragmentShader  : crdtShader.value ,
        uniforms : {
            mx  : {
                type    : 'f',
                value   : env.mx
            } ,
            my : {
                type    : 'f',
                value   : env.my ,
            } ,
        } ,
        renderTargets : {
            crdt    : {
                location    : 0 ,
                target      : env.crdtTxt ,
            }
        } ,
    } ) ;
    env.coordinator.render() ;

/*------------------------------------------------------------------------
 * set textures of calculation
 *------------------------------------------------------------------------
 */
    env.ftrgt = new Abubu.FloatRenderTarget(
        env.width  ,
        env.height
    ) ;

    env.strgt = new Abubu.FloatRenderTarget(
        env.width  ,
        env.height
    ) ;
    
    env.flmt    = new Abubu.FloatRenderTarget(
            env.width, env.height ) ;
    env.nsewAvgTxt = new Abubu.FloatRenderTarget(
        env.width ,
        env.height
    ) ;

    env.updnAvgTxt = new Abubu.FloatRenderTarget(
        env.width ,
        env.height
    ) ;

/*------------------------------------------------------------------------
 * init
 *------------------------------------------------------------------------
 */
    env.init = new Abubu.Solver({
        vertexShader    : vertShader.value ,
        fragmentShader  : initShader.value ,
        uniforms :{
            crdtTxt : { type: 't', value: env.crdtTxt } ,
            phaseTxt    : {
                type    : 't', 
                value   : env.fphaseTxt ,
            } ,

        },
        renderTargets   : {
            outFvcxf    : {
                location: 0 ,
                target  : env.ftrgt,
            } ,
            outSvcxf    : {
                location: 1 ,
                target  : env.strgt,
            } ,
        } ,
        clear   : true
    } ) ;

    env.init.render() ;

    env.initialize = function(){
        env.time = 0. ;
        env.init.render() ;
    }

/*------------------------------------------------------------------------
 * pAvg
 *------------------------------------------------------------------------
 */
    env.calcPhaseAvg = new Abubu.Solver({
        vertexShader    : vertShader.value ,
        fragmentShader  : pAvgShader.value ,
        uniforms        : {
            domainResolution  : {
                type    : 'v3' ,
                value   : env.domainResolution
            } ,
            mx  : { 
                type    : 'f',
                value   : env.mx ,
            } , 
            my  : { 
                type    : 'f',
                value   : env.my ,
            } ,
            crdtTxt     : {
                type    : 't', 
                value   : env.crdtTxt ,
            } ,
            phaseTxt    : {
                type    : 't', 
                value   : env.fphaseTxt ,
            } ,
        } ,
        renderTargets   : {
            nsew    : {
                location: 0 ,
                target  : env.nsewAvgTxt
            } ,
            updn    : {
                location: 1,
                target  : env.updnAvgTxt
            } ,
        } ,
        clear : true ,
    } ) ;

    env.calcPhaseAvg.render() ;
        
/*------------------------------------------------------------------------
 * comp1 and comp2
 *------------------------------------------------------------------------
 */
    env.compUniforms    = function(_inTrgt){
        /* Variable Texture Inputs */
        this.inTrgt     = { type : 't' , value : _inTrgt        } ;
        
        /* Domain Related */
        this.domainResolution = {
            type    : 'v3' ,
            value   : env.domainResolution
        } ;
        this.domainSize = { type : 'v3', value : env.domainSize } ;
        this.mx         = { type : 'f' , value : env.mx         } ;
        this.my         = { type : 'f' , value : env.my         } ;
        this.crdtTxt    = { type : 't' , value : env.crdtTxt    } ;
        this.phaseTxt   = { type : 't' , value : env.fphaseTxt  } ;
        this.nsewAvgTxt = { type : 't' , value : env.nsewAvgTxt } ;
        this.updnAvgTxt = { type : 't' , value : env.updnAvgTxt } ;
        this.dt         = { type : 'f' , value : env.dt         } ;
        this.diffCoef   = { type : 'f' , value : env.diffCoef   } ;
        this.C_m        = { type : 'f' , value : env.C_m        } ;
        
        this.tau_pv     = { type : 'f',     value : env.tau_pv      } ; 
        this.tau_v1     = { type : 'f',     value : env.tau_v1      } ;     
        this.tau_v2     = { type : 'f',     value : env.tau_v2      } ; 
        this.tau_pw     = { type : 'f',     value : env.tau_pw      } ; 
        this.tau_mw     = { type : 'f',     value : env.tau_mw      } ; 
        this.tau_d      = { type : 'f',     value : env.tau_d       } ; 
        this.tau_0      = { type : 'f',     value : env.tau_0       } ; 
        this.tau_r      = { type : 'f',     value : env.tau_r       } ;
        this.tau_si     = { type : 'f',     value : env.tau_si      } ;
        this.K          = { type : 'f',     value : env.K           } ;
        this.V_sic      = { type : 'f',     value : env.V_sic       } ; 
        this.V_c        = { type : 'f',     value : env.V_c         } ;
        this.V_v        = { type : 'f',     value : env.V_v         } ;
        this.C_si       = { type : 'f',     value : env.C_si        } ;

    } ;

    env.compTargets = function(_outTrgt ){
        this.outTrgt    = { location: 0, target: _outTrgt       } ;
    } ;

    env.comp1Uniforms   = new env.compUniforms( env.ftrgt ) ;
    env.comp1Targets    = new env.compTargets(  env.strgt ) ;

    env.comp2Uniforms   = new env.compUniforms( env.strgt ) ;
    env.comp2Targets    = new env.compTargets(  env.ftrgt ) ;

    env.comp1 = new Abubu.Solver({
        vertexShader    : vertShader.value ,
        fragmentShader  : compShader.value ,
        uniforms        : env.comp1Uniforms ,
        renderTargets   : env.comp1Targets,
        clear: false ,
    } ) ;
    env.comp2 =  new Abubu.Solver({
        vertexShader    : vertShader.value ,
        fragmentShader  : compShader.value ,
        uniforms        : env.comp2Uniforms ,
        renderTargets   : env.comp2Targets ,
        clear :false ,
    } ) ;

/*------------------------------------------------------------------------
 * VolumeRayCaster
 *------------------------------------------------------------------------
 */
    env.vrc = new Abubu.VolumeRayCaster({
        target          :  env.ftrgt,//fphaseTxt,
        prev            :  env.strgt,
        usePhaseField   : false,
        phaseField      : env.fphaseTxt,
        canvas          : canvas_1,
        scale           : 0.7 ,
        channel         : 'r' ,
        noSteps         : env.noSteps,
        mx              : env.mx,
        my              : env.my ,
        rayCast         : env.rayCast ,
        showXCut        : env.showXCut ,
        showYCut        : env.showYCut ,
        showZCut        : env.showZCut ,
        drawFilament    : env.drawFilament ,
        xLevel          : env.xLevel,
        yLevel          : env.yLevel,
        zLevel          : env.zLevel,
        filamentThickness: 2,
        filamentThreshold: 0.6,
        filamentColor   : [1.,1.,1.,1.],
        minValue        : env.minVrcValue ,
        maxValue        : env.maxVrcValue ,
        threshold       : env.minVrcValue ,
        pointLights     : [ //3,3,3,
                            //-3,-3,-3,
                            //10,10,10,
                            //-10,-10,10,
                        ],
        lightShift      : env.lightShift , 
        floodLights     : [1.,1.,1.,
                            0.,0.,1,
                            -1,0.,0,
                            0,1,0,
                            0,-1,0,],
        alphaCorrection : env.alphaCorrection ,
        colorbar        : true ,
        colormap        : env.colormap,
        unit            : ''
    } ) ;
    env.vrc.addMessage(
        '3D Three Variable Minimal Model',
        0.5,
        0.05,
        {
            font: "italic 11pt Arial",
            style: "#000000",
            align : "center"
        }
    ) ;
    env.vrc.addMessage(
        'Use Ctrl+Drag to Excite Tissue',
        0.5,
        0.1,
        {
            font: "9pt Arial",
            style: "#000000",
            align : "center"
        }
    ) ;
    env.vrc.initForeground() ;

/*------------------------------------------------------------------------
 * click
 *------------------------------------------------------------------------
 */
    env.click = new Abubu.Solver({
        vertexShader    :   vertShader.value,
        fragmentShader  :   clickShader.value ,
        uniforms    :{
            clickCoordinates    : {
                type    :   't',
                value   :   env.vrc.clickCoordinates
            } ,
            clickRadius : {
                type    : 'f' ,
                value   : env.clickRadius,
            } ,
            clickValue  : {
                type    : 'f',
                value   : 1 ,
            } ,
            crdtTxt     : {
                type    : 't',
                value   : env.crdtTxt ,
            } ,
            phaseTxt    : {
                type    : 't',
                value   : env.fphaseTxt ,
            } ,
            target      : {
                type    : 't',
                value   : env.ftrgt,
            } ,
        } ,
        renderTargets:{
            FragColor   : {
                location : 0 ,
                target  : env.strgt ,
            } ,
        },
    } ) ;

    env.copyClickValues = new Abubu.Copy( env.strgt, env.ftrgt ) ;

/*------------------------------------------------------------------------
 * adding event listeners
 *------------------------------------------------------------------------
 */
    env.ctrlClick = new Abubu.CtrlClickListener(
       canvas_1,
       function(e){
            env.vrc.updateClickPosition(e.position) ;
            env.click.render() ;
            env.copyClickValues.render() ;
       },
       {    mousemove : true ,}
    ) ;

    env.dbleClick = new Abubu.DoubleClickListener(
            canvas_1,
            function(e){
                env.vrc.updateClickPosition(e.position) ;
                env.click.render() ;
                env.copyClickValues.render() ;
    } ) ;
/*------------------------------------------------------------------------
 * rendering function
 *------------------------------------------------------------------------
 */
    env.render = function(){
        if (env.running){
            for(var i=0; i<(env.frameRate/120); i++){
                env.comp1.render() ;
                env.comp2.render() ;
                env.time += env.dt*2.0 ;
                env.stats.update() ;
                env.stats.update() ;
            }
        }
    //    env.filament.render() ;
        env.vrc.render() ;
        requestAnimationFrame(env.render) ;
    }

/*------------------------------------------------------------------------
 * create gui and run
 *------------------------------------------------------------------------
 */
    createGui() ;
    env.render() ;

/*------------------------------------------------------------------------
 * adding environment to document
 *------------------------------------------------------------------------
 */
    document.env = env;

}/*  End of loadWebGL  */
/*@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
 * End of require()
 *@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
 */
loadWebGL() ;
} ) ;
