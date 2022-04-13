/*@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
 * WEBGL 2.0    :   3D- Porcine Minimal Model 
 *
 * PROGRAMMER   :   ABOUZAR KABOUDIAN
 * DATE         :   Wed 13 Jun 2018 04:22:25 PM EDT
 * PLACE        :   Chaos Lab @ GaTech, Atlanta, GA
 *@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
 */
define([    'require',
            'shader!vertShader.vert',
            'shader!crdtShader.frag',
            'shader!neighborMapShader.frag',
            'shader!initShader.frag',
            'shader!compShader.frag',
            'shader!pAvgShader.frag',
            'shader!clickShader.frag',
            'image!./structure.png',
            ],
function(   require,
            vertShader,
            crdtShader,
            neighborMapShader,
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
    env.gui = new Abubu.Gui() ;
    gui = env.gui.addPanel({width:300}) ;

/*-------------------------------------------------------------------------
 * Model Parameters
 *-------------------------------------------------------------------------
 */
    gui.mdlPrmFldr  =   gui.addFolder( 'Model Parameters'   ) ;
    addCoeficients( gui.mdlPrmFldr, [
          'diffCoef', 'C_m'                    ] , 
            [env.comp1,env.comp2], {min:0}) ;

    gui.mdlPrmFldr.close() ;
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

    gui.dispFldr.add(env, 'alphaCorrection').name('Alpha Correction').
        min(0.003).max(1.0).onChange(function(){
                env.vrc.setAlphaCorrection( env.alphaCorrection ) ;
                } ) ;
    gui.dispFldr.add(env, 'structural_alpha').min(0).max(1.).step(0.001)
        .onChange(function(){
            env.vrc.structural_alpha = env.structural_alpha ;
        } ) ;
    
    gui.dispFldr.add(env, 'noSteps').name('Number of Steps').
        min(30).max(200).step(1).onChange(function(){
                env.vrc.setNoSteps(env.noSteps) ;
        } ) ;
    gui.dispFldr.add(env, 'lightShift').step(0.05).onChange(function(){
        env.vrc.setLightShift( env.lightShift) ;
    } ) ;

    gui.dispFldr.add(env, 'frameRate').min(60).max(12000).step(60) ;
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
 * Environment : structure that holds all global variables
 *========================================================================
 */
function Environment(){
    this.width      = 2048 ;
    this.height     = 1024 ;

    this.mx         = 16 ;
    this.my         = 8 ;

    this.domainResolution   = [128,128,128] ;
    this.domainSize         = [6.14,8.0,7.31] ;

    /* time coeficients         */
    this.minVlt     = -90 ;
    this.maxVlt     = 30 ;

    /* Model Parameters         */
    this.diffCoef   = 1.E-03 ;
    this.C_m        = 1.0 ;


    this.dt         = 1.e-1 ;
    this.time       = 0 ;

    /* Display Parameters       */
    this.colormap    =   'jet';
    this.dispWidth   =   512 ;
    this.dispHeight  =   512 ;
    this.frameRate   =   2400 ;
    this.timeWindow  =   500 ;

    this.clickRadius = 0.1 ;
    this.alphaCorrection = 0.23 ;
    this.structural_alpha = 1.0 ;
    this.noSteps    = 120 ;
    this.lightShift = 1.2 ;

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

    var canvas_2 = document.getElementById('canvas_2') ;
    canvas_2.width = env.dispWidth ;
    canvas_2.height= env.dispHeight ;

/*------------------------------------------------------------------------
 * sparsePhase
 *------------------------------------------------------------------------
 */
    log('Compressing structure...') ;
    env.sparsePhase = new Abubu.SparseDataFromImage(structure, 
            { channel : 'r', threshold : 0.01 } ) ;
    log('Done!') ;
    log('Compression ratio :', env.sparsePhase.getCompressionRatio() ) ;

    env.fphaseTxt   = env.sparsePhase.full  ;
    env.cphaseTxt   = env.sparsePhase.sparse ;
    env.compMap     = env.sparsePhase.compressionMap ;
    env.dcmpMap     = env.sparsePhase.decompressionMap ;

    env.width   = params.cphaseTxt.width ;
    env.height  = params.cphaseTxt.height ;
    env.fwidth  = params.fphaseTxt.width ;      /* full-width   */
    env.fheight = params.fphaseTxt.height ;     /* full-height  */

/*------------------------------------------------------------------------
 * stats
 *------------------------------------------------------------------------
 */
    env.stats   = new Stats() ;
    document.body.appendChild( env.stats.domElement ) ;

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

    env.nsewAvgTxt = new Abubu.FloatRenderTarget(
        env.width ,
        env.height
    ) ;

    env.updnAvgTxt = new Abubu.FloatRenderTarget(
        env.width ,
        env.height
    ) ;

    env.nhshMapTxt = new Abubu.FloatRenderTarget(
        env.width ,
        env.height
    ) ;

    env.etwtMapTxt = new Abubu.FloatRenderTarget(
        env.width ,
        env.height
    ) ;

    env.updnMapTxt = new Abubu.FloatRenderTarget(
        env.width ,
        env.height
    ) ;

    env.crdtTxt  = new Abubu.FloatRenderTarget(
            env.fwidth,
            env.fheight
    ) ;
/*------------------------------------------------------------------------
 * coordinates
 *------------------------------------------------------------------------
 */
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
 * neighbors
 *------------------------------------------------------------------------
 */
    env.neighborMapper = new Abubu.Solver({
        vertexShader    : vertShader.value ,
        fragmentShader  : neighborMapShader.value ,
        uniforms        :{ 
            domainResolution : {
                type    : 'v3',
                value   : env.domainResolution 
            } ,
            mx  : {
                type    : 'f',
                value   : env.mx
            } ,
            my : {
                type    : 'f',
                value   : env.my ,
            } ,
            crdtTxt     : {
                type    : 't',
                value   : env.crdtTxt ,
            } ,
            compMap     : {
                type    : 't', 
                value   : env.compMap ,
            },
            dcmpMap     : {
                type    : 't',
                value   : env.dcmpMap ,
            }
        } ,
        renderTargets   : {
            nhshMap     : { location : 0,  target : env.nhshMapTxt } ,
            etwtMap     : { location : 1,  target : env.etwtMapTxt } ,
            updnMap     : { location : 2,  target : env.updnMapTxt } ,
        }
    } ) ;
  
    env.neighborMapper.render() ;

/*------------------------------------------------------------------------
 * init
 *------------------------------------------------------------------------
 */
    env.init = new Abubu.Solver({
        vertexShader    : vertShader.value ,
        fragmentShader  : initShader.value ,
        uniforms :{
            dcmpMap : { type: 't', value : env.dcmpMap  } ,
            crdtTxt : { type: 't', value : env.crdtTxt  } ,
        },
        renderTargets   : {
            outTrgt     : {
                location: 0 ,
                target  : env.ftrgt 
            } ,
            outSmhjd    : {
                location: 1 ,
                target  : env.strgt 
            } ,
        } ,
        clear   : true
    } ) ;

    env.init.render() ;

    env.initialize = function(){
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
            phaseTxt    : {
                type    : 't', 
                value   : env.cphaseTxt ,
            } ,
            nhshMapTxt  : {
                type    : 't',
                value   : env.nhshMapTxt,
            } ,
            etwtMapTxt  : {
                type    : 't',
                value   : env.etwtMapTxt,
            } ,
            updnMapTxt  : {
                type    : 't',
                value   : env.updnMapTxt,
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
    env.compUniforms    = function( _inTrgt){
        /* Variable Texture Inputs */
        this.inTrgt     = { type : 't' , value : _inTrgt        } ;
        
        /* Domain Related */
        this.domainResolution = {
            type    : 'v3' ,
            value   : env.domainResolution
        } ;
        this.domainSize = { type : 'v3', value : env.domainSize } ;
        this.phaseTxt   = { type : 't' , value : env.cphaseTxt  } ;
        this.nsewAvgTxt = { type : 't' , value : env.nsewAvgTxt } ;
        this.updnAvgTxt = { type : 't' , value : env.updnAvgTxt } ;
        this.dt         = { type : 'f' , value : env.dt         } ;
        this.diffCoef   = { type : 'f' , value : env.diffCoef   } ;
        this.C_m        = { type : 'f' , value : env.C_m        } ;

        /* compression and phase-field maps */
        this.nhshMapTxt = {
                type    : 't',
                value   : env.nhshMapTxt,
            } ;
        this.etwtMapTxt = {
                type    : 't',
                value   : env.etwtMapTxt,
            } ;
        this.updnMapTxt = {
                type    : 't',
                value   : env.updnMapTxt,
            } ;

    } ;

    env.compTargets = function(_outTrgt){
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
        target          : env.ftrgt ,//fphaseTxt,
        phaseField      : env.fphaseTxt,
        compressionMap  : env.compMap,
        canvas          : canvas_1,
        channel         : 'r' ,
        threshold       : 0.2 ,
        noSteps         : env.noSteps,
        mx              : env.mx,
        my              : env.my ,
        pointLights     : [ 3,3,3,
                            -3,-3,-3,
                            10,10,10,
                            -10,-10,10,
                        ],
        lightShift      : env.lightShift , 
        floodLights     : [],
        minValue        : 0.2 ,
        maxValue        : 1. ,
        alphaCorrection : env.alphaCorrection ,
        colorbar        : true ,
        colormap        : env.colormap,
        unit            : ''
    } ) ;
    env.vrc.addMessage(
        '3D Minimal Porcine Ventricular Model',
        0.5,
        0.05,
        {
            font: "italic 11pt Arial",
            style: "#000000",
            align : "center"
        }
    ) ;

    env.vrc.initForeground() ;

/*-------------------------------------------------------------------------
 * plot
 *-------------------------------------------------------------------------
 */
    env.plot = new Abubu.SignalPlot( { 
        noPltPoints : 512 ,
        grid    : 'on',
        nx : 5,
        ny : 11,
        xticks : { mode : 'auto', unit : 'ms', font:'11pt Times'} ,
        yticks : { mode : 'auto', unit : '' , precision:1} ,
        canvas : canvas_2 ,
        } ) ;
    env.plot.addMessage( "Scaled Membrane Potential at Probe",
            0.5,0.05, 
            { font: "11pt Arial", style : "#000000", align:'center' } ) ;
    env.vsgn = env.plot.addSignal( env.ftrgt, {
            channel : 'r',
            minValue : -.1 ,
            maxValue : 1.0 ,
            restValue: 0.,
            color : [0.5,0,0],
            visible: true,
            linewidth : 3,
            timeWindow: env.timeWindow,
            probePosition : [0.5,0.5] , } ) ;

    env.plot.init(0) ;
    env.plot.render() ;

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
            compMap     : {
                type    : 't',
                value   : env.compMap 
            } ,
            dcmpMap     : {
                type    : 't',
                value   : env.dcmpMap
            },
            phaseTxt    : {
                type    : 't',
                value   : env.cphaseTxt ,
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

    env.cmndClick = new Abubu.CommandClickListener(
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
    

    env.shiftClick = new Abubu.ShiftClickListener(
            canvas_1,
            function(e){
                env.vrc.updateClickPosition(e.position) ;
                env.plot.setProbePosition( env.vrc.getClickVoxelPosition() ) ;
                env.plot.init() ;
            } ) ;
    env.longClick = new Abubu.LongClickListener(
            canvas_1,
            function(e){
                env.vrc.updateClickPosition(e.position) ;
                env.plot.setProbePosition( env.vrc.getClickVoxelPosition() ) ;
                env.plot.init() ;
            } ,
            { duration : 800 } ) ;
  
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
                env.plot.update(env.time) ;
            }
        }
        env.vrc.render() ;
        env.plot.render() ;
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
