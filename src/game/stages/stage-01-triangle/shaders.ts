export const VERTEX_SHADER_SOURCE = `#version 300 es
in vec2 a_position;

void main() {
  gl_PointSize = 8.0;
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

export const FRAGMENT_SHADER_SOURCE = `#version 300 es
precision mediump float;

uniform vec4 u_color;
out vec4 outColor;

void main() {
  outColor = u_color;
}
`;
