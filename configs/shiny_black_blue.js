export const MODEL_CONFIG = {
  name: 'Shiny',
  glb: './models/model_shiny_blue.glb',

  glass: {
    color: [0.06, 0.06, 0.12],
    roughness: 0.1,
    metalness: 0.5,
    opacity: 0.9, 
	
	animate: true,
	animateCamera: 'Cam_Lenses'
  },

  startCamera: 'Cam_Front',
  freeCamera: 'Cam_Free'
};
