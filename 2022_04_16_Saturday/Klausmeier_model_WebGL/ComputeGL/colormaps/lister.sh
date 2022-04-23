#!/bin/bash

for i in `ls *.png` ; do
    fl=`echo $i |awk -F. '{print $1}'`
    echo "'"$fl"'"','
done
