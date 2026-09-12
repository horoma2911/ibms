<?php
namespace App\Policies;

use App\Models\User;
use App\Models\Product;

class ProductPolicy
{
    public function viewAny(User $user)
    {
        return $user->is_active;
    }

    public function view(User $user, Product $product)
    {
        return $user->is_active;
    }

    public function create(User $user)
    {
        return $user->is_active;
    }

    public function update(User $user, Product $product)
    {
        return $user->is_active;
    }

    public function delete(User $user, Product $product)
    {
        return $user->is_active;
    }
}
