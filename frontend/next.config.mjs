/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    // wagmi's `wagmi/connectors` barrel pulls in the Coinbase Smart Wallet
    // (baseAccount) connector, which transitively requires @base-org/account
    // -> @coinbase/cdp-sdk -> optional @x402/* packages that aren't
    // installed. We only use the `injected()` connector, so stub these out
    // rather than pulling in unrelated payment-protocol dependencies.
    config.resolve.alias = {
      ...config.resolve.alias,
      "@coinbase/cdp-sdk": false,
      "@base-org/account": false,
    };
    return config;
  },
};

export default nextConfig;
