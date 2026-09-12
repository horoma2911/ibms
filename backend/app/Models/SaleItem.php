<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class SaleItem extends Model
{
    use HasUuids;

    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = ['sale_id','product_id','name','sku','package_size','qty','price','line_total','total_kg'];

    public function sale()
    {
        return $this->belongsTo(Sale::class);
    }
}
