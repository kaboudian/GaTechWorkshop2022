%create colormaps
clear ;
clc ;
indx = 1:256 ;
a= jet(256) ;
h = 4 ;
green = zeros(h,256,3) ;
red   = zeros(h,256,3) ;
blue  = zeros(h,256,3) ;
for i=1:256 
    v=(i-1.0)/255.0 ;
    red(:,i,1)=v ;
    green(:,i,2)=v ;
    blue(:,i,3)=v ;
end

imwrite(green, 'green.png');
imwrite(red, 'red.png');
imwrite(blue, 'blue.png') ;
%clrmplist(2)='green';
%clrmplist(3)='blue';
