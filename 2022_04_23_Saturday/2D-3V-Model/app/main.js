/*@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
 * WEBGL 2.0    :   2D 3-Variable Model 
 *
 * PROGRAMMER   :   ABOUZAR KABOUDIAN
 * DATE         :   Thu 28 Sep 2017 11:33:48 AM EDT 
 * PLACE        :   Chaos Lab @ GaTech, Atlanta, GA
 *@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
 */
define([    'require',
            'shader!vertShader.vert',
            'shader!initShader.frag',
            'shader!compShader.frag',
            'shader!paceShader.frag',
            'shader!clickShader.frag',
            'shader!bvltShader.frag',
            ],
function(   require,
            vertShader,
            initShader,
            compShader,
            paceShader,
            clickShader,
            bvltShader,
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
    gui.mdlPrmFldr.add( env, 'paramType',
                        [   'set_01',
                            'set_02',
                            'set_03',
                            'set_04',
                            'set_05',
                            'set_06',
                            'set_07',
                            'set_08',
                            'set_09',
                            'set_10'    ] ).name('Set No.').onChange(changeParamType) ;

    addCoeficients(     gui.mdlPrmFldr, ['C_m', 'diffCoef'] ,
                        [env.comp1,env.comp2], {min:0}) ;

    addCoeficients( gui.mdlPrmFldr, [
                        'tau_pv',
                        'tau_v1',
                        'tau_v2',
                        'tau_pw',
                        'tau_mw',
                        'tau_d' ,
                        'tau_0' ,
                        'tau_r' ,
                        'tau_si',
                        'K'     ,
                        'V_sic' ,
                        'V_c'   ,
                        'V_v'   ,
                        'C_si'  ,
                    ] ,
                    [env.comp1,env.comp2 ] ) ;
    changeParamType() ;

/*------------------------------------------------------------------------
 * Solver Parameters
 *------------------------------------------------------------------------
 */
    gui.slvPrmFldr  = gui.addFolder( 'Solver Parameters' ) ;
    gui.slvPrmFldr.add( env,'boundaryCondition', 
            [ 'periodic', 'no_flux' ])
        .onChange(setBC) ;
    gui.slvPrmFldr.add( env, 'dt').name('Delta t').onChange(
         function(){
            Abubu.setUniformInSolvers('dt', env.dt,
                    [env.comp1,env.comp2 ]) ;

            env.tvsx.dt = env.dt ;
         }
    );

    gui.slvPrmFldr.add( env, 'ds_x' ).name( 'Domain size-x').onChange(
        function(){
            Abubu.setUniformInSolvers('ds_x', env.ds_x,
                    [env.comp1,env.comp2 ]) ;
            env.disp2.xticks.max = env.ds_x ;
            refreshDisplay() ;
        }
    ) ;
    gui.slvPrmFldr.add( env, 'ds_y' ).name( 'Domain size-y').onChange(
        function(){
            Abubu.setUniformInSolvers('ds_y', env.ds_y,
                    [env.comp1,env.comp2 ]) ;
        }
    ) ;

    gui.slvPrmFldr.add( env, 'width').name( 'x-resolution' )
    .onChange( function(){
        Abubu.resizeRenderTargets(
                [fvfs,svfs], env.width, env.height);
    } ) ;

    gui.slvPrmFldr.add( env, 'height').name( 'y-resolution' )
    .onChange( function(){
        Abubu.resizeRenderTargets(
            [
                env.fvfs,
                env.svfs
            ],
            env.width,
            env.height);
    } ) ;

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

    gui.dspPrmFldr.add( env, 'probeVisiblity').name('Probe Visiblity')
        .onChange(function(){
            env.disp.setProbeVisiblity(env.probeVisiblity);
            refreshDisplay() ;
        } ) ;
    gui.dspPrmFldr.add( env, 'frameRate').name('Frame Rate Limit')
        .min(60).max(40000).step(60)

    gui.dspPrmFldr.add( env, 'timeWindow').name('Signal Window [ms]')
    .onChange( function(){
        env.plot.updateTimeWindow(env.timeWindow) ;
        env.tvsx.timeWindow = env.timeWindow ;
        env.disp2.yticks.max = env.timeWindow ;
        refreshDisplay() ;
    } ) ;

/*------------------------------------------------------------------------
 * tipt
 *------------------------------------------------------------------------
 */
    gui.tptPrmFldr = gui.dspPrmFldr.addFolder( 'Tip Trajectory') ;
    gui.tptPrmFldr.add( env, 'tiptVisiblity' )
        .name('Plot Tip Trajectory?')
        .onChange(function(){
            env.disp.setTiptVisiblity(env.tiptVisiblity) ;
            refreshDisplay() ;
        } ) ;
    gui.tptPrmFldr.add( env, 'tiptThreshold').name( 'Threshold [mv]')
        .onChange( function(){
                env.disp.setTiptThreshold( env.tiptThreshold ) ;
                } ) ;
    gui.tptPrmFldr.open() ;

    gui.dspPrmFldr.open() ;

/*------------------------------------------------------------------------
 * save
 *------------------------------------------------------------------------
 */
    var svePrmFldr = gui.addFolder('Save Canvases') ;
    svePrmFldr.add( env, 'savePlot2DPrefix').name('File Name Prefix') ;
    svePrmFldr.add( env, 'savePlot2D' ) ;
    
    svePrmFldr.open() ;
/*------------------------------------------------------------------------
 * Inteval Caller
 *------------------------------------------------------------------------
 */
    var intFldr = gui.addFolder( 'Interval Caller' ) ;
    intFldr.add(env, 'autocall').name('Active?')
        .onChange(function(){
                env.intervalCaller.setActivity(env.autocall);
                } ) ;
    intFldr.add(env, 'autoCallback').name('Callback')
        .onChange(function(){
                env.intervalCaller.setCallback(function(){
                        try{ eval(env.autoCallback); }
                        catch(e){log('Error in Interval Caller'); log(e);} } ) } );
    intFldr.add(env, 'autocallInterval').name('interval')
        .onChange(function(){
                env.intervalCaller
                    .setInterval(env.autocallInterval)
                    } ) ;
    intFldr.open() ;
        
/*------------------------------------------------------------------------
 * Save and Load 
 *------------------------------------------------------------------------
 */
    env.save = function(){
        Abubu.saveToXML({
                fileName : env.filename + '.xml' ,
                obj     : env,
                names   : saveList } ) ;
        Abubu.saveCanvas ( 'canvas_1',
                {
                    prefix  : env.filename ,
                    postfix : '_full_domain' ,
                    format: 'png' } ) ;

        Abubu.saveCanvas ( 'canvas_2',
                {
                    prefix  : env.filename ,
                    postfix : '_midplane' ,
                    format: 'png' } ) ;
        Abubu.saveCanvas ( 'canvas_3',
                {
                    prefix  : env.filename ,
                    postfix : '_signal' ,
                    format: 'png' } ) ;

    } ;

    env.input = document.createElement('input') ;
    env.input.setAttribute('type', 'file' ) ;
    env.input.onchange = function(){
        Abubu.loadFromXML({
            input   : env.input ,
            obj     : env ,
            names   : saveList,
            callback : function(){
                env.gui.update();
             } ,
        } ) ;
    } ;

    gui.save = gui.addFolder('Save and Load') ;
    gui.save.add( env.input, 'click' ).name('Load XML file') ;
    gui.save.add( env, 'comment'  ) ;
    gui.save.add( env, 'filename' ).name('File Name') ;
    gui.save.add( env, 'save' ) ;
    gui.save.open() ;

/*------------------------------------------------------------------------
 * Simulation
 *------------------------------------------------------------------------
 */
    gui.smlPrmFldr  = gui.addFolder(    'Simulation'    ) ;
    gui.smlPrmFldr.add( env,  'clickRadius' )
        .min(0.01).max(1.0).step(0.01)
        .name('Click Radius')
        .onChange(function(){
                env.click.setUniform('clickRadius',env.clickRadius) ;
                } ) ;
    gui.smlPrmFldr.add( env,
        'clicker',
        [   'Conduction Block',
            'Pace Region',
            'Signal Loc. Picker',
            'Autopace Loc. Picker'  ] ).name('Clicker Type') ;

    gui.smlPrmFldr.add( env, 'time').name('Solution Time [ms]').listen() ;

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

var saveList = [ 'comment', 
    'filename',
    'time',
    'C_m',
    'diffCoef',
    'tau_pv', 
    'tau_v1', 
    'tau_v2', 
    'tau_pw', 
    'tau_mw', 
    'tau_d' , 
    'tau_0' , 
    'tau_r' , 
    'tau_si', 
    'K'     , 
    'V_sic' , 
    'V_c'   , 
    'V_v'   ,
    'C_si'  ,
    'width' ,
    'height',
    'ds_x'  ,
    'ds_y'  ,
    'dt'    ,
    'boundaryCondition',
    'timeWindow'] ;

/*------------------------------------------------------------------------
 * changeParamType
 *------------------------------------------------------------------------
 */
function changeParamType(){
    var paramVals = [] ;
    switch (params['paramType']){
        case 'set_01':
            env.tau_pv      = 3.33    ;
            env.tau_v1      = 19.6    ;
            env.tau_v2      = 1000    ;
            env.tau_pw      = 667     ;
            env.tau_mw      = 11      ;
            env.tau_d       = 0.42    ;
            env.tau_0       = 8.3     ;
            env.tau_r       = 50      ;
            env.tau_si      = 45      ;
            env.K           = 10      ;
            env.V_sic       = 0.85    ;
            env.V_c         = 0.13    ;
            env.V_v         = 0.055   ;
            env.C_si        = 1.0     ;
            break ;
        case 'set_02':
            env.tau_pv      = 10.0    ;
            env.tau_v1      = 10.0    ;
            env.tau_v2      = 10.0    ;
            env.tau_pw      = 667     ;
            env.tau_mw      = 11      ;
            env.tau_d       = 0.25     ;
            env.tau_0       = 10.0     ;
            env.tau_r       = 190      ;
            env.tau_si      = 45      ;
            env.K           = 10      ;
            env.V_sic       = 0.85    ;
            env.V_c         = 0.13    ;
            env.V_v         = 0.055   ;
            env.C_si        = 0.0     ;
            break ;
        case 'set_03':
            env.tau_pv      = 3.33    ;
            env.tau_v1      = 19.6    ;
            env.tau_v2      = 1250    ;
            env.tau_pw      = 870     ;
            env.tau_mw      = 41      ;
            env.tau_d       = 0.25    ;    
            env.tau_0       = 12.5    ;
            env.tau_r       = 33.33   ;
            env.tau_si      = 29      ;
            env.K           = 10      ;
            env.V_sic       = 0.85    ;
            env.V_c         = 0.13    ;
            env.V_v         = 0.04    ;
            env.C_si        = 1.0     ;
            break ;
        case 'set_04':
            env.tau_pv      =  3.33    ;
            env.tau_v1      =  15.6    ;
            env.tau_v2      =  5       ;
            env.tau_pw      =  350     ;
            env.tau_mw      =  80      ;
            env.tau_d       =  0.407   ;
            env.tau_0       =  9       ;
            env.tau_r       =  34      ;
            env.tau_si      =  26.5    ;
            env.K           =  15      ;
            env.V_sic       =  0.45    ;
            env.V_c         =  0.15    ;
            env.V_v         =  0.04    ;
            env.C_si        =  1.00    ;
            break ;
        case 'set_05':
            env.tau_pv      =  3.33    ;
            env.tau_v1      =  12      ;
            env.tau_v2      =  2       ;
            env.tau_pw      =  1000    ;
            env.tau_mw      =  100     ;
            env.tau_d       =  0.362   ;
            env.tau_0       =  5       ;
            env.tau_r       =  33.33   ;
            env.tau_si      =  29      ;
            env.K           =  15      ;
            env.V_sic       =  0.70    ;
            env.V_c         =  0.13    ;
            env.V_v         =  0.04    ;
            env.C_si        =  1.00    ;
            break ;
        case 'set_06':
            env.tau_pv      =  3.33    ;
            env.tau_v1      =  9       ;
            env.tau_v2      =  8       ;
            env.tau_pw      =  250     ;
            env.tau_mw      =  60      ;
            env.tau_d       =  0.395   ;
            env.tau_0       =  9       ;
            env.tau_r       =  33.33   ;
            env.tau_si      =  29      ;
            env.K           =  15      ;
            env.V_sic       =  0.50    ;
            env.V_c         =  0.13    ;
            env.V_v         =  0.04    ;
            env.C_si        =  1.00    ;
            break ;
        case 'set_07':
            env.tau_pv      =  10      ;
            env.tau_v1      =  7       ;
            env.tau_v2      =  7       ;
            env.tau_pw      =  250     ;
            env.tau_mw      =  60      ;
            env.tau_d       =  0.25    ;
            env.tau_0       =  12      ;
            env.tau_r       =  100     ;
            env.tau_si      =  29      ;
            env.K           =  15      ;
            env.V_sic       =  0.50    ;
            env.V_c         =  0.13    ;
            env.V_v         =  0.04    ;
            env.C_si        =  0.00    ;
            break ;

        case 'set_08':
            env.tau_pv      =  13.03   ;
            env.tau_v1      =  19.6    ;
            env.tau_v2      =  1250    ;
            env.tau_pw      =  800     ;
            env.tau_mw      =  40      ;
            env.tau_d       =  0.45    ;
            env.tau_0       =  12.5    ;
            env.tau_r       =  33.25   ;
            env.tau_si      =  29      ;
            env.K           =  10      ;
            env.V_sic       =  0.85    ;
            env.V_c         =  0.13    ;
            env.V_v         =  0.04    ;
            env.C_si        =  1.00    ;
            break ;
        case 'set_09':
            env.tau_pv      =  3.33    ;
            env.tau_v1      =  15      ;
            env.tau_v2      =  2       ;
            env.tau_pw      =  670     ;
            env.tau_mw      =  61      ;
            env.tau_d       =  0.25    ;
            env.tau_0       =  12.5    ;
            env.tau_r       =  28      ;
            env.tau_si      =  29      ;
            env.K           =  10      ;
            env.V_sic       =  0.45    ;
            env.V_c         =  0.13    ;
            env.V_v         =  0.05    ;
            env.C_si        =  1.00    ;
            break ;
        case 'set_10':
            env.tau_pv      =  10      ;
            env.tau_v1      =  40      ;
            env.tau_v2      =  333     ;
            env.tau_pw      =  1000    ;
            env.tau_mw      =  65      ;
            env.tau_d       =  0.115   ;
            env.tau_0       =  12.5    ;
            env.tau_r       =  25      ;
            env.tau_si      =  22.22   ;
            env.K           =  10      ;
            env.V_sic       =  0.85    ;
            env.V_c         =  0.13    ;
            env.V_v         =  0.025   ;
            env.C_si        =  1.00    ;
            break ;
    } /* End of switch */

    var paramList = [
                'tau_pv', 
                'tau_v1', 
                'tau_v2', 
                'tau_pw', 
                'tau_mw', 
                'tau_d' , 
                'tau_0' , 
                'tau_r' , 
                'tau_si', 
                'K'     , 
                'V_sic' , 
                'V_c'   , 
                'V_v'   ,
                'C_si'
            ] ;

    Abubu.setUniformsInSolvers( paramList, [
        env.tau_pv , 
        env.tau_v1 , 
        env.tau_v2 , 
        env.tau_pw , 
        env.tau_mw , 
        env.tau_d  , 
        env.tau_0  , 
        env.tau_r  , 
        env.tau_si , 
        env.K      , 
        env.V_sic  , 
        env.V_c    , 
        env.V_v    , 
        env.C_si   ] , [env.comp1, env.comp2 ] ) ; 
    for(var i=0; i<gui.mdlPrmFldr.__controllers.length;i++){
        gui.mdlPrmFldr.__controllers[i].updateDisplay() ;
    }


}
/*========================================================================
 * Environment
 *========================================================================
 */
function Environment(){
    this.running = false ;

    /* Model Parameters         */
    this.C_m        = 1.0 ;
    this.diffCoef   = 0.001 ;

    this.minVlt     = -90 ;
    this.maxVlt     = 30 ;

    /* time coeficients         */
    this.paramType   = 'set_04' ;
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

    /* Display Parameters       */
    this.colormap    =   'rainbowHotSpring';
    this.dispWidth   =   512 ;
    this.dispHeight  =   512 ;
    this.frameRate   =   2400 ;
    this.timeWindow  =   1000 ;
    this.probeVisiblity = false ;

    this.tiptVisiblity= false ;
    this.tiptThreshold=  .5 ;
    this.tiptColor    = "#FFFFFF";

    /* Solver Parameters        */
    this.width       =   512 ;
    this.height      =   512 ;
    this.dt          =   1.e-1 ;
    this.cfl         =   1.0 ;
    this.ds_x        =   18 ;
    this.ds_y        =   18 ;
    
    this.boundaryCondition = 'periodic' ;

    /* Autopace                 */
    this.pacing      = false ;
    this.pacePeriod  = 300 ;
    this.autoPaceRadius= 0.01 ;

    /* Solve                    */
    this.solve       = function(){
        this.running = !this.running ;
        return ;
    } ;
    this.time        = 0.0 ;
    this.clicker     = 'Pace Region';

    this.autoBreakThreshold = -40 ;
    //this.bvltNow     = breakVlt ;
    this.ry          = 0.5 ;
    this.lx          = 0.5 ;
    this.autobreak   = true ;

    this.autostop    = false;
    this.autostopInterval = 300 ;

    this.savePlot2DPrefix = '' ;
    this.savePlot2D    = function(){
        //this.running = false ;
        var prefix ;
        try{
            prefix = eval(env.savePlot2DPrefix) ;
        }catch(e){
            prefix = this.savePlot2DPrefix ;
        }
        Abubu.saveCanvas( 'canvas_1',
        {
            prefix  : prefix,
            format  : 'png'
        } ) ;
    }

    /* Clicker                  */
    this.clickRadius     = 0.1 ;
    this.clickPosition   = [0.5,0.5] ;
    this.conductionValue = [1.,0,0,0] ;
    this.paceValue       = [1.,0,0,0] ;
    

    /* intervalCaller */
    this.autocall = false ;
    this.autoCallback = '' ;
    this.autocallInterval = 300 ;

    this.filename = '' ;
    this.comment  = '' ;
}
/*========================================================================
 * setBC
 *========================================================================
 */ 
function setBC(){
    if ( env.boundaryCondition == 'periodic' ){
                    env.comp1.uniforms.inVfs.wrapS = 'repeat' ;
                    env.comp1.uniforms.inVfs.wrapT = 'repeat' ;
                    env.comp2.uniforms.inVfs.wrapS = 'repeat' ;
                    env.comp2.uniforms.inVfs.wrapT = 'repeat' ;
                }else{
                    env.comp1.uniforms.inVfs.wrapS = 'clamp_to_edge' ;
                    env.comp1.uniforms.inVfs.wrapT = 'clamp_to_edge' ;
                    env.comp2.uniforms.inVfs.wrapS = 'clamp_to_edge' ;
                    env.comp2.uniforms.inVfs.wrapT = 'clamp_to_edge' ;
                }
}  ;

/*========================================================================
 * Initialization of the GPU and Container
 *========================================================================
 */
function loadWebGL()
{
    var canvas_1 = document.getElementById("canvas_1") ;
    var canvas_2 = document.getElementById("canvas_2") ;
    var canvas_3 = document.getElementById("canvas_3") ;

    canvas_1.width  = 512 ;
    canvas_1.height = 512 ;

    env = new Environment() ;
    params = env ;
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
    env.fvfs     = new Abubu.FloatRenderTarget(512, 512) ;
    env.svfs     = new Abubu.FloatRenderTarget(512, 512) ;

/*------------------------------------------------------------------------
 * init solver to initialize all textures
 *------------------------------------------------------------------------
 */
    env.init  = new Abubu.Solver( {
       fragmentShader  : initShader.value ,
       vertexShader    : vertShader.value ,
       renderTargets   : {
           outFvfs    : { location : 0, target: env.fvfs     } ,
           outSvfs    : { location : 1, target: env.svfs     } ,
       }
    } ) ;

/*------------------------------------------------------------------------
 * comp1 and comp2 solvers for time stepping
 *------------------------------------------------------------------------
 */
    env.compUniforms = function(_inVfs ){
        this.inVfs      = { type : 's',     value   : _inVfs  ,
            wrapS : 'repeat', wrapT: 'repeat' } ;
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
        
        this.ds_x        = { type : 'f',     value   : env.ds_x     } ;
        this.ds_y        = { type : 'f',     value   : env.ds_y     } ;
        this.diffCoef    = { type : 'f',     value   : env.diffCoef } ;
        this.C_m         = { type : 'f',     value   : env.C_m      } ;
        this.dt          = { type : 'f',     value   : env.dt       } ;

    } ;

    env.compTargets = function(_outVfs){
        this.outVfs = { location : 0  , target :  _outVfs     } ;
    } ;

    env.comp1 = new Abubu.Solver( {
        fragmentShader  : compShader.value,
        vertexShader    : vertShader.value,
        uniforms        : new env.compUniforms( env.fvfs    ) ,
        renderTargets   : new env.compTargets(  env.svfs    ) ,
    } ) ;

    env.comp2 = new Abubu.Solver( {
        fragmentShader  : compShader.value,
        vertexShader    : vertShader.value,
        uniforms        : new env.compUniforms( env.svfs    ) ,
        renderTargets   : new env.compTargets(  env.fvfs    ) ,
    } ) ;

/*------------------------------------------------------------------------
 * Time vs X plot 
 *------------------------------------------------------------------------
 */
    env.tvsx = new Abubu.Tvsx({
            ftarget : env.fvfs , 
            starget : env.svfs , 
            timeWindow : env.timeWindow ,
            dt      : env.dt ,
            refresh : true ,
            defaltVal: [0.,0.,0.,0.] ,
            yLevel  : 0.5 
    } ) ;

/*------------------------------------------------------------------------
 * click solver
 *------------------------------------------------------------------------
 */
    env.click = new Abubu.Solver( {
        vertexShader    : vertShader.value ,
        fragmentShader  : clickShader.value ,
        uniforms        : {
            map             : { type: 't',  value : env.fvfs           } ,
            clickValue      : { type: 'v4', value : 
                new Float32Array(1,0,0,0)         } ,
            clickPosition   : { type: 'v2', value : env.clickPosition  } ,
            clickRadius     : { type: 'f',  value : env.clickRadius    } ,
        } ,
        renderTargets   : {
            FragColor   : { location : 0,   target : env.svfs      } ,
        } ,
        clear           : true ,
    } ) ;
    env.clickCopy = new Abubu.Copy(env.svfs, env.fvfs ) ;

/*------------------------------------------------------------------------
 * pace
 *------------------------------------------------------------------------
 */
    env.pace = new Abubu.Solver({
            fragmentShader  : paceShader.value,
            vertexShader    : vertShader.value,
            uniforms        : {
                inVcxf      : { type: 't', value : env.svfs },
                } ,
            renderTargets: {
                outVcxf : {location : 0 , target : env.fvfs }
                }
            } ) ;

/*------------------------------------------------------------------------
 * Signal Plot
 *------------------------------------------------------------------------
 */
    env.plot = new Abubu.SignalPlot( {
            noPltPoints : 1024,
            grid        : 'on' ,
            nx          : 5 ,
            ny          : 7 ,
            xticks : { mode : 'auto', unit : 'ms', font:'11pt Times'} ,
            yticks : { mode : 'auto', unit : '', precision : 1 } ,
            canvas      : canvas_3,
            legend      : {visible: true , place: 'top-right', 
                location : [0.15,0.05],
                font :"bold 14pt Times",
                length: 0.1} ,

    });

//    env.plot.addMessage(    'Scaled Membrane Potential at the Probe',
//                        0.5,0.05,
//                    {   font : "12pt Times" ,
//                        align: "center"                          } ) ;
//
    env.vsgn = env.plot.addSignal( env.fvfs, {
            channel : 'r',
            name : 'membrane potential',
            minValue : -0.2 ,
            maxValue : 1.2 ,
            restValue: 0,
            color : [0.5,0,0],
            visible: true,
            linewidth : 3,
            timeWindow: env.timeWindow,
            probePosition : [0.5,0.5] , } ) ;

    env.fsgn = env.plot.addSignal( env.fvfs, {
            channel : 'g',
            name : 'fast variable',
            minValue : -0.2 ,
            maxValue : 1.2 ,
            restValue: 0,
            color : [0.0,0.5,0],
            visible: true,
            linewidth : 3,
            timeWindow: env.timeWindow,
            probePosition : [0.5,0.5] , } ) ;

    env.ssgn = env.plot.addSignal( env.fvfs, {
            channel : 'b',
            name : 'slow variable',
            minValue : -0.2 ,
            maxValue : 1.2 ,
            restValue: 0,
            color : [0.0,0.0,0.5],
            visible: true,
            linewidth : 3,
            timeWindow: env.timeWindow,
            probePosition : [0.5,0.5] , } ) ;

/*------------------------------------------------------------------------
 * disp
 *------------------------------------------------------------------------
 */
    env.disp= new Abubu.Plot2D({
        target : env.svfs ,
        prevTarget : env.fvfs ,
        colormap : env.colormap,
        canvas : canvas_1 ,
        minValue: 0 ,
        maxValue: 1.2 ,
        tipt : false ,
        tiptThreshold : env.tiptThreshold ,
        probeVisible : false ,
        colorbar : true ,
        cblborder: 15 ,
        cbrborder: 15 ,
        unit : '',
    } );
    env.disp.hideColorbar() ;
//    env.disp.showColorbar() ;
//    env.disp.addMessage(  '3-Variable Model',
//                        0.05,   0.05, /* Coordinate of the
//                                         message ( x,y in [0-1] )   */
//                        {   font: "Bold 14pt Arial",
//                            style:"#000000",
//                            align : "start"             }   ) ;
//    env.disp.addMessage(  'Simulation by Abouzar Kaboudian @ CHAOS Lab',
//                        0.05,   0.1,
//                        {   font: "italic 10pt Arial",
//                            style: "#000000",
//                            align : "start"             }  ) ;
//
        env.disp2 = new Abubu.Plot2D({
        target : env.tvsx.texture ,
        colormap : env.colormap,
        canvas : canvas_2 ,
        minValue: 0.0 ,
        maxValue: 1.2 ,
        tipt : false ,
        tiptThreshold : env.tiptThreshold ,
        probeVisible : false ,
        colorbar : false ,
        cblborder: 25 ,
        cbrborder: 15 ,
        grid : 'on',
        gridColor : "#ffffff",
        gridDash  : [5,5],
        xticks : {  mode : 'auto', unit : 'cm', 
                    min : 0, max: env.ds_x , font:'bold 13pt Times', 
                    precision: 1,
                    offset:0.04, 
                    style:"#ffffff"         } ,
        yticks : {  mode : 'auto', unit : 'ms', 
                    max: env.timeWindow , style : "#ffffff", font:"13pt Times",
                    offset:0.01} ,

        unit : '',
    } );

    env.disp2.init() ;

/*------------------------------------------------------------------------
 * intervalCaller
 *------------------------------------------------------------------------
 */
    env.intervalCaller = new Abubu.IntervalCaller({
        interval : env.autocallInterval  ,
        callback : function(){
            try{
                eval(env.autoCallback) ;
            }catch(e){
            }
        } ,
        active : env.autocall ,
    } ) ;

/*------------------------------------------------------------------------
 * initialize
 *------------------------------------------------------------------------
 */
    env.initialize = function(){
        env.time = 0 ;
        env.paceTime = 0 ;
        env.breaked = false ;
        env.init.render() ;
        env.plot.init(0) ;
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

/*------------------------------------------------------------------------
 * rendering the program ;
 *------------------------------------------------------------------------
 */
    env.render = function(){
        if (env.running){
            for(var i=0 ; i< env.frameRate/120 ; i++){
                env.comp1.render() ;
                env.comp2.render() ;
                env.time += 2.0*env.dt ;
                env.paceTime += 2.0*env.dt ;
                stats.update();
                stats.update() ;
                env.disp.updateTipt() ;
                env.plot.update(env.time) ;
                env.tvsx.render() ;
                env.intervalCaller.call(env.time) ;
            }
           // if ((env.paceTime > 400 ) && !env.breaked){
           //     env.breaked = true ;
           //     env.paceTime = 0. ;
           //     env.pace.render() ;
           // }
            refreshDisplay();
        }
        requestAnimationFrame(env.render) ;
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
    env.disp2.render() ;
    env.plot.render() ;
}

/*========================================================================
 * onClick
 *========================================================================
 */
function onClick(e){
    env.clickPosition[0] =
        (e.clientX-canvas_1.offsetLeft) / env.dispWidth ;
    env.clickPosition[1] =  1.0-
        (e.clientY-canvas_1.offsetTop) / env.dispWidth ;

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
    case 'Conduction Block':
        env.click.setUniform('clickValue', env.conductionValue) ;
        clickSolve() ;
        requestAnimationFrame(clickSolve) ;
        break ;
    case 'Pace Region':
        env.click.setUniform('clickValue',env.paceValue) ;
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
