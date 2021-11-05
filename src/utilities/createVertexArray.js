function createFullscreenVertexArray() {
	var positions = app.createVertexBuffer(PicoGL.FLOAT, 3, new Float32Array([
		-1, -1, 0,
		+3, -1, 0,
		-1, +3, 0
	]));

	var vertexArray = app.createVertexArray().vertexAttributeBuffer(0, positions);

	return vertexArray;


	// type, itemSize: number of elements per vertex, data
	// var positions = app.createVertexBuffer(PicoGL.FLOAT, 3, new Float32Array([
	// 											-1, -1, 0,
	// 											+3, -1, 0,
	// 											-1, +3, 0]));

	// return app.createVertexArray()
	// 		  // Bind an per-vertex attribute buffer to vertex array.
 	// 		  .vertexAttributeBuffer(0, positions);
}

function createSphereVertexArray(radius, rings, sectors) { //0.08, 8, 8
	var positions = [];

	var R = 1.0 / (rings - 1);
	var S = 1.0 / (sectors - 1);

	var PI = Math.PI;
	var TWO_PI = 2.0 * PI;

	for (var r = 0; r < rings; ++r) {
		for (var s = 0; s < sectors; ++s) {

			var y = Math.sin(-(PI / 2.0) + PI * r * R);
			var x = Math.cos(TWO_PI * s * S) * Math.sin(PI * r * R);
			var z = Math.sin(TWO_PI * s * S) * Math.sin(PI * r * R);

			positions.push(x * radius);
			positions.push(y * radius);
			positions.push(z * radius);

		}
	}

	var indices = [];

	for (var r = 0; r < rings - 1; ++r) {
		for (var s = 0; s < sectors - 1; ++s) {

			var i0 = r * sectors + s;
			var i1 = r * sectors + (s + 1);
			var i2 = (r + 1) * sectors + (s + 1);
			var i3 = (r + 1) * sectors + s;

			indices.push(i2);
			indices.push(i1);
			indices.push(i0);

			indices.push(i3);
			indices.push(i2);
			indices.push(i0);

		}
	}

	var positionBuffer = app.createVertexBuffer(PicoGL.FLOAT, 3, new Float32Array(positions));
	var indexBuffer = app.createIndexBuffer(PicoGL.UNSIGNED_SHORT, 3, new Uint16Array(indices));

	var vertexArray = app.createVertexArray()
	.vertexAttributeBuffer(0, positionBuffer)
	.indexBuffer(indexBuffer);

	return vertexArray;

	// var positions = []; // 8*8*3

	// var R = 1.0 / (rings - 1);
	// var S = 1.0 / (sectors - 1);

	// var PI = Math.PI;
	// var TWO_PI = 2.0 * PI;

	// for (var r = 0; r < rings; ++r) {
	// 	for (var s = 0; s < sectors; ++s) {

	// 		var y = Math.sin(-(PI / 2.0) + PI * r * R);
	// 		var x = Math.cos(TWO_PI * s * S) * Math.sin(PI * r * R);
	// 		var z = Math.sin(TWO_PI * s * S) * Math.sin(PI * r * R);

	// 		positions.push(x * radius);
	// 		positions.push(y * radius);
	// 		positions.push(z * radius);

	// 	}
	// }

	// var indices = []; // 7*7*6

	// for (var r = 0; r < rings - 1; ++r) {
	// 	for (var s = 0; s < sectors - 1; ++s) {

	// 		var i0 = r * sectors + s;
	// 		var i1 = r * sectors + (s + 1);
	// 		var i2 = (r + 1) * sectors + (s + 1);
	// 		var i3 = (r + 1) * sectors + s;

	// 		indices.push(i2);
	// 		indices.push(i1);
	// 		indices.push(i0);

	// 		indices.push(i3);
	// 		indices.push(i2);
	// 		indices.push(i0);

	// 	}
	// }

	// var positionBuffer = app.createVertexBuffer(PicoGL.FLOAT, 3, new Float32Array(positions));
	// var indexBuffer = app.createIndexBuffer(PicoGL.UNSIGNED_SHORT, 3, new Uint16Array(indices));

	// var vertexArray = app.createVertexArray()
	// 					 .vertexAttributeBuffer(0, positionBuffer)
	// 					 .indexBuffer(indexBuffer);

	// return vertexArray;
}

function createVertexArrayFromMeshInfo(meshInfo) {
	var positions = app.createVertexBuffer(PicoGL.FLOAT, 3, meshInfo.positions);
	var normals   = app.createVertexBuffer(PicoGL.FLOAT, 3, meshInfo.normals);
	var tangents  = app.createVertexBuffer(PicoGL.FLOAT, 4, meshInfo.tangents);
	var texCoords = app.createVertexBuffer(PicoGL.FLOAT, 2, meshInfo.uvs);

	var vertexArray = app.createVertexArray()
	.vertexAttributeBuffer(0, positions)
	.vertexAttributeBuffer(1, normals)
	.vertexAttributeBuffer(2, texCoords)
	.vertexAttributeBuffer(3, tangents);

	return vertexArray;

	// var positions = app.createVertexBuffer(PicoGL.FLOAT, 3, meshInfo.positions);
	// var normals   = app.createVertexBuffer(PicoGL.FLOAT, 3, meshInfo.normals);
	// var tangents  = app.createVertexBuffer(PicoGL.FLOAT, 4, meshInfo.tangents);
	// var texCoords = app.createVertexBuffer(PicoGL.FLOAT, 2, meshInfo.uvs);

	// var vertexArray = app.createVertexArray()
	// 					.vertexAttributeBuffer(0, positions)
	// 					.vertexAttributeBuffer(1, normals)
	// 					.vertexAttributeBuffer(2, texCoords)
	// 					.vertexAttributeBuffer(3, tangents);

	// return vertexArray;

}