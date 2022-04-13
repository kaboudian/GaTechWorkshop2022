// get the shader source by its id ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
function source(id){
    return document.getElementById(id).text ;
}

// Get the canvas ........................................................
var canvas_1 = document.getElementById('canvas_1') ;
var canvas_2 = document.getElementById('canvas_2') ;


// variables for interactions through GUI ................................
env = {} ;
env.skip    = 10  ;
env.running = false ;
env.solve   = function(){ env.running = !env.running ; } ;
env.width   = 512 ;
env.height  = 512 ;

// defining a textures for time stepping .................................
var txt1 = new Abubu.Float32Texture(env.width,env.height) ;
var txt2 = new Abubu.Float32Texture(env.width,env.height) ;

var dom1        = new Abubu.Float32Texture(env.width,env.height) ;
var dom2        = new Abubu.Float32Texture(env.width,env.height) ;

// init domain ...........................................................
var idSolver = new Abubu. Solver({
    fragmentShader : source( 'domInitShader' ) ,
    targets : {
        dom1 : { location : 0 , target : dom1 } ,
        dom2 : { location : 1 , target : dom2 } ,
    }
} ) ;
env.initDomain = function(){
    idSolver.render() ;
}
env.initDomain() ;


// init solver ...........................................................
var icSolver = new Abubu.Solver({
    fragmentShader : source ('icshader') ,
    targets : {
        outTrgt1 : { location : 0 , target : txt1 } ,
        outTrgt2 : { location : 1 , target : txt2 }
    }
} ) ;
env.init = function(){ 
    env.time = 0. ;
    icSolver.render() 
} ;
env.init() ;

// Model parameters ------------------------------------------------------
env.parameterSet = 'alpha-1' ;
env.Du           = .2 ;
env.Dv           = .08 ;
env.f            = 0.010 ;
env.k            = 0.047 ;
env.lx           = 300 ;
env.dt           = 0.1 ;
env.time         = 0. ;
env.periodic_x   = false ;
env.periodic_y   = false ;

// Setup time-step solvers -----------------------------------------------
function TSUniforms( in_txt ){
        // input texture
        this.inTrgt   = { type : 's', value : in_txt ,
            wrapS : 'mirrored_repeat', wrapT: 'mirrored_repeat', } ; 
        this.domain = { type : 's', value : dom1 } ; 

        // solver and model parameters 
        this.dt = { type : 'f', value : env.dt      } ; 
        this.lx = { type : 'f', value : env.lx      } ;
        this.Du = { type : 'f', value : env.Du      } ; 
        this.Dv = { type : 'f', value : env.Dv      } ; 
        this.f  = { type : 'f', value : env.f       } ; 
        this.k  = { type : 'f', value : env.k       } ; 
}

// odd time steps : gets txt1 --> writes txt2 ............................
var tsSolver1 = new Abubu.Solver( {
    fragmentShader : source('tsshader') ,
    uniforms : new TSUniforms( txt1 ),
    targets : {
        outTrgt : { location :0, target : txt2  } ,
    }
} ) ;

// even time steps : gets txt2 --> writes txt1 ...........................
var tsSolver2 = new Abubu.Solver( {
    fragmentShader : source('tsshader') ,
    uniforms : new TSUniforms(txt2) ,
    targets : {
        outTrgt : { location :0, target : txt1  } ,
    }
} ) ;


// choose a stable dt ----------------------------------------------------
function stabilize(){
    var dx = env.lx/env.width ;
    env.dt = 0.3*(dx*dx)/Math.max(env.Du,env.Dv) ;
    tsSolver1.uniforms.dt.value = env.dt ;
    tsSolver2.uniforms.dt.value = env.dt ;
}

stabilize() ;

// click handling --------------------------------------------------------
env.clickPosition = [0,0]  ;
env.clickRadius = 0.05 ;
env.u0 = 0. ;
env.v0 = 1. ;

