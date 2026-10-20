// Diatonic staff indices and MIDI pitches are deliberately separate units.
(()=>{'use strict';
const letters=Object.freeze(['C','D','E','F','G','A','B']);
const name=i=>letters[i%7]+Math.floor(i/7);
const midi=i=>12*(Math.floor(i/7)+1)+[0,2,4,5,7,9,11][i%7];
window.ArcadeMusicPitch=Object.freeze({letters,name,midi});
})();
