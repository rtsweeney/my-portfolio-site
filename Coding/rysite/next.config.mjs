/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'cdn.sanity.io',
            },
        ],
    },
    async redirects() {
        return [
            { source: '/blog', destination: '/concerts', permanent: true },
        ];
    },
};

export default nextConfig;
