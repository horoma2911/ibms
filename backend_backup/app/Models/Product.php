<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Product extends Model
{
    use SoftDeletes;

    protected $casts = [
        'id' => 'string',
        'price' => 'decimal:2',
        'cost' => 'decimal:2',
        'stock' => 'integer',
    ];

    protected $fillable = ['sku','name','category_id','cost','price','stock','unit'];

    public function category()
    {
        return $this->belongsTo(Category::class);
    }
}
