<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <title>Payslip</title>
    <style>
      body { font-family: DejaVu Sans, sans-serif; font-size: 12px; }
      .header { text-align: center; margin-bottom: 20px }
      .meta { margin-bottom: 10px }
      .table { width: 100%; border-collapse: collapse }
      .table th, .table td { border: 1px solid #ddd; padding: 6px }
      .right { text-align: right }
    </style>
  </head>
  <body>
    <div class="header">
      <h2>Horoma Rice Mill</h2>
      <div>Payslip for {{ $period }}</div>
    </div>

    <div class="meta">
      <strong>Employee:</strong> {{ $employee->first_name ?? $employee->name ?? 'N/A' }} {{ $employee->last_name ?? '' }}<br />
      <strong>ID:</strong> {{ $employee->id }}
    </div>

    <table class="table">
      <thead>
        <tr>
          <th>Description</th>
          <th class="right">Amount</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Basic Salary</td>
          <td class="right">{{ $pay['basic'] }}</td>
        </tr>
        <tr>
          <td>Bonus</td>
          <td class="right">{{ $pay['bonus'] }}</td>
        </tr>
        <tr>
          <td>Allowances</td>
          <td class="right">{{ $pay['allowances'] }}</td>
        </tr>
        <tr>
          <td>Deductions</td>
          <td class="right">{{ $pay['deductions'] }}</td>
        </tr>
        <tr>
          <th>Net Pay</th>
          <th class="right">{{ $net }}</th>
        </tr>
      </tbody>
    </table>

  </body>
</html>