// click solver ..........................................................
var click = new Abubu.Solver({
    fragmentShader : source('clickShader') ,
    uniforms :{
        in_txt : { type : 't', value : txt1 } ,
        clickPosition : { type :'v2', value : env.clickPosition } ,
        clickRadius   : { type : 'f', value : env.clickRadius  } ,
        u0 : { type : 'f', value : env.u0 } ,
        v0 : { type : 'f', value : env.v0 } ,
    } ,
    targets : {
        out_col : { location : 0, target : txt2 } ,
    }
} ) ;
// copy txt2 --> txt1 ....................................................
var clickCopy = new Abubu.Copy( txt2, txt1) ;



// Mouse Drag Event ......................................................
var mouseDrag = new Abubu.MouseListener({
    canvas : canvas_1, 
    event : 'drag' ,
    callback : function(e){
        click.uniforms.clickPosition.value = e.position ;
        click.render() ;
        clickCopy.render() ;
    } 
} ) ;

// pclick ................................................................
env.domain = false ;
var pclick = new Abubu.Solver({
    fragmentShader : source('pclickShader') ,
    uniforms : {
        in_txt : { type : 't', value : dom1 } ,
        clickPosition : {type : 'v2', value : env.clickPosition } ,
        clickRadius : { type : 'f', value : env.clickRadius } ,
        domain : { type : 'b', value : env.domain } 
    } ,
    targets : { 
        out_col : { location :0 , target : dom2 } ,
    } 
} ) ;
var pclickCopy = new Abubu.Copy(dom2, dom1) ;
var pmouseDrag = new Abubu.MouseListener({
    canvas : canvas_2, 
    event : 'drag' ,
    callback : function(e){
        console.log(e) ;
        pclick.uniforms.clickPosition.value = e.position ;
        pclick.render() ;
        pclickCopy.render() ;
    } 
} ) ;


// visualization solver --------------------------------------------------
var plt1 = new Abubu.Plot2D({
    target : txt1 ,
    channel: 'r',
    phaseField : dom1 , // helps color outside the domain as white
    minValue : .4,
    maxValue : 1.2,
    colorbar : true ,
    canvas : canvas_1
} ) ;
plt1.init() ;
plt1.addMessage("u" , 0.05,0.07, { font: "20pt Times", align:'left',
        style: "#ffffff"} );

var plt2 = new Abubu.Plot2D({
    target : txt1 ,
    channel: 'g',
    phaseField: dom1, // helps color outside the domain as white
    minValue : 0.0,
    maxValue : 1.,
    colorbar : true ,
    canvas : canvas_2
} ) ;
plt2.addMessage("v" , 0.05,0.07, { font: "20pt Times", align:'left',
        style: "#ffffff"} );

plt2.init() ;


// run and visualize the program -----------------------------------------
function run(){
    if (env.running){
        for(var i=0; i < env.skip ; i++){
            tsSolver1.render() ;
            tsSolver2.render() ;
            env.time += env.dt*2. ;
        }
    }
    plt1.render() ;
    plt2.render() ;
    requestAnimationFrame(run) ;
}

// set a uniform in multiple solvers -------------------------------------
function setUniformInSolvers(uname,val, solvers){
    for(let i in solvers){
        solvers[i].uniforms[uname].value = val ;

        // run this function to make sure that dt does not blow the 
        // solution up
        stabilize() ;
    }
}

// add a param to Gui and update multiple solvers onChange ---------------
function add2Gui(gelem,prnt,param,solvers){
    gelem.add(prnt,param).onChange(function(){
        setUniformInSolvers(param,prnt[param],solvers) ;
    } ) ;
}

// add multiple params to gui and update multiple solvers on change ------
function addMultipleParams2Gui(gelem, prnt, params, solvers){
    for (let i in params){
        add2Gui(gelem, prnt, params[i],solvers) ;
    }
}


