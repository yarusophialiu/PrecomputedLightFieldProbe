'using strict';
var app;

var defaultShader;
var shadowMapShader;
var precomputeShader;
var irradianceShader;

var sceneUniforms;

var shadowMapSize = 4096;
var shadowMapFramebuffer;

var camera;
var directionalLight;
var meshes = [];

var probeDrawCall;
var probeOrigin;
var probeCount;
var probeStep;
var probeLocations

var probeOctahedrals = {};
var irradianceSize;

// probeFramebuffer
var probeFramebuffer;
var probeCubeSize = 256;
var probeCubemaps;

// precompute probes
var precomputeThisFrame = false;
var precomputeIndex = 0;
var precomputeQueue = [];
var precomputeTimes;

// for more efficient implementation
var irradianceFramebuffer;
var irradianceSize = 128;


window.addEventListener('DOMContentLoaded', function () {

	init();
	resize();

	window.addEventListener('resize', resize, true);
	requestAnimationFrame(render);

}, false);

////////////////////////////////////////////////////////////////////////////////
// Utility

function loadObject(directory, objFilename, mtlFilename, modelMatrix) {

	var objLoader = new OBJLoader();
	var mtlLoader = new MTLLoader();

	var path = 'assets/' + directory;

	objLoader.load(path + objFilename, function(objects) {
		mtlLoader.load(path + mtlFilename, function(materials) {
			objects.forEach(function(object) {
				// object includes material: "BlackMarble"
				// name: "living_room_living_room_BlackMarble"
				// normals: Float32Array(396) [0, 0, -1, 0]
				// positions: Float32Array(396) [-1.4697999]
				// tangents: Float32Array(528) [-1, 0, 0, -1]
				// uv2s: Float32Array [buffer: ArrayBuffer(0), byteLength: 0, byteOffset: 0, length: 0]
				// uvs: Float32Array(264) [0.00266700005158782

				var material = materials[object.material]
				var diffuseTexture  = loadDiffuseTexture(app, material, directory)
				var specularTexture = loadTexture('default_specular.jpg');
				var normalTexture = loadTexture('default_normal.jpg');

				var vertexArray = createVertexArrayFromMeshInfo(object)

				var drawCall = app.createDrawCall(defaultShader, vertexArray)
					.uniformBlock('SceneUniforms', sceneUniforms)
					.texture('u_diffuse_map', diffuseTexture)
					.texture('u_specular_map', specularTexture)
					.texture('u_normal_map', normalTexture);

				var shadowMapDrawCall = app.createDrawCall(shadowMapShader, vertexArray);

				var precomputeDrawCall = app.createDrawCall(precomputeShader, vertexArray)
					.uniformBlock('SceneUniforms', sceneUniforms)
					.texture('u_diffuse_map', diffuseTexture)
					.texture('u_specular_map', specularTexture)
					.texture('u_normal_map', normalTexture);

				meshes.push({
					modelMatrix: modelMatrix || mat4.create(),
					drawCall,
					shadowMapDrawCall,
					precomputeDrawCall
				});
				initiatePrecompute();

			});
		});
	});

}

function init() {
	var canvas = document.getElementById('canvas');
	app = PicoGL.createApp(canvas, { antialias: true })
			
	// Basic GL state
	app.clearColor(0, 0, 0, 1)
		.floatRenderTargets()
		.linearFloatTextures()
		.cullBackfaces()
		.noBlend();

	// Setup camera

	var cameraPos = vec3.fromValues(2.6, 1.6, 3.6);
	var cameraRot = quat.fromEuler(quat.create(), -19, 70, 360);
	camera = new Camera(cameraPos, cameraRot);

	// Setup scene
	var dir = vec3.fromValues(-0.15518534183502197, -0.22172605991363525, 0.962681233882904);
	directionalLight = new DirectionalLight(dir, vec3.fromValues(1.0, 0.803, 0.433));
	setupDirectionalLightShadowMapFramebuffer(shadowMapSize);

	// use up and down key to move directional light
	document.addEventListener('keydown', e => {
		var move;
		if (e.keyCode == 38) move = 0.01; 
		if (e.keyCode == 40) move = -0.01; 
		if (move) {
			vec3.rotateX(directionalLight.direction, directionalLight.direction, vec3.create(), move);
		}
	})


	// set ambientColor
	sceneUniforms = app.createUniformBuffer([PicoGL.FLOAT_VEC4])
						.set(0, new Float32Array([1.0, 1.0, 1.0, 1.0]),)
						.update();

	var shaderLoader = getShaderLoader();

	shaderLoader.load(function(loaders) {
		console.log('shader loader data ', loaders)
		defaultShader = makeShader(app, 'default', loaders);
		shadowMapShader = makeShader(app, 'shadowMapping', loaders);
		precomputeShader = makeShader(app, 'precompute', loaders);
		irradianceShader = makeShader(app, 'irradianceMap', loaders);

		var fullscreenVertexArray = createFullscreenVertexArray();
		irradianceDrawCall = app.createDrawCall(irradianceShader, fullscreenVertexArray)
								.uniformBlock('SphereSamples', createSphereSamplesUniformBuffer());

		// Setup and draw probes
		var unlitShader = makeShader(app, 'unlit', loaders);
		var probeVertexArray = createSphereVertexArray(0.08, 8, 8);
		probeOrigin, probeStep, probeCount, probeLocations = placeProbes()
		setupProbeDrawCall(probeVertexArray, unlitShader);

		// Load objects
		let m = mat4.create(); 
		let r = quat.fromEuler(quat.create(), 0, 0, 0); // Creates a quaternion from the given euler angle x, y, z.
		let t = vec3.fromValues(0, 0, 0);
		let s = vec3.fromValues(1, 1, 1);
		// Creates a matrix from a quaternion rotation, vector translation and vector scale 
		mat4.fromRotationTranslationScale(m, r, t, s);
		loadObject('living_room/', 'living_room.obj', 'living_room.mtl', m);
		// loadObject('test_room/', 'test_room.obj', 'test_room.mtl', m);

		setupProbes();
	})

}

