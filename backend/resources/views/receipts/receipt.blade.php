<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <title>Receipt</title>
    <style>
      body { font-family: DejaVu Sans, sans-serif; font-size: 12px; }
      .header { text-align: center; margin-bottom: 10px }
      table { width: 100%; border-collapse: collapse }
      th, td { border-bottom: 1px solid #ddd; padding: 6px }
      .right { text-align: right }
    </style>
  </head>
  <body>
    @php
      $constructionMatch = function($name = '') {
          $haystack = strtolower((string) $name);
          return preg_match('/(construction|brick|tofali|roof|cement|block|masonry|concrete|tile|pipe|steel|board|sheet)/', $haystack) === 1;
      };
      $hasConstruction = collect($data['items'] ?? [])->contains(function ($it) use ($constructionMatch) {
          $label = $it['label'] ?? ($it['name'] ?? '');
          return $constructionMatch($label);
      });
      $displayUnit = $hasConstruction ? 'pieces' : 'kg';
    @endphp
    <div class="header">
      <h3>{{ htmlspecialchars($data['company'] ?? config('app.name', 'Horoma Rice Mill')) }}</h3>
      <div>Receipt - {{ htmlspecialchars($data['generated_at']) }}</div>
      @if($data['reference'])
        <div>Reference: {{ htmlspecialchars($data['reference']) }}</div>
      @endif
    </div>

    <table>
      <thead>
        <tr><th>Item</th><th>Units Sold</th><th>Package</th><th class="right">Unit Price</th><th class="right">Calculation</th><th class="right">Amount</th></tr>
      </thead>
      <tbody>
        @foreach($data['items'] ?? [] as $it)
          @php
            $itemLabel = $it['label'] ?? ($it['name'] ?? 'Item');
            $qty = (int) ($it['qty'] ?? 1);
            $unitPrice = $it['unit_price'] ?? ($it['price'] ?? 'Tshs 0.00');
            $lineTotal = $it['line_total'] ?? 'Tshs 0.00';
            $packageSize = (int) ($it['package_size'] ?? 0);
            $itemUnit = $constructionMatch($itemLabel) ? 'pieces' : 'kg';
          @endphp
          <tr>
            <td>{{ htmlspecialchars($itemLabel) }}</td>
            <td>{{ htmlspecialchars($qty) }}</td>
            <td>{{ $packageSize > 0 ? htmlspecialchars($packageSize . ' ' . $itemUnit) : 'Not recorded' }}</td>
            <td class="right">{{ htmlspecialchars($unitPrice) }}</td>
            <td class="right">{{ $qty }} × {{ htmlspecialchars($unitPrice) }}</td>
            <td class="right">{{ htmlspecialchars($lineTotal) }}</td>
          </tr>
        @endforeach
      </tbody>
    </table>

    <div style="margin-top:10px;">
      <div class="right">Units sold: {{ htmlspecialchars((int) $data['total_units']) }}</div>
      <div class="right">Total {{ $displayUnit }}: {{ htmlspecialchars(number_format((float) $data['total_kg'], 0)) }} {{ $displayUnit }}</div>
      <div class="right"><strong>Total: {{ htmlspecialchars($data['total']) }}</strong></div>
      <div class="right">Payment: {{ htmlspecialchars($data['payment']) }}</div>
      @if($data['customer'])
        <div>Customer: {{ htmlspecialchars($data['customer']) }}</div>
      @endif
    </div>
  </body>
</html>
