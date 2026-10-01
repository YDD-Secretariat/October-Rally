/** @type {import('next').NextConfig} */
const nextConfig = {
  // @libsql/client has optional native bindings (used in local file mode) that
  // must not be bundled by webpack/turbopack.
  serverExternalPackages: ["@libsql/client"],
  // Allow an isolated build dir (used by the test runner) so `npm test` can run
  // a second server without clobbering a dev server's `.next` output.
  distDir: process.env.NEXT_DIST_DIR || ".next",
};

export default nextConfig;
