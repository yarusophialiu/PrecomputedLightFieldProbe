function getShaderLoader() {
    var shaderLoader = new ShaderLoader('src/shaders/');
    shaderLoader.addShaderFile('common.glsl');
	shaderLoader.addShaderFile('scene_uniforms.glsl');
	shaderLoader.addShaderFile('mesh_attributes.glsl');
    shaderLoader.addShaderFile('octahedral.glsl')
    shaderLoader.addShaderFile('light_field_probe_diffuse.glsl');


	shaderLoader.addShaderProgram('unlit', 'unlit.vert.glsl', 'unlit.frag.glsl');
	shaderLoader.addShaderProgram('default', 'default.vert.glsl', 'default.frag.glsl');
	shaderLoader.addShaderProgram('shadowMapping', 'shadow_mapping.vert.glsl', 'shadow_mapping.frag.glsl');
    shaderLoader.addShaderProgram('precompute', 'default.vert.glsl', 'precompute.frag.glsl');
    shaderLoader.addShaderProgram('irradianceMap', 'screen_space.vert.glsl', 'irradiance.frag.glsl');



    // shaderLoader.addShaderFile('octahedral.glsl')
    // // shaderLoader.addShaderFile('light_field_probe.glsl');
    // shaderLoader.addShaderFile('light_field_probe_diffuse.glsl');


    // shaderLoader.addShaderProgram('precompute', 'default.vert.glsl', 'precompute.frag.glsl');

    // shaderLoader.addShaderProgram('irradianceMap', 'screen_space.vert.glsl', 'irradiance.frag.glsl');
    return shaderLoader
}

function makeShader(app, name, shaderLoaderData) {
    // shaderLoaderData has default precompute shadowMapping irradianceMap
	var programData = shaderLoaderData[name];
    // vertex and fragment shader glsl
	var program = app.createProgram(programData.vertexSource, programData.fragmentSource);
	return program;
}