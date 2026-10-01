/** @type {import('next').NextConfig} */
const nextConfig = {
  // better-sqlite3 is a native module and must not be bundled by webpack/turbopack.
  serverExternalPackages: ["better-sqlite3"],
  // Allow an isolated build dir (used by the test runner) so `npm test` can run
  // a second server without clobbering a dev server's `.next` output.
  distDir: process.env.NEXT_DIST_DIR || ".next",
};

export default nextConfig;
