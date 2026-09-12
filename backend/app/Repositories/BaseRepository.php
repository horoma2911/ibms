<?php

namespace App\Repositories;

use Illuminate\Database\Eloquent\Model;

abstract class BaseRepository
{
    protected Model $model;

    public function all(array $columns = ['*'])
    {
        return $this->model->newQuery()->get($columns);
    }

    public function find($id)
    {
        return $this->model->newQuery()->find($id);
    }

    public function create(array $data)
    {
        return $this->model->newQuery()->create($data);
    }

    public function update($id, array $data)
    {
        $record = $this->find($id);
        if (! $record) {
            return null;
        }

        $record->fill($data);
        $record->save();

        return $record;
    }

    public function delete($id): bool
    {
        $record = $this->find($id);
        if (! $record) {
            return false;
        }

        return (bool) $record->delete();
    }
}
