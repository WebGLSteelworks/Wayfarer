export const MODEL_CONFIG = {
  name: 'Matte',
  glb: './models/model_matte_gradient.glb',

  glass: {
    color: [0.0, 0.0, 0.0],
    roughness: 0.1,
    metalness: 0.2,
    opacity: 0.95,  
	
	animate: false,
	animateCamera: 'Cam_Lenses',
	
	opacityMap: './textures/Coperni_lens_gradient.jpg'
	
  },

  startCamera: 'Cam_Front',
  freeCamera: 'Cam_Free'
};
