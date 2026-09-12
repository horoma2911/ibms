<?php
namespace App\Services;

use App\Repositories\ProductRepository;

class ProductService
{
    protected ProductRepository $repo;

    public function __construct(ProductRepository $repo)
    {
        $this->repo = $repo;
    }

    public function list(array $filters = [], int $perPage = 15)
    {
        // business rules, filtering, sorting
        return $this->repo->paginate($perPage);
    }

    public function create(array $data)
    {
        // do domain validation/transformations here
        return $this->repo->create($data);
    }

    public function update($id, array $data)
    {
        return $this->repo->update($id, $data);
    }

    public function delete($id)
    {
        return $this->repo->delete($id);
    }
}
