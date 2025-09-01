// This file tells TypeScript that the 'vis-network' and 'vis-data' modules exist,
// even though we don't have a full @types package for them.
// This prevents compilation errors.

declare module 'vis-network';
declare module 'vis-data';
