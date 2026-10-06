import "server-only";
// Composition root: change adapters here when real services and auth are ready.
export { demoDirectory as directoryRepository } from "./demo/repository";
export { demoLocationAdapter as locationAdapter } from "./demo/locations";
export { demoQaRepository as qaRepository } from "./demo/qa-repository";
export { demoReviewRepository as reviewRepository } from "./demo/review-repository";