function setupProbes() {

	// Cubemap 
	probeFramebuffer = app.createFramebuffer();
	probeCubemaps = getProbeCubemaps(app, probeCubeSize) // 256

	// Octahedral
	irradianceFramebuffer = app.createFramebuffer();
	probeOctahedrals = getProbeOctahedrals(app, irradianceSize, irradianceSize, probeLocations.length)

}

function setupDirectionalLightShadowMapFramebuffer(size) {
	var depthBuffer = app.createTexture2D(size, size, {
		format: PicoGL.DEPTH_COMPONENT
	});

	shadowMapFramebuffer = app.createFramebuffer()
		// .colorTarget(0, colorBuffer)
		.depthTarget(depthBuffer);
}

function setupProbeDrawCall(vertexArray, shader) {
	// We need at least one (x,y,z) pair to render any probes
	if (probeLocations.length <= 0) {
		console.error('Probe locations invalid!');
		return;
	}

	var offsetsArray = new Float32Array(probeLocations.length * 3); // 64 * 3
	for (var i = 0, len = probeLocations.length; i < len; ++i) {
		offsetsArray[3 * i + 0] = probeLocations[i][0];
		offsetsArray[3 * i + 1] = probeLocations[i][1];
		offsetsArray[3 * i + 2] = probeLocations[i][2];
	}

	// Set up for instanced drawing at the probe locations
	var offsets = app.createVertexBuffer(PicoGL.FLOAT, 3, offsetsArray);
	vertexArray.instanceAttributeBuffer(10, offsets);

	probeDrawCall = app.createDrawCall(shader, vertexArray)
		.uniform('u_color', vec3.fromValues(1, 0, 0));

}

function initiatePrecompute() {
	console.log('==== about to initiatePrecompute ======= ')
	// console.log('precomputeIndex', precomputeIndex)
	precomputeQueue = [...Array(probeLocations.length).keys()];
	precomputeThisFrame = true;
	precomputeIndex = 0;
	precomputeTimes = [];
}


////////////////////////////////////////////////////////////////////////////////

function resize() {

	var w = window.innerWidth;
	var h = window.innerHeight;

	app.resize(w, h);
	camera.resize(w, h);

}

////////////////////////////////////////////////////////////////////////////////
// Rendering

async function render() {
	{
		// camera.update(); ?????????? for what...
		renderShadowMap();
		renderScene();
		if (precomputeThisFrame) {
			let start = new Date().getTime();

			if (precomputeIndex < probeLocations.length) {
				precomputeProbe(precomputeIndex);
				precomputeIndex++;
			}		

			precomputeTimes.push(new Date().getTime() - start);

			if (precomputeIndex == probeLocations.length) {
				var avgTime = precomputeTimes.reduce((prev, curr) => prev + curr) / probeLocations.length;
				console.log('Average time of precomputing one probe: '  + avgTime.toPrecision(3) + 'ms');
				precomputeThisFrame = false;
				precomputeIndex = 0;
				precomputeTimes = [];
			}
		}

		// render probe
		var viewProjection = mat4.mul(mat4.create(), camera.projectionMatrix, camera.viewMatrix);
		renderProbes(viewProjection);

	}
	requestAnimationFrame(render);

}

function renderShadowMap() {
	if (!directionalLight) return;

	var lightViewProjection = directionalLight.getLightViewProjectionMatrix();

	app.drawFramebuffer(shadowMapFramebuffer)
	.viewport(0, 0, shadowMapSize, shadowMapSize)
	.depthTest()
	.depthFunc(PicoGL.LEQUAL)
	.noBlend()
	.clear();

	for (var i = 0, len = meshes.length; i < len; ++i) {
		var mesh = meshes[i];

		mesh.shadowMapDrawCall
		.uniform('u_world_from_local', mesh.modelMatrix)
		.uniform('u_light_projection_from_world', lightViewProjection)
		.draw();
	}
}

