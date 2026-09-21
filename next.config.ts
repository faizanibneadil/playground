import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // output: "export",
  images: {
    unoptimized: true,
  },
  trailingSlash: true,
  // Enables the React Compiler (babel-plugin-react-compiler) so components
  // are auto-memoized by the compiler instead of by hand. We deliberately
  // avoid manual useMemo/useCallback/React.memo in this codebase and let
  // the compiler do that optimization work instead.
  reactCompiler: true,
};

export default nextConfig;