class Parameters{
    constructor(opts){
        this._vars = [
            {    name :'alpha-1: moving spots'  , f : 0.010 , k : 0.047 } ,
            {    name :'alpha-2: moving spots'  , f : 0.014 , k : 0.053 } ,
            {    name :'beta-1: Chaos'   , f : 0.014 , k : 0.039 } ,
            {    name :'beta-2: Chaos'   , f : 0.026 , k : 0.051 } ,
            {    name :'gamma-1: mazes with some chaos'  , f : 0.022 , k : 0.051 } ,
            {    name :'gamma-2: mazes with some chaos'  , f : 0.026 , k : 0.055 } ,
            {    name :'delta-1: turing patterns'  , f : 0.030 , k : 0.055 } ,
            {    name :'delta-2: turing patterns'  , f : 0.042 , k : 0.059 } ,
            {    name :'epsilon-1: warring microbes', f : 0.018 , k : 0.055 } ,
            {    name :'epsilon-2: warring microbes', f : 0.022 , k : 0.059 } ,
            {    name :'zeta-1: pulsating solitons'   , f : 0.022 , k : 0.061 } ,
            {    name :'zeta-2: pulsating solitons'   , f : 0.026 , k : 0.059 } ,
            {    name :'eta: spots and worms'      , f : 0.034 , k : 0.063 } ,
            {    name :'theta-1: super resonant mazes'  , f : 0.030 , k : 0.057 } ,
            {    name :'theta-2: super resonant mazes'  , f : 0.038 , k : 0.061 } ,
            {    name :'iota: negatons'     , f : 0.046 , k : 0.0594} ,
            {    name :'kappa-1:worms and loops'  , f : 0.050 , k : 0.063 } ,
            {    name :'kappa-2:worms and loops'  , f : 0.058 , k : 0.063 } ,
            {    name :'lambda-1: self replicating spots' , f : 0.026 , k : 0.061 } ,
            {    name :'lambda-2: self replicating spots' , f : 0.034 , k : 0.065 } ,
            {    name :'mu-1: worms'     , f : 0.046 , k : 0.065 } ,
            {    name :'mu-2: worms'     , f : 0.058 , k : 0.065 } ,
            {    name :'nu: stable solitons'       , f : 0.046 , k : 0.067 } ,
            {    name :'xi-1: waves'     , f : 0.010 , k : 0.041 } ,
            {    name :'xi-2: waves'     , f : 0.014 , k : 0.047 } ,
            {    name :'pi: the U skate world'       , f : 0.062 , k : 0.061 } ,
            {    name :'rho-1: bubbles'    , f : 0.098 , k : 0.057 ,
                    Du:0.5 , Dv:0.23 } ,
            {    name :'rho-2: bubbles'    , f : 0.102 , k : 0.055 ,
                    Du:0.5 , Dv:0.23 },
            {    name :'sigma-1: negative spots'  , f : 0.090 , k : 0.057 ,
                    Du:0.9 , Dv:0.44 },
            {    name :'sigma-2: negative spots'  , f : 0.110 , k : 0.0523 ,
                    Du:0.9 , Dv:0.44 } ,
        ] ;
        this.list = [] ;

        for(let variable of this._vars){
            this.list.push(variable.name) ;
        }
        this._no = 0 ;

        if (opts?.set){
            this.set = opts?.set  ;
        }

    }
    
    get set(){
        return this._vars[this._no].name ;
    }

    set set(nv){
        for(let i in this.list ){
            let name = this.list[i] ;
            if ( name == nv ){
                this.no = i ;
            }
        }
    }

    get _var(){
        return this._vars[this.no] ;
    }

    get f(){
        return this._var.f ;
    }
    set f(nv){
        this._var.f = nv ?? this._var.f ;
        setUniformInSolvers('f', this.f, [tsSolver1,tsSolver2] ) ;
    }
    
    get k(){
        return this._var.k ;
    }

    set k(nv){
        this._var.k = nv ?? this._var.k ;
        setUniformInSolvers('k', this.k, [tsSolver1,tsSolver2] ) ;
    }

    get Du(){
        return this._var.Du ?? 0.2 ;
    }

