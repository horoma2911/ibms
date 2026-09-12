<?php
namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ProductRequest extends FormRequest
{
    public function authorize()
    {
        return true; // replace with policy check when ready
    }

    public function rules()
    {
        return [
            'name' => 'required|string|max:191',
            'sku' => 'nullable|string|max:100|unique:products,sku,' . ($this->route('product') ?? 'NULL') ,
            'price' => 'nullable|numeric|min:0',
            'cost' => 'nullable|numeric|min:0',
            'stock' => 'nullable|integer|min:0',
            'category_id' => 'nullable|uuid|exists:categories,id',
        ];
    }
}
