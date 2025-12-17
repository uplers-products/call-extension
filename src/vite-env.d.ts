/// <reference types="vite/client" />

// Type declarations for CSS inline imports
declare module '*.css?inline' {
  const content: string;
  export default content;
}
