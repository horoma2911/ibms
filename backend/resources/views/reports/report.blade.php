<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>{{ htmlspecialchars($data['reportTitle']) }}</title>
    <style>
      body { font-family: Arial, sans-serif; color: #222; }
      .header { text-align: center; margin-bottom: 20px; }
      .meta { font-size: 12px; color: #666; margin-bottom: 12px; }
      table { width: 100%; border-collapse: collapse; margin-top: 12px; }
      th, td { padding: 8px 10px; border: 1px solid #e6e6e6; }
      th { background: #f6f6f6; text-align: left; }
    </style>
  </head>
  <body>
    <div class="header">
      <h1>{{ htmlspecialchars($data['company'] ?? 'Horoma Rice Mill') }}</h1>
      <h2>{{ htmlspecialchars($data['reportTitle']) }}</h2>
      <div class="meta">Generated: {{ htmlspecialchars($data['generated_at']) }}</div>
    </div>

    <table>
      <thead>
        <tr><th>Metric</th><th>Value</th></tr>
      </thead>
      <tbody>
        @foreach ($data['rows'] as $r)
          <tr>
            <td>{{ htmlspecialchars($r['label']) }}</td>
            <td>{{ htmlspecialchars($r['value']) }}</td>
          </tr>
        @endforeach
      </tbody>
    </table>
  </body>
</html>
