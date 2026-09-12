<?php

namespace Tests\Feature;

use Tests\TestCase;

class FrontendAssetsTest extends TestCase
{
    public function test_frontend_css_is_available_through_laravel(): void
    {
        $this->get('/assets/css/style.css')
            ->assertOk()
            ->assertHeader('content-type', 'text/css; charset=UTF-8');
    }

    public function test_login_page_is_available_through_laravel(): void
    {
        $this->get('/login.html')
            ->assertOk()
            ->assertHeader('content-type', 'text/html; charset=UTF-8');
    }
}
