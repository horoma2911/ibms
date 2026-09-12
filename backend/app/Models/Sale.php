<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class Sale extends Model
{
    use HasUuids;

    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = ['reference','total_amount','total_kg','payment_method'];

    public function items()
    {
        return $this->hasMany(SaleItem::class);
    }
}
