#version 300 es

precision highp float ;
precision highp int ;

in      vec2        cc ;

uniform sampler2D   in_txt ;
uniform float       clickRadius ;
uniform vec2        clickPosition ;

uniform bool        domain ;

layout (location = 0 ) out vec4 out_col ;

void main(){
    vec4 col = texture( in_txt, cc ) ;

    if ( length(cc-clickPosition)<clickRadius ){
        if ( domain ){
            col = vec4(1.) ;
        }else{
            col = vec4(0.) ;
        }
    }
    out_col = vec4(col) ;
    return ;
}
