/*@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
 * WEBGL 2.0    :   Klausmeier model in WebGL2.0 
 *
 * PROGRAMMER   :   Yanxuan Shao
 * DATE         :   Mon 14 Aug 2017 13:32:26 PM EDT 
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
            'ComputeGL/ComputeGL'
            ], 
function(   require,
            vertShader,
            initShader,
            compShader,
            paceShader,
            clickShader,
            bvltShader,
            ComputeGL
            ){
"use strict" ;

/*========================================================================
 * Global Parameters
 *========================================================================
 */ 
var     params ;
var     gui ;
var     init, comp1, comp2, disp ;
var     paceTime ;
var     pace ;
var     stats;
var     breaked ;
var     running ;
var     wngn ;
var     init ;
var     fwn ;
var     swn ;
var     clrmp ;
var     disp ;

var     click ;
var     clickCopy ;

/*=========================================================================
 * Params
 *=========================================================================
 */
function Params(){
    this.running = false ;

    /* Model Params */
    this.a          = 2.0 ;
    this.v          = 182.5 ;
    this.m          = 0.45 ;
    this.D          = 1.0 ;

    /* Model Parameters         */

    this.minDst     = 0. ;
    this.maxDst     = 10. ;

    /* Display Parameters       */
    this.colormap    =   'chaoslab';
    this.dispWidth   =   512 ;
    this.dispHeight  =   512 ;
    this.frameRate   =   2400 ;
    this.timeWindow  =   1000 ; 
    this.probeVisiblity = false ;

    /* Solver Parameters        */
    this.width       =   256 ;
    this.height      =   256 ;
    this.dt          =   1.e-3 ;
    this.cfl         =   1.0 ;
    this.ds_x        =   100 ;
    this.ds_y        =   100 ;

    /* Autopace                 */
    this.pacing      = false ;
    this.pacePeriod  = 300 ;
    this.autoPaceRadius= 0.01 ;

    /* Solve                    */
    this.solve       = function(){ 
        params.running = !params.running ;
        return ;
    } ;
    this.init        = initialize ;
    this.time        = 0.0 ;
    this.clicker     = 'Pace Region';

    this.autoBreakThreshold = 0. ;
    this.ry          = 0.5 ;
    this.lx          = 0.5 ;
    this.autobreak   = true ;

    this.autostop    = false;
    this.autostopInterval = 300 ;

    this.savePlot2DPrefix = '' ;
    this.savePlot2D    = function(){
        this.running = false ;
        var prefix ;
        try{ 
            prefix = eval(params.savePlot2DPrefix) ;
        }catch(e){
            prefix = this.savePlot2DPrefix ;
        }
        ComputeGL.saveCanvas( 'canvas_1',
        { 
            number  : params.time ,
            postfix : '_'+params.colormap ,
            prefix  : prefix,
            format  : 'png'
        } ) ;
    } 
        
    /* Clicker                  */
    this.clickRadius     = 0.1 ;
    this.clickPosition   = [0.5,0.5] ;
    this.conductionValue = [-83.0,0,0] ;
    this.paceValue       = [0,0,0,0] ;
}

/*=========================================================================
 * createGui
 *=========================================================================
 */
