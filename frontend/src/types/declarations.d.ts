// This file tells TypeScript how to handle modules that don't have their own type definitions.
// By declaring the module, we are telling TypeScript to essentially treat it as 'any' type,
// which suppresses the TS7016 error.

declare module 'react-graph-vis';