function renderScene() {

	var dirLightViewDirection = directionalLight.viewSpaceDirection(camera);
	var lightViewProjection = directionalLight.getLightViewProjectionMatrix();
	var shadowMap = shadowMapFramebuffer.depthTexture;

	app.defaultDrawFramebuffer()
	.defaultViewport()
	.depthTest()
	.depthFunc(PicoGL.LEQUAL)
	.noBlend()
	.clear();

	for (var i = 0, len = meshes.length; i < len; ++i) {

		var mesh = meshes[i];
		mesh.drawCall
			.uniform('u_world_from_local', mesh.modelMatrix)
			.uniform('u_view_from_world', camera.viewMatrix)
			.uniform('u_projection_from_view', camera.projectionMatrix)
			.uniform('u_dir_light_color', directionalLight.color)
			.uniform('u_dir_light_view_direction', dirLightViewDirection)
			.uniform('u_dir_light_multiplier', 65.0)
			.uniform('u_light_projection_from_world', lightViewProjection)
			.texture('u_shadow_map', shadowMap)
			.uniform('u_ambient_multiplier', 0.78)
			.uniform('u_indirect_multiplier', 0.56)
			// light field probe params
			.texture('L.irradianceProbeGrid', probeOctahedrals['irradiance'])
			.texture('L.meanDistProbeGrid', probeOctahedrals['filteredDistance'])
			.uniform('L.probeCounts', probeCount)
			.uniform('L.probeStartPosition', probeOrigin)
			.uniform('L.probeStep', probeStep) // input of frag shader
			.draw();
	}
}

function renderProbes(viewProjection) {

	if (probeDrawCall) {
		app.defaultDrawFramebuffer()
		.defaultViewport()
		.depthTest()
		.depthFunc(PicoGL.LEQUAL)
		.noBlend();

		probeDrawCall
		.uniform('u_projection_from_world', viewProjection)
		.draw();
	}
}

function precomputeProbe(probeIndex) {
	var projectionMatrix = mat4.create();
	mat4.perspective(projectionMatrix, Math.PI / 2.0, 1.0, 0.1, 100.0); // out, fovy, aspect, near, far

	var viewMatrix = mat4.create()
	var cam
	
	// Draw the radiance, distance and depth for each side of cubemaps
	for (var i = 0; i < 6; i++) {
		probeFramebuffer.colorTarget(0, probeCubemaps['radiance'], i)
						.colorTarget(1, probeCubemaps['distance'], i)
						.depthTarget(probeCubemaps['depth'], i);

		viewMatrix, cam = createCamera(probeLocations[probeIndex], CUBE_LOOK_DIR[i], CUBE_LOOK_UP[i])

		var dirLightViewDirection = directionalLight.viewSpaceDirection(cam); // directionalight in camera space
		var lightViewProjection = directionalLight.getLightViewProjectionMatrix();
		var shadowMap = shadowMapFramebuffer.depthTexture;

		app.drawFramebuffer(probeFramebuffer)
			.viewport(0, 0, probeCubeSize, probeCubeSize)
			.depthTest()
			.depthFunc(PicoGL.LEQUAL)
			.noBlend()
			.clear()
		
		for (var j = 0; j < meshes.length; ++j) {
			var mesh = meshes[j]
			mesh.precomputeDrawCall
				.uniform('u_world_from_local', mesh.modelMatrix)
				.uniform('u_view_from_world', viewMatrix)
				.uniform('u_projection_from_view', projectionMatrix)
				.uniform('u_dir_light_color', directionalLight.color)
				.uniform('u_dir_light_view_direction', dirLightViewDirection)
				.uniform('u_dir_light_multiplier', 65.0)
				.uniform('u_light_projection_from_world', lightViewProjection)
				.texture('u_shadow_map', shadowMap)
				.uniform('u_ambient_multiplier', 0.08)
				.draw();
		}
	}

	// draw probeOctahedrals['irradiance']
	// irradianceFramebuffer.colorTarget(0, probeOctahedrals['irradiance'], probeIndex)
	
	// app.drawFramebuffer(irradianceFramebuffer)
	// 	.viewport(0, 0, irradianceSize, irradianceSize)
	// 	.noDepthTest()
	// 	.noBlend()
	
	// irradianceDrawCall.texture('u_radiance_cubemap', probeCubemaps['radiance'])
	// 	.uniform('u_num_samples', 2048)
	// 	.uniform('u_lobe_size', 0.99)
	// 	.draw()


	// // draw probeOctahedrals['filteredDistance']
	// irradianceFramebuffer.colorTarget(0, probeOctahedrals['filteredDistance'], probeIndex)

	// app.drawFramebuffer(irradianceFramebuffer)
	// 	.viewport(0, 0, irradianceSize, irradianceSize)
	// 	.noDepthTest()
	// 	.noBlend()
	
	// irradianceDrawCall.texture('u_radiance_cubemap', probeCubemaps['radiance'])
	// 	.uniform('u_num_samples', 128)
	// 	.uniform('u_lobe_size', 0.50)
	// 	.draw()

}