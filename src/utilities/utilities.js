// Create mock camera to be able to get the view space light direction.
// 从 cube 某一个面看出去，画cubemap 的 这一面，NOTE 这时候要建立一个新的camera space
function createCamera(location, center, up) {
	var viewMatrix = mat4.create();
	var lookPos = vec3.add(vec3.create(), location, center); // 看向的 position
	mat4.lookAt(viewMatrix, location, lookPos, up); // out, eye, center, up, world to camera

	var matrix3 = mat3.create();
	mat3.fromMat4(matrix3, viewMatrix);
	var quaternion = quat.create();
	quat.fromMat3(quaternion, mat3.fromMat4(matrix3, viewMatrix));
	quat.conjugate(quaternion, quaternion); // (since the lookat already accounts for the inverse)
	quat.normalize(quaternion, quaternion);
	
	var cam = { orientation: quaternion, viewMatrix: viewMatrix };
	return viewMatrix, cam;
}