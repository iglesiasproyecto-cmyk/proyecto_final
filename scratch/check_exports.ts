import * as motion from 'motion';
import * as motionReact from 'motion/react';

console.log('--- motion ---');
console.log(Object.keys(motion).filter(k => k.includes('Animate') || k.includes('motion')));

console.log('--- motion/react ---');
console.log(Object.keys(motionReact).filter(k => k.includes('Animate') || k.includes('motion')));
