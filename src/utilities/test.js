#version 300 es
precision highp float;

#include <common.glsl>

//
// NOTE: All fragment calculations are in *view space*
//

in vec3 v_position;
in vec3 v_normal;
in vec3 v_tangent;
in vec3 v_bitangent;
in vec2 v_tex_coord;
in vec4 v_light_space_position;
in vec3 v_world_position;
in vec3 v_world_space_normal;

#include <scene_uniforms.glsl>

uniform sampler2D u_diffuse_map;
uniform sampler2D u_specular_map;
uniform sampler2D u_normal_map;
uniform sampler2D u_shadow_map;

uniform vec3 u_dir_light_color;
uniform vec3 u_dir_light_view_direction;

uniform float u_dir_light_multiplier;
uniform float u_ambient_multiplier;

// light_field_probe
uniform float u_indirect_multiplier;

uniform struct LightFieldSurface
{
	Vector3int32            probeCounts; // assumed to be a power of two!
	Point3                  probeStartPosition;
	Vector3                 probeStep;
	// int                     lowResolutionDownsampleFactor;
	sampler2DArray          irradianceProbeGrid; // TODO: Size!
	sampler2DArray          meanDistProbeGrid;   // TODO: Size!
} L;

#include <light_field_probe_diffuse.glsl>

layout(location = 0) out vec4 o_color;

void main()
{
	vec3 N = normalize(v_normal);
	vec3 T = normalize(v_tangent);
	vec3 B = normalize(v_bitangent);

	// NOTE: We probably don't really need all (or any) of these
	reortogonalize(N, T);
	reortogonalize(N, B);
	reortogonalize(T, B);
	mat3 tbn = mat3(T, B, N);

	// Rotate normal map normals from tangent space to view space (normal mapping)
	vec3 mapped_normal = texture(u_normal_map, v_tex_coord).xyz;
	mapped_normal = normalize(mapped_normal * vec3(2.0) - vec3(1.0));
	N = tbn * mapped_normal;

	vec3 diffuse = texture(u_diffuse_map, v_tex_coord).rgb;
	float shininess = texture(u_specular_map, v_tex_coord).r;

	vec3 wi = normalize(-u_dir_light_view_direction);
	vec3 wo = normalize(-v_position);

	float lambertian = saturate(dot(N, wi));

	//////////////////////////////////////////////////////////
	// ambient
	vec3 color = u_ambient_multiplier * u_ambient_color.rgb * diffuse;

	//////////////////////////////////////////////////////////
	// directional light

	// shadow visibility
	// TODO: Probably don't hardcode bias
	// TODO: Send in shadow map pixel size as a uniform
	const float bias = 0.0029;
	vec2 texel_size = vec2(1.0) / vec2(textureSize(u_shadow_map, 0));
	vec3 light_space = v_light_space_position.xyz / v_light_space_position.w;
	float visibility = sample_shadow_map_pcf(u_shadow_map, light_space.xy, light_space.z, texel_size, bias);

	if (lambertian > 0.0 && visibility > 0.0)
	{
		vec3 wh = normalize(wi + wo);

		// diffuse
		color += u_dir_light_multiplier * visibility * diffuse * lambertian * u_dir_light_color;

		// specular
		float specular_angle = saturate(dot(N, wh));
		float specular_power = pow(2.0, 13.0 * shininess); // (fake glossiness from the specular map)
		float specular = pow(specular_angle, specular_power);
		color += u_dir_light_multiplier * visibility * shininess * specular * u_dir_light_color;
	}

	// indirect light

	vec3 fragment_world_space_pos = v_world_position;
	vec3 fragment_world_space_normal = normalize(v_world_space_normal);

	vec3 indirect_diffuse_light = computePrefilteredIrradiance(fragment_world_space_pos, fragment_world_space_normal);
	color += u_indirect_multiplier * diffuse * indirect_diffuse_light;
	
	// color = color / (color + vec3(1.0));

	// output tangents
	o_color = vec4(color, 1.0);
}











//////////////////////////// vertex shader
#version 300 es

#include <mesh_attributes.glsl>
#include <scene_uniforms.glsl>

uniform mat4 u_world_from_local;
uniform mat4 u_view_from_world;
uniform mat4 u_projection_from_view;
uniform mat4 u_light_projection_from_world;

out vec3 v_position;
out vec3 v_normal;
out vec3 v_tangent;
out vec3 v_bitangent;
out vec2 v_tex_coord;
out vec4 v_light_space_position;
out vec3 v_world_position;
out vec3 v_world_space_normal;

void main()
{
	mat4 view_from_local = u_view_from_world * u_world_from_local;

	// NOTE: normal only works for uniformly scaled objects!
	vec4 view_space_position = view_from_local * vec4(a_position, 1.0);
	vec4 view_space_normal   = view_from_local * vec4(a_normal, 0.0);
	vec4 view_space_tangent  = view_from_local * vec4(a_tangent.xyz, 0.0);

	vec4 world_space_normal = normalize(u_world_from_local * vec4(a_normal, 0.0));
	vec4 world_space_position = u_world_from_local * vec4(a_position, 1.0);

	v_position  = vec3(view_space_position);
	v_normal    = vec3(view_space_normal);
	v_tangent   = vec3(view_space_tangent);
	v_bitangent = vec3(vec3(a_tangent.w) * cross(view_space_normal.xyz, view_space_tangent.xyz));

	v_world_position = vec3(world_space_position);
	v_world_space_normal = vec3(world_space_normal);

	v_tex_coord = a_tex_coord;

	// TODO: Clean up these these transformations into one matrix multiplication
	// (i.e. from camera view space to light projected with bias and offset)
	v_light_space_position = u_light_projection_from_world * vec4(world_space_position.xyz, 1.0);
	v_light_space_position *= vec4(0.5, 0.5, 0.5, 1.0);
	v_light_space_position += vec4(0.5, 0.5, 0.5, 0.0);

	gl_Position = u_projection_from_view * view_space_position;

}

// picogl
this.uniforms[name].set(value);

this.currentProgram.uniform(uniformNames[uIndex], uniformValues[uIndex]);



// u_world_from_local;
// u_view_from_world;
// u_projection_from_view;
// u_light_projection_from_world;
