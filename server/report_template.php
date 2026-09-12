<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title><?php echo htmlspecialchars($data['reportTitle']); ?></title>
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
      <h1><?php echo htmlspecialchars($data['company']); ?></h1>
      <h2><?php echo htmlspecialchars($data['reportTitle']); ?></h2>
      <div class="meta">Generated: <?php echo htmlspecialchars($data['generated_at']); ?></div>
    </div>

    <table>
      <thead>
        <tr><th>Metric</th><th>Value</th></tr>
      </thead>
      <tbody>
        <?php foreach ($data['rows'] as $r): ?>
          <tr>
            <td><?php echo htmlspecialchars($r['label']); ?></td>
            <td><?php echo htmlspecialchars($r['value']); ?></td>
          </tr>
        <?php endforeach; ?>
      </tbody>
    </table>
  </body>
</html>
