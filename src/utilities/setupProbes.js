function placeProbes() {
	// Test
	probeOrigin = vec3.fromValues(-1.5, 1.0, -1.5);
	probeStep   = vec3.fromValues(2.0, 2.0, 2.0);
	probeCount  = new Int32Array([4, 3, 4]);


	var totalCount = probeCount[0] * probeCount[1] * probeCount[2];
	probeLocations = new Array(totalCount);
	var index = 0;

	for (var z = 0; z < probeCount[2]; ++z) {
		for (var y = 0; y < probeCount[1]; ++y) {
			for (var x = 0; x < probeCount[0]; ++x) {
				var location = vec3.create();
				var diff = vec3.create();

				vec3.mul(diff, vec3.fromValues(x, y, z), probeStep);
				vec3.add(location, probeOrigin, diff);

				probeLocations[index++] = location;
			}
		}
	}

    return probeOrigin, probeStep, probeCount, probeLocations
}

function getProbeCubemaps(app, cubemapSize) {
	probeCubemaps = {}
	arr = ['radiance', 'depth', 'normals', 'distance']
	format = { 'radiance': PicoGL.RGBA, 'depth': PicoGL.DEPTH_COMPONENT, 'normals': PicoGL.RGBA, 'distance': PicoGL.RG }
	internalFormat = { 'radiance': PicoGL.RGBA16F, 'depth': PicoGL.DEPTH_COMPONENT16F, 'normals': PicoGL.RGBA16F, 'distance': PicoGL.RG16F }
	
	arr.map(k => probeCubemaps[k] = app.createCubemap({ 
										width: cubemapSize, // 256
										height: cubemapSize, // 256
										type: PicoGL.FLOAT,
										format: format[k],
										internalFormat: internalFormat[k]}))
	return probeCubemaps;
}

function getProbeOctahedrals(app, irradianceSize, irradianceSize, numProbes) {
	probeOctahedrals = {}
	arr = ['irradiance', 'filteredDistance']
	format = { 'irradiance': PicoGL.RGB, 'filteredDistance': PicoGL.RG }
	internalFormat = { 'irradiance': PicoGL.R11F_G11F_B10F, 'filteredDistance': PicoGL.RG32F }
	
	// numprobes: number of images in the array
	// irandiancesize: 128
	// this createTextureArray has 64 textures so 1 probe generate a texture
	arr.map(k => probeOctahedrals[k] = app.createTextureArray(irradianceSize, irradianceSize, numProbes, { 
											type: PicoGL.FLOAT,
											format: format[k],
											internalFormat: internalFormat[k],
											minFilter: PicoGL.LINEAR,
											magFilter: PicoGL.LINEAR}))
	return probeOctahedrals
}