# Chelan High School Performing Arts Booster

A nonprofit organization website supporting and strengthening performing arts programs at Chelan High School in Chelan, WA.

## About

The **Chelan High School Performing Arts Booster** is a 501(c)(3) nonprofit dedicated to supporting student performers through:

- **Financial Support** — Funding instruments, costumes, travel, and production costs
- **Volunteer Power** — Mobilizing community members to assist events and programs
- **Community Events** — Organizing concerts, fundraisers, and showcases
- **Advocacy & Visibility** — Championing the value of arts education

Website: [chelanpabooster.org](https://chelanpabooster.org)

## Tech Stack

- **Static HTML/CSS/JS** — No build step required
- **Cloudflare Workers** — Hosting and CDN via [Wrangler](https://developers.cloudflare.com/workers/wrangler/)
- **Google Fonts** — Playfair Display + Nunito Sans
- **Zeffy** — Donation and event management platform
- **Facebook** — Community engagement

## Project Structure

```
ChelanPABooster/
├── index.html        # Main site (all content, styles, and scripts)
├── robots.txt        # Search engine crawl directives
├── sitemap.xml       # XML sitemap for SEO
├── favicon.ico       # Browser favicon
├── favicon.png       # High-res icon (192×192)
├── logo.jpg          # Organization logo
└── wrangler.jsonc    # Cloudflare Workers configuration
```

## Local Development

No build step is required. Open `index.html` directly in a browser, or use any static file server:

```bash
# Using Python
python3 -m http.server 8080

# Using Node.js (npx)
npx serve .
```

## Deployment

This site is deployed via Cloudflare Workers using [Wrangler](https://developers.cloudflare.com/workers/wrangler/).

```bash
# Install Wrangler (if not already installed)
npm install -g wrangler

# Authenticate with Cloudflare
wrangler login

# Deploy to production
wrangler deploy
```

## Contributing

1. Fork or clone this repository
2. Make changes to `index.html` (and any asset files)
3. Test locally in a browser
4. Submit a pull request

## External Links

- **Donate:** [Zeffy](https://www.zeffy.com/en-US/organization/chelan-high-school-performing-arts-booster)
- **Community:** [Facebook](https://www.facebook.com/profile.php?id=61575552912524)

## License

All rights reserved. Content and branding belong to the Chelan High School Performing Arts Booster, a 501(c)(3) nonprofit organization.
