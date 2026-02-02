export const MODEL_CONFIG = {
  name: 'Matte',
  glb: './models/model_matte.glb',

  glass: {
    color: [0.0, 0.0, 0.0],
    roughness: 0.1,
    metalness: 0.2,
    opacity: 0.8,  
	
	animate: true,
	animateCamera: 'Cam_Lenses'
  },

  startCamera: 'Cam_Front',
  freeCamera: 'Cam_Free'
};
