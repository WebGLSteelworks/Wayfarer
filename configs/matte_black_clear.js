export const MODEL_CONFIG = {
  name: 'Matte',
  glb: './models/model_matte.glb',

  glass: {
    color: [0.0, 0.0, 0.0],
    roughness: 0.1,
    metalness: 0.9,
    opacity: 0.15,  
	
	animate: false,
	animateCamera: 'Cam_Lenses'
  },

  startCamera: 'Cam_Front',
  freeCamera: 'Cam_Free'
};
