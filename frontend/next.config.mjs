/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "oeyynnedpmuhfqxkecyt.supabase.co", pathname: "/storage/v1/object/public/**" },
      { protocol: "https", hostname: "*.supabase.co", pathname: "/storage/v1/object/public/**" },
    ],
  },
  webpack: (config, { dev }) => {
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

    // On this Windows machine, webpack's persistent disk cache under
    // .next/cache intermittently fails its atomic rename of *.pack.gz_ files
    // (almost certainly real-time antivirus scanning the file mid-write),
    // which corrupts the dev build and leaves `next dev` serving 404s/500s
    // for every route until `.next` is wiped by hand. Disabling the disk
    // cache in dev trades a bit of rebuild speed for a server that doesn't
    // randomly break.
    if (dev) {
      config.cache = false;
    }

    return config;
  },
};

export default nextConfig;
