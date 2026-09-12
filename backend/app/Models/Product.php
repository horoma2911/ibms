<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Product extends Model
{
    use HasUuids, SoftDeletes;

    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = ['name', 'sku', 'category_id', 'cost', 'price', 'stock', 'unit', 'packaging', 'packaging_counts'];

    protected $casts = [
        'cost' => 'decimal:2',
        'price' => 'decimal:2',
        'stock' => 'integer',
        'packaging_counts' => 'array',
    ];

    public function category()
    {
        return $this->belongsTo(Category::class);
    }
}
