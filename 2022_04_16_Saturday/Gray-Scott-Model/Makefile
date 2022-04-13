all : index.html

index.html : index.php compShader.frag initShader.frag
	php index.php > index.html

.PHONY: index.html 

clean:
	rm -rf *.html