function createGui(){
    gui = new dat.GUI({width:300}) ; 

/*------------------------------------------------------------------------ 
 * Time Coeficients
 *------------------------------------------------------------------------
 */
    var tcfPrmFldr = gui.addFolder( 'Time Coeficients' ) ;
    addCoeficients( tcfPrmFldr, [
                                    'a',
                                    'v',
                                    'm',
                                    'D',
                                ] ,
                    [comp1,comp2 ] ) ;
    tcfPrmFldr.open() ;
    
/*-------------------------------------------------------------------------
 * Solver Parameters
 *-------------------------------------------------------------------------
 */
    var slvPrmFldr  = gui.addFolder( 'Solver Parameters' ) ;
    slvPrmFldr.add( params, 'dt').name('Delta t').onChange(
         function(){
            ComputeGL.setUniformInSolvers('dt', params.dt, [comp1,comp2]) ;
         }
    );

    slvPrmFldr.add( params, 'ds_x' ).name( 'Domain size-x').onChange(
        function(){
            ComputeGL.setUniformInSolvers('ds_x', params.ds_x, [comp1,comp2]) ;
        }
    ) ;
    slvPrmFldr.add( params, 'ds_y' ).name( 'Domain size-y').onChange(
        function(){
            ComputeGL.setUniformInSolvers('ds_y', params.ds_y, [comp1,comp2]) ;
        }
    ) ;
    
    slvPrmFldr.add( params, 'width').name( 'x-resolution' )
    .onChange( function(){
        ComputeGL.resizeRenderTargets([fwn,swn], params.width, params.height);
    } ) ;

    slvPrmFldr.add( params, 'height').name( 'y-resolution' )
    .onChange( function(){
        ComputeGL.resizeRenderTargets([fwn,swn], params.width, params.height);
    } ) ;
	slvPrmFldr.open() ;

 /*-------------------------------------------------------------------------
 * Display Parameters
 *-------------------------------------------------------------------------
 */
    var dspPrmFldr  = gui.addFolder( 'Display Parameters' ) ;
    dspPrmFldr.add( params, 'colormap', 
            [   'chaoslab', 'red','green','blue',
                'bone', 'cool', 'copper', 'gray','hot',
                'hsv','jet','parula','pink','autumn','spring','summer', 'winter' ] )
                .onChange(  function(){
                                disp.setColormap(params.colormap);
                                refreshDisplay() ;
                            }   ).name('Colormap') ;

    dspPrmFldr.add( params, 'probeVisiblity').name('Probe Visiblity')
        .onChange(function(){
            disp.setProbeVisiblity(params.probeVisiblity);
            refreshDisplay() ;
        } ) ;
    dspPrmFldr.add( params, 'frameRate').name('Frame Rate Limit')
        .min(60).max(40000).step(60)

    dspPrmFldr.add( params, 'timeWindow').name('Signal Window [y]')
    .onChange( function(){
        refreshDisplay() ;
    } ) ;
	dspPrmFldr.open() ;
   

/*------------------------------------------------------------------------
 * save 
 *------------------------------------------------------------------------
 */
    var svePrmFldr = gui.addFolder('Save Canvases') ;
    svePrmFldr.add( params, 'savePlot2DPrefix').name('File Name Prefix') ;
    svePrmFldr.add( params, 'savePlot2D' ).name('Save Plot2D') ;

/*-------------------------------------------------------------------------
 * Simulation
 *-------------------------------------------------------------------------
 */
    var smlPrmFldr  = gui.addFolder(    'Simulation'    ) ;
    smlPrmFldr.add( params,  'clickRadius' )
        .min(0.01).max(1.0).step(0.01).name('Click Radius').onChange(function(){
                click.setUniform('clickRadius',params.clickRadius) ;
                } ) ;
    smlPrmFldr.add( params, 
        'clicker', 
        [   'Conduction Block', 
            'Pace Region', 
            'Signal Loc. Picker',
            'Autopace Loc. Picker'  ] ).name('Clicker Type') ;

    smlPrmFldr.add( params, 'time').name('Solution Time [d]').listen() ;
    
    smlPrmFldr.add( params, 'init').name('Initialize') ;
    smlPrmFldr.add( params, 'solve').name('Solve/Pause') ;
    smlPrmFldr.open() ;
 
/*-------------------------------------------------------------------------
 * addCoeficients
 *-------------------------------------------------------------------------
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
                        ComputeGL.setUniformInSolvers(  coef, 
                                params[coef], 
                                solvers  ) ;
                        } ) ;

            return coefGui ;

        }
    }
   
    return ;
} /* End of createGui */

/*=========================================================================
 * Initialization of the GPU and Container
 *=========================================================================
 */
function loadWebGL()
{
        params = new Params() ;
        
    var canvas_1 = document.getElementById("canvas_1") ;
    var gl      = ComputeGL.gl ;
/*-------------------------------------------------------------------------
 * stats
 *-------------------------------------------------------------------------
 */
    stats       = new Stats() ;
    document.body.appendChild( stats.domElement ) ;

/*------------------------------------------------------------------------
 * defining all render targets
 *------------------------------------------------------------------------
 */
    fwn     = new ComputeGL.FloatRenderTarget(params.width, params.height) ;
    swn     = new ComputeGL.FloatRenderTarget(params.width, params.height) ;

/*-------------------------------------------------------------------------
 * Creating  peaks for initial condition
 *-------------------------------------------------------------------------
 */     
        var tab = new Float32Array(params.width*params.height*4) ;
        
        for ( var i = 0 ; i< params.width ; i++){
            for ( var j = 0 ; j<params.height ; j++){

                var indx=(i*params.height+j)*4 ;
                tab[indx    ] = 0.2 ;
                tab[indx+1  ] = 0. ;
                tab[indx+2  ] = 0. ;
                tab[indx+3  ] = 0. ;

                if ( Math.random()<0.1){
                    tab[indx+1  ] = 3. ;
                }
            }
        }
        var mtht = new ComputeGL.TableTexture(tab,params.width,params.height ) ;        
        
/*------------------------------------------------------------------------
 * init solver to initialize all textures
 *------------------------------------------------------------------------
 */ 
    init  = new ComputeGL.Solver( {
            fragmentShader  : initShader.value ,
            vertexShader    : vertShader.value ,
            uniforms    : {
                mtht    : { type : 't',     value: mtht                 } ,
            },
            renderTargets   : {
                outFwn      : { location : 0, target: fwn               } ,
                outSwn      : { location : 1, target: swn               } ,
            }
    } ) ;

/*------------------------------------------------------------------------
 * comp1 and comp2 solvers for time stepping
 *------------------------------------------------------------------------
 */
    comp1 = new ComputeGL.Solver( {
            fragmentShader  : compShader.value,
            vertexShader    : vertShader.value,
            uniforms        : {
                inWn        : { type : 's',             value   : fwn, 
                    wrapS : 'repeat', wrapT: 'repeat'                       } ,
                mtht        : { type : 't',     value   : mtht              } ,
                a           : { type : 'f',     value   : params.a          } ,
                v           : { type : 'f',     value   : params.v          } ,
                m           : { type : 'f',     value   : params.m          } ,
                D           : { type : 'f',     value   : params.D          } ,

                minDst      : { type : 'f',     value   : params.minDst     } ,
                maxDst      : { type : 'f',     value   : params.maxDst     } ,
                ds_x        : { type : 'f',     value   : params.ds_x       } ,
                ds_y        : { type : 'f',     value   : params.ds_y       } ,
                dt          : { type : 'f',     value   : params.dt         } ,
            } ,
            renderTargets   : {
                outWn           : { location : 0 , target : swn             } ,
            }
    } ) ;

    comp2 = new ComputeGL.Solver( {
            fragmentShader  : compShader.value,
            vertexShader    : vertShader.value,
            uniforms        : {
                inWn        : { type : 's',     value   : swn  , 
                    wrapS : 'repeat', wrapT: 'repeat'                       } ,
                                
                mtht        : { type : 't',     value   : mtht              } ,
                
                a           : { type : 'f',     value   : params.a          } ,
                v           : { type : 'f',     value   : params.v          } ,
                m           : { type : 'f',     value   : params.m          } ,
                D           : { type : 'f',     value   : params.D          } ,

                minDst      : { type : 'f',     value   : params.minDst     } ,
                maxDst      : { type : 'f',     value   : params.maxDst     } ,
                ds_x        : { type : 'f',     value   : params.ds_x       } ,
                ds_y        : { type : 'f',     value   : params.ds_y       } ,

                dt          : { type : 'f',     value   : params.dt         } ,
            } ,
            renderTargets   : {
                outWn       : { location : 0        , target :      fwn     } ,
            }
        } ) ;

/*------------------------------------------------------------------------
 * click solver
 *------------------------------------------------------------------------
 */
    click = new ComputeGL.Solver( {
            vertexShader    : vertShader.value ,
            fragmentShader  : clickShader.value ,
            uniforms        : {
                map         : { type: 't',  value : fwn               } ,
                clickValue   : { type: 'v4', value : [0,0,0,0 ]         } ,
                clickPosition: { type: 'v2', value : params.clickPosition    } ,
                clickRadius  : { type: 'f',  value : params.clickRadius } ,
            } ,
            renderTargets   : {
                FragColor   : { location : 0,   target : swn          } ,
            } ,
            clear           : true ,
    } ) ;
    clickCopy = new ComputeGL.Copy(swn, fwn ) ;

/*------------------------------------------------------------------------
 * pace
 *------------------------------------------------------------------------
 */
    pace = new ComputeGL.Solver({
            fragmentShader  : paceShader.value,
            vertexShader    : vertShader.value,
            uniforms        : {
                inWn      : { type: 't', value : swn },
                } ,
            renderTargets: {
                outWn : {location : 0 , target : fwn }
                } 
            } ) ;

/*------------------------------------------------------------------------
 * disp
 *------------------------------------------------------------------------
 */
    disp= new ComputeGL.Plot2D({
        target : swn ,
        channel : 'g',
        colormap : params.colormap,
        canvas : canvas_1 ,
        minValue: 0. ,
        maxValue: 10. ,
        tipt : false ,
        tiptThreshold : params.tiptThreshold ,
        probeVisible : false ,
        colorbar : true ,
        unit : 'g/(m^2)',
    } );
    disp.showColorbar() ;
    disp.addMessage(  'Klausmeier model', 
                        0.05,   0.05, /* Coordinate of the 
                                         message ( x,y in [0-1] )   */
                        {   font: "Bold 14pt Arial", 
                            style:"#ffffff", 
                            align : "start"             }   ) ;
    disp.addMessage(  'Simulation by Yanxuan Shao @ CHAOS Lab', 
                        0.05,   0.1, 
                        {   font: "italic 10pt Arial",
                            style: "ffffff",
                            align : "start"             }  ) ;

/*-------------------------------------------------------------------------
 * Render the programs
 *-------------------------------------------------------------------------
 */
   initialize() ; 

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
 * temporalRender ;
 *------------------------------------------------------------------------
 */
    function temporalRender(){
        if (params.running){
            for(var i=0 ; i< params.frameRate/120 ; i++){
                comp1.render() ;
                comp2.render() ;
                params.time += 2.0*params.dt ;
                params.paceTime += 2.0*params.dt ;
                stats.update();
                stats.update() ;
            }
            refreshDisplay();
        }
        requestAnimationFrame(temporalRender) ;
    }

    /* Call temporalRender to begin simulation */
    temporalRender();

}/*  End of loadWebGL  */ 

/*========================================================================
 * refreshDisplay
 *========================================================================
 */ 
function refreshDisplay(){
    disp.render() ;
}

/*========================================================================
 * initialize
 *========================================================================
 */ 
function initialize(){
    params.time = 0 ;
    params.paceTime = 0 ;
    params.breaked = false ;
    init.render() ;
    disp.initialize() ;
    refreshDisplay() ;
}

/*=========================================================================
 * onClick
 *=========================================================================
 */
function onClick(e){
    params.clickPosition[0] =  
        (e.clientX-canvas_1.offsetLeft) / params.dispWidth ;
    params.clickPosition[1] =  1.0-
        (e.clientY-canvas_1.offsetTop) / params.dispWidth ;

    click.setUniform('clickPosition',params.clickPosition) ;

    if (    params.clickPosition[0]   >   1.0 || 
            params.clickPosition[0]   <   0.0 || 
            params.clickPosition[1]   >   1.0 || 
            params.clickPosition[1]   <   0.0 ){
        return ;
    }
    clickRender() ;
    return ;
}

/*=========================================================================
 * Render and display click event
 *=========================================================================
 */
function clickRender(){
    switch( params['clicker']){
    case 'Conduction Block':
        click.setUniform('clickValue', params.conductionValue) ;
        clickSolve() ;
        requestAnimationFrame(clickSolve) ;
        break ;
    case 'Pace Region':
        click.setUniform('clickValue',params.paceValue) ;
        clickSolve() ;
        requestAnimationFrame(clickSolve) ;
        break ;
   case 'Signal Loc. Picker':
        disp.setProbePosition( params.clickPosition ) ;
        refreshDisplay() ;
        break ;
    case 'Autopace Loc. Picker':
        paceTime = 0 ;
    }
    return ;
}
/*=========================================================================
 * solve click event
 *=========================================================================
 */
function clickSolve(){
    click.render() ;
    clickCopy.render() ;
    refreshDisplay() ;
}

/*@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@ 
 * End of require()
 *@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
 */
loadWebGL() ;
} ) ;
