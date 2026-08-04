(function(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  root.LumnoSelectionButterfly = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  const restPath = 'M4.3248 17.7823C1.22382 14.6398 -0.116749 10.2475 0.824858 6.7097C1.02033 5.97529 1.95363 5.98287 2.27212 6.67289L4.16024 10.7637C4.38415 11.2488 4.50011 11.7767 4.50011 12.311L4.50011 16L6.24277 16C7.66705 16 9.01155 16.6576 9.88596 17.7819L11.0831 19.3211C11.5044 19.8627 11.2076 20.6668 10.5235 20.7201C8.63849 20.8671 6.85452 20.3459 4.3248 17.7823Z';
  const flutterPath = 'M4.32468 17.7823C-1.04106 11.6456 2.30784 4.56298 5.14393 1.13518C5.48929 0.717757 6.11849 0.734355 6.47527 1.14207L10.4328 5.66451C11.4105 6.78177 11.6239 8.37593 10.9745 9.71102L8.61264 14.567L11.5238 13.9636C13.2202 13.612 14.9706 14.24 16.0565 15.5899L18.7241 18.9056C19.0394 19.2975 18.9857 19.8717 18.5688 20.1531C15.6258 22.1399 9.6385 23.8596 4.32468 17.7823Z';

  return Object.freeze({
    back: Object.freeze({
      begin: '120ms',
      filter: 'blur(0.1px)',
      opacity: '0.22',
      transform: 'translate(0.6px, 0.2px) rotate(12deg) scale(0.97)'
    }),
    dValues: `${flutterPath};${restPath};${flutterPath}`,
    fill: '#79C3F2',
    front: Object.freeze({
      opacity: '0.34',
      transform: 'translate(-0.2px, 0.1px) rotate(-8deg) scale(1.01)'
    }),
    keySplines: '0.42 0 0.58 1;0.42 0 0.58 1',
    keyTimes: '0;0.5;1',
    restPath,
    transformValues: '-1.5 5.5 15.5;0 5.5 15.5;-1.5 5.5 15.5',
    viewBox: '0 0 23 25',
    duration: '2800ms'
  });
});
