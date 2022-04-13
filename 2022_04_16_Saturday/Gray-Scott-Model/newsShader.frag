#version 300 es
precision highp float ;
precision highp int ;

in vec2 cc ;

uniform sampler2D   in_phase ;

layout (location = 0) out vec4 out_eastWest ;
layout (location = 1) out vec4 out_northShouth ;

#define isInside(pos)   (texture(in_phase,pos).r>0.5) 

void main(){
    vec2 size = vec2(textureSize(in_phase, 0)) ;
    vec2 ii  = vec2(1.,0.)/size ;
    vec2 jj  = vec2(0.,1.)/size ;
    
    vec4 eastWest, northSouth ;

    // east node's location ..............................................
    if ( isInside(cc+ii) ){
        eastWest.xy = cc+ii ;
    }else if (isInside(cc-ii)){
        eastWest.xy = cc-ii ;
    }else{
        eastWest.xy = cc ;
    }

    // west nodes location ...............................................
    if (isInside(cc-ii)){
        eastWest.zw = cc-ii ;
    }else if (isInside(cc+ii)){
        eastWest.zw = cc+ii ;
    }else{
        eastWest.zw = cc ;
    }
    
    // north node location ...............................................
    if (isInside(cc+jj)){
        northSouth.xy = cc+jj ;
    }else if (isInside(cc-jj)){
        northSouth.xy = cc-jj ;
    }else{
        northSouth.xy = cc ;
    }

    // sout node's location ..............................................
    if (isInside(cc-jj)){
        northSouth.zw = cc-jj ;
    }else if (isInside(cc+jj)){
        northSouth.zw = cc+jj ;
    }else{
        northSouth.zw = cc ;
    }

    // set outpus --------------------------------------------------------
    out_eastWest = eastWest ;
    out_northShouth = northSouth ;

    return ;

}
