/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || 'https://locksin.org', // ← 换成你的域名
  generateRobotsTxt: true,
};

