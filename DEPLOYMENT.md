Local Nginx + PHP-FPM setup (Windows via WSL recommended)

1. Place application in `/var/www/horoma` (or adjust `root` in nginx config).
2. Ensure `backend/.env` is configured and `APP_KEY` set (run `php artisan key:generate`).
3. Install PHP-FPM, nginx, and required PHP extensions (pdo, pdo_mysql, mbstring, intl, xml, gd, zip).
4. Copy `deploy/nginx/horoma.local.conf` into `/etc/nginx/sites-available/horoma.local` and symlink to `sites-enabled`.
5. Restart services: `sudo systemctl restart php8.2-fpm` and `sudo systemctl restart nginx`.
6. For Windows, use WSL2 (Ubuntu) and follow same steps; point hosts file (`C:\Windows\System32\drivers\etc\hosts`) to 127.0.0.1 horoma.local.

Notes:
- Ensure `storage` and `bootstrap/cache` are writable by web server user.
- If using SQLite, ensure path is correct and writable.
- The app uses Laravel `public` directory as the web root.
