// (material.properties.map_Kd)   ? directory + material.properties.map_Kd   : 'default_diffuse.png';

function loadDiffuseTexture(app, material, directory) {
	var texture 
	var options = {}

	if (material.properties.map_Kd) {
		var imageName = directory + material.properties.map_Kd

		options['minFilter'] = PicoGL.LINEAR_MIPMAP_NEAREST
		options['magFilter'] = PicoGL.LINEAR
		options['mipmaps'] = true
	
		texture = app.createTexture2D(1, 1, options)
	
		var image = document.createElement('img')
		image.onload = function() {
	
			texture.resize(image.width, image.height)
			texture.data(image)
	
		}
		image.src = 'assets/' + imageName
	} else {
		var color = material.properties.Kd
		options['format'] = PicoGL.RGB
		options['internalFormat'] = PicoGL.SRGB8_ALPHA8
	
		var side = 32;
		var arr =  [];
		for (var i = 0; i < side * side; i++) {
			var colorByte = [color[0] * 255.99, color[1] * 255.99, color[2] * 255.99, 255]
			arr = arr.concat(colorByte)
		}
		var image_data = new Uint8Array(arr)
		texture = app.createTexture2D(image_data, side, side)
	}
	return texture;
}

function loadTexture(imageName) {
	var options = {};

	if (imageName.indexOf('_spec') != -1 || imageName.indexOf('_normal') != -1) {
		options['internalFormat'] = PicoGL.RGB8;
		options['format'] = PicoGL.RGB;
	} 
	else {
		options['internalFormat'] = PicoGL.SRGB8_ALPHA8;
		options['format'] = PicoGL.RGBA;
	}

	var texture = app.createTexture2D(1, 1, options);

	var image = document.createElement('img');
	image.src = 'assets/' + imageName;

	image.onload = function() {
		texture.resize(image.width, image.height);
		texture.data(image);
		initiatePrecompute();
	};
	return texture;

}

// function makeSingleColorTexture(app, color) {
// 	var options = {};
// 	options['format'] = PicoGL.RGBA;
// 	options['internalFormat'] = PicoGL.SRGB8_ALPHA8;

// 	var side = 32;
// 	var arr =  [];
// 	for (var i = 0; i < side * side; i++) {
// 		var colorByte = [color[0] * 255.99, color[1] * 255.99, color[2] * 255.99, 255];
// 		arr = arr.concat(colorByte);
// 	}
// 	var image_data = new Uint8Array(arr);
// 	return app.createTexture2D(image_data, side, side);
// 	// return app.createTexture2D(image_data, side, side, options);
// }