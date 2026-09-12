IBMS Backend Setup (Laravel 12 + PostgreSQL)
===========================================

This folder contains scaffolding and instructions to continue implementing the IBMS backend using Laravel 12 and PostgreSQL. The frontend is already implemented in the workspace root — this backend will integrate with it.

High-level steps (run on Ubuntu server / dev machine):

1. Install system dependencies:

   sudo apt update
   sudo apt install -y php8.3 php8.3-cli php8.3-fpm php8.3-pgsql php8.3-xml php8.3-mbstring php8.3-curl php8.3-zip unzip git curl

2. Install Composer (if not present):

   curl -sS https://getcomposer.org/installer | php
   sudo mv composer.phar /usr/local/bin/composer

3. Create Laravel project (in this repo root or separate folder). From project root run:

   composer create-project laravel/laravel="12.*" backend

4. Configure `.env` to use PostgreSQL. Example `.env` variables:

   DB_CONNECTION=pgsql
   DB_HOST=127.0.0.1
   DB_PORT=5432
   DB_DATABASE=ibms
   DB_USERNAME=ibms_user
   DB_PASSWORD=secret

5. Install required packages (examples):

   cd backend
   composer require laravel/breeze --dev
   php artisan breeze:install blade
   composer require barryvdh/laravel-dompdf

6. Migrate and seed (after you add migrations):

   php artisan migrate
   php artisan db:seed

7. Run local dev server for testing:

   php artisan serve --host=0.0.0.0 --port=8000

Docker (optional): Use `docker-compose.yml` in this folder to stand up a PostgreSQL instance for development.

What I scaffolded here:
- Sample Docker Compose for PostgreSQL (`backend/docker-compose.yml`)
- `.env.example` template
- Example repository/service/controller/request/resource/policy skeletons for `Product` (as a pattern)
- SQL migration templates for core tables (in `backend/database/sql_templates`)

Next steps I can take now:
- Generate full Laravel files inside `backend/` using `artisan` (requires composer). I can create detailed migration and class files now as templates if you want.