    set Du(nv){
        this._var.Du = nv ?? this._var.Du ;
        env.Du = this.Du ;
        setUniformInSolvers('Du', this.Du, [tsSolver1,tsSolver2] ) ;
    }

    get Dv(){
        return this._var.Dv ?? 0.08 ;
    }

    set Dv(nv){
        this._var.Dv = nv ?? this._var.Dv ;
        env.Dv = this.Dv ;
        setUniformInSolvers('Dv', this.Dv, [tsSolver1,tsSolver2] ) ;
    }
    get no(){
        return this._no ;

    }
    set no(nv){
        this._no = nv ;
        this.Dv = this.Dv ;
        this.Du = this.Du ;
        env.mdl.updateDisplay() ;
        setUniformInSolvers( 'Du', this.Du , [tsSolver1, tsSolver2] ) ;
        setUniformInSolvers( 'Dv', this.Dv , [tsSolver1, tsSolver2] ) ;
        setUniformInSolvers( 'f' , this.f  , [tsSolver1, tsSolver2] ) ;
        setUniformInSolvers( 'k' , this.k  , [tsSolver1, tsSolver2] ) ;
        stabilize() ;
    }
} ;

// create the user interface ---------------------------------------------
function createGUI(){
    env.gui = new Abubu.Gui() ;
    var pnl = env.gui.addPanel({width:400}) ;

    // solver parameters .................................................
    var mdl = pnl.addFolder('Solver Parameters') ;
    env.mdl = mdl ;
    env.params = new Parameters() ;
    
    mdl.add( env.params, 'set', env.params.list ) ;

    addMultipleParams2Gui(
        mdl, env.params, 
        ['Du','Dv','f','k'],
        [tsSolver1, tsSolver2] 
    ) ;
    addMultipleParams2Gui(
        mdl, env, 
        ['lx'],
        [tsSolver1, tsSolver2] 
    ) ;


    mdl.open() ;

    // click .............................................................
    var clk = pnl.addFolder('Click') ;
    clk.add(env, 'clickRadius').onChange(function(){
        click.uniforms.clickRadius.value = env.clickRadius ; 
        pclick.uniforms.clickRadius.value = env.clickRadius ; 

    } ) ;
    addMultipleParams2Gui( 
        clk, env, 
        ['u0', 'v0'],
        [click ]  ) ;

    clk.add( env, 'domain').onChange(function(){
        pclick.uniforms.domain.value = env.domain ;
    }) ;
    clk.open() ;

    // Boundary Conditions ...............................................
    var bdr = pnl.addFolder('Boundary Conditions') ;
    bdr.add(env, 'periodic_x').onChange(function(){
        if (env.periodic_x){
            tsSolver1.uniforms.inTrgt.wrapS = 'repeat' ;
            tsSolver2.uniforms.inTrgt.wrapS = 'repeat' ;
        }else{
            tsSolver1.uniforms.inTrgt.wrapS = 'mirrored_repeat' ;
            tsSolver2.uniforms.inTrgt.wrapS = 'mirrored_repeat' ;
        }
    } ) ;

    bdr.add(env, 'periodic_y').onChange(function(){
        if (env.periodic_y){
            tsSolver1.uniforms.inTrgt.wrapT = 'repeat' ;
            tsSolver2.uniforms.inTrgt.wrapT = 'repeat' ;
        }else{
            tsSolver1.uniforms.inTrgt.wrapT = 'mirrored_repeat' ;
            tsSolver2.uniforms.inTrgt.wrapT = 'mirrored_repeat' ;
        }
    } ) ;
    bdr.open() ;


    // SOLVE .............................................................
    var sol = pnl.addFolder('Solve') ;
    sol.add( env, 'skip').step(1).min(1) ;
    sol.add( env, 'init').name( 'Initialize Solution' ) ;
    sol.add( env, 'solve').name('Solve/Pause') ;
    sol.add( env, 'dt').step(0.0001).listen() ;
    sol.add( env, 'time').listen() ;
    sol.open() ;
}

// execute createGUI .....................................................
createGUI() ;

// execute run ...........................................................
run() ;
