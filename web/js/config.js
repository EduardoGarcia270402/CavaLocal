// Constantes públicas del front. El GOOGLE_CLIENT_ID es público por diseño (va en el navegador).
export const API = (typeof window !== 'undefined' && window.CAVA_API) ||
  (typeof window !== 'undefined' && window.location.hostname === 'conjunta3p.espe.edu.ec'
    ? '/api'
    : 'http://localhost:3001/api');
// TODO-USUARIO: pega aquí el OAuth Client ID que generes en Google Cloud (Task 5 / guía).
export const GOOGLE_CLIENT_ID =
  (typeof window !== 'undefined' && window.CAVA_GOOGLE_CLIENT_ID) || 'PEGAR_TU_GOOGLE_CLIENT_ID';
