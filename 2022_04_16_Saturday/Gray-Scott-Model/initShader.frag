#version 300 es
precision highp float ;
precision highp int ;

layout ( location = 0 ) out vec4 outTrgt1 ; // output @ location 0
layout ( location = 1 ) out vec4 outTrgt2 ; // output @ location 1

in vec2 cc ;    // center of pixel location
void main(){
    vec4 outTrgt =vec4(0.,0.,0.,0.) ; // Setting all channels to zero
    outTrgt1 = outTrgt ;
    outTrgt2 = outTrgt ;
    return ;
}
