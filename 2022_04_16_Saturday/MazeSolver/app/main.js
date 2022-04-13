/*@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
 * WEBGL 2.0    :   2D 2-Variable FitzHugh Nagumo
 *
 * PROGRAMMER   :   ABOUZAR KABOUDIAN
 * DATE         :   Thu 28 Sep 2017 11:33:48 AM EDT
 * PLACE        :   Chaos Lab @ GaTech, Atlanta, GA
 *@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
 */
define([    'require',
            'AMazing',
            'jquery',
            'shader!initShader.frag',
            'shader!newsShader.frag',
            'shader!compShader.frag',
            ],
function(   require,
            AMazing,
            $,
            initShader,
            newsShader,
            compShader,
            ){
"use strict" ;

/*========================================================================
 * Global Parameters
 *========================================================================
 */
var log = console.log ;
var env ;
var gui ;
/*========================================================================
 * createGui
 *========================================================================
 */
function createGui(){
    env.gui = new Abubu.Gui() ;
    gui = env.gui ;
    var pnl = env.gui.addPanel({width : 300}) ;
/*------------------------------------------------------------------------
 * 
 *------------------------------------------------------------------------
 */
    pnl.mdlFldr = pnl.addFolder('Model Parameters') ;
    var mdlPrms = gui.addCoeficients(pnl.mdlFldr, env, 
            ['D', 'a','b','epsilon','dt' ], 
            [env.fcomp, env.scomp, env.init ] , {step:0.01}) ;
    mdlPrms.D.step(0.01) ;
    mdlPrms.a.step(0.01) ;
    mdlPrms.b.step(0.01) ;
    mdlPrms.epsilon.step(0.01) ;
    mdlPrms.dt.step(0.001) ;

    pnl.mdlFldr.open() ;
/*------------------------------------------------------------------------
 * maze
 *------------------------------------------------------------------------
 */
    pnl.maze = pnl.addFolder('Maze Setup') ;
    pnl.maze.add(env.m, 'generator', AMazing.generators.list )
        .onChange(function(){
                env.m.generate() ;
                env.mazeTxt.data = env.m.image ;
                env.init.render() ;
        } ) ;
    pnl.maze.add( env, 'generate').name('Generate a new maze') ;
    pnl.maze.open() ;

/*------------------------------------------------------------------------
 * Display Parameters
 *------------------------------------------------------------------------
 */
    pnl.dspPrmFldr  = pnl.addFolder( 'Display Parameters' ) ;
    pnl.dspPrmFldr.add(env, 'frameRate').step(60).min(60).max(36000) ;

/*------------------------------------------------------------------------
 * editor
 *------------------------------------------------------------------------
 */
//
//    pnl.editor = pnl.addFolder('Source Code Editor') ;
//    pnl.editor.add( env, 'toggleEditors').name('Display/Hide Editor') ;
//    pnl.editor.add( env.editor, 'title', env.editor.titles )
//        .name('Choose Shader')
//        .onChange(
//            function(){
//                pnl.editor.updateDisplay() ;
//                $('#editorTitle').text( 'Editing ' + env.editor.title ) ;
//            } ) ;
//    pnl.editor.add( env.editor, 'filename') ;
//    pnl.editor.add( env.editor, 'save').name('Save Source to File') ;
//    pnl.editor.add( env.editor, 'load').name('Load Source From File') ;
//    //pnl.editor.open() ;

/*------------------------------------------------------------------------
 * Simulation
 *------------------------------------------------------------------------
 */
    pnl.smlPrmFldr  = pnl.addFolder(    'Simulation'    ) ;

    pnl.smlPrmFldr.add( env, 'time').name('Solution Time [ms]').listen() ;

    pnl.smlPrmFldr.add( env, 'initialize').name('Initialize') ;
    pnl.smlPrmFldr.add( env, 'solve').name('Solve/Pause') ;
    pnl.smlPrmFldr.open() ;

/*------------------------------------------------------------------------
 * addCoeficients
 *------------------------------------------------------------------------
 */
    
    return ;
} /* End of createGui */

var saveList = [ 'comment',
];

/*========================================================================
 * Environment
 *========================================================================
 */
function Environment(){
    // model parameters ..................................................
    this.D = 1. ;
    this.a = 1. ;
    this.b = 2.84 ;
    this.epsilon = 0.6 ;
    this.dt = 0.2 ;
    this.time        = 0.0 ;

    // display ...........................................................
    this.frameRate = 6400 ;
    // solve .............................................................
    this.running = false ;
    this.solve       = function(){
        env.running = !env.running ;
    } ;

    // generate ..........................................................
    this.generate       = function(){
        env.m.generate() ;
        env.mazeTxt.data = env.m.image ;
        env.init.render() ;
    } ;

    this.filename = '' ;
    this.comment = '';
}

/*========================================================================
 * Initialization of the GPU and Container
 *========================================================================
 */
function loadWebGL()
{
    $('#title').text('Maze Solver') ;
    $('#canvas_2').hide() ;
    env = new Environment() ;
    var canvas_1 = $('#canvas_1')[0] ;
    var canvas_2 = $('#canvas_2')[0] ;
    env.canvas_1 = canvas_1 ;
    env.canvas_2 = canvas_2 ;

/*-------------------------------------------------------------------------
 * stats
 *-------------------------------------------------------------------------
 */
    var stats       = new Stats() ;
   // document.body.appendChild( stats.domElement ) ;

/*------------------------------------------------------------------------
 * maze 
 *------------------------------------------------------------------------
 */
    env.m = new AMazing.Maze(100,100,{
        cellSize:6,
        wallWidth : 2 ,
        cornerSize : 1 ,
        generator : 'AldousBroder' }) ;
    env.m.generate() ;

    env.width   = env.m.width ;
    env.height  = env.m.height ;
    canvas_1.width = env.width ;
    canvas_1.height = env.height ;

    canvas_2.width = env.width ;
    canvas_2.height = env.height ;

/*------------------------------------------------------------------------
 * 
 *------------------------------------------------------------------------
 */
    env.mazeTxt = new
        Abubu.Float32Texture(env.width,env.height,{data:env.m.image}) ;
    env.newsTxt = new Abubu.Float32Texture( env.width, env.height) ;
    env.fv = new Abubu.R32FTexture(env.width, env.height) ;
    env.sv = new Abubu.R32FTexture(env.width, env.height) ;

/*------------------------------------------------------------------------
 * news : determine neighbors for laplacian calculations 
 *-----------------------------------------------------------------------
 */
    env.news = new Abubu.Solver({
        fragmentShader : newsShader,
        uniforms : { 
            phase : { type : 't', value : env.mazeTxt } ,
        } ,
        targets : { 
            news : { location : 0 , target : env.newsTxt } ,
        }
    } ) ;

/*------------------------------------------------------------------------
 * fcomp and scomp
 *------------------------------------------------------------------------
 */
    var CompUniform = function(_inV){
        this.inV    = { type : 't', value : _inV        } ;
        this.newsTxt= { type : 't', value : env.newsTxt } ;
        this.mazeTxt= { type : 't', value : env.mazeTxt } ;
        this.D      = { type : 'f', value : env.D       } ;
        this.a      = { type : 'f', value : env.a       } ;
        this.b      = { type : 'f', value : env.b       } ;
        this.epsilon= { type : 'f', value : env.epsilon } ;
        this.dt     = { type : 'f', value : env.dt      } ;
        return this ;
    }

    env.fcomp = new Abubu.Solver({
        fragmentShader : compShader ,
        uniforms : new CompUniform(env.fv) ,
        targets : {
            outV : { location : 0, target : env.sv }
        }
    } ) ;

    env.scomp = new Abubu.Solver({
        fragmentShader : compShader ,
        uniforms : new CompUniform(env.sv) ,
        targets : {
            outV : { location : 0, target : env.fv }
        }
    } ) ;

/*------------------------------------------------------------------------
 * 
 *------------------------------------------------------------------------
 */
     env.init = new Abubu.Solver({
            fragmentShader : initShader,
            uniforms : { 
                a       : { type : 'f', value : env.a       } ,
                b       : { type : 'f', value : env.b       } ,
                D       : { type : 'f', value : env.D       } ,
                epsilon : { type : 'f', value : env.epsilon } ,
                dt      : { type : 'f', value : env.dt      } ,
                mazeTxt : { type : 't', value : env.mazeTxt } ,
            } ,
            renderTargets: {
                outFV : { location : 0, target : env.fv } ,
                outSV : { location : 1, target : env.sv } ,
            }
        } ) ;

    env.init.render() ;
/*------------------------------------------------------------------------
 * disp
 *------------------------------------------------------------------------
 */
    env.disp= new Abubu.Plot2D({
        target : env.fv ,
        colormap : env.colormap,
        phase   : env.mazeTxt ,
        phaseColor : [0,0,0] ,
        canvas : canvas_1 ,
        minValue: 0.5 ,
        enableMinColor : true ,
        enableMaxColor : true ,
        maxColor: [0,0.5,1,1] ,
        minColor: [1,1,1,1], 
        maxValue: 0.5 ,
        tipt : false ,
        tiptThreshold : env.tiptThreshold ,
        probeVisible : false ,
        probePosition : [0.6,1.0] ,
        colorbar : false ,
        cblborder: 25 ,
        cbrborder: 15 ,
        unit : '',
    } );
    //env.disp.showColorbar() ;
    //env.disp.addMessage(  'v-variable',
    //                    0.05,   0.05, /* Coordinate of the
    //                                     message ( x,y in [0-1] )   */
    //                    {   font: "Bold 14pt Arial",
    //                        style:"#ffffff",
    //                        align : "start"             }   ) ;

/*------------------------------------------------------------------------
 * initialize
 *------------------------------------------------------------------------
 */
    env.initialize = function(){
        env.news.render() ;
        env.init.render() ;
        refreshDisplay() ;
    } ;

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
 * rendering the program ;
 *------------------------------------------------------------------------
 */
    env.render = function(){
        if (env.running){
            env.startDate = performance.now() ;
            for(var i=0 ; i< env.frameRate/120 ; i++){
                env.fcomp.render() ;
                env.scomp.render() ;
                //stats.update() ;
                //stats.update() ;
                env.time += env.dt*2. ;
            }
        }
        refreshDisplay();
        requestAnimationFrame(env.render) ;
    }

/*------------------------------------------------------------------------
 * add environment to document
 *------------------------------------------------------------------------
 */
    window.env = env ;

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

/*@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
 * End of require()
 *@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
 */
loadWebGL() ;
} ) ;
