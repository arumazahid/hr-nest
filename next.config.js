module.exports = {
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  experimental: { serverComponentsExternalPackages: ['pdf-parse', 'mammoth', 'imapflow', 'mailparser'] }
}
