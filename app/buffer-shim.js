// esbuild --inject: gives the browser bundle the Node Buffer global that web3.js and Anchor expect.
export { Buffer } from "buffer";
