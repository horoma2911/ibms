How to enable PDF reports with dompdf

1. Install dependencies using Composer in the project root:

   composer require dompdf/dompdf

2. Run a local PHP server from the project root (so `/server` is reachable):

   php -S localhost:8000

3. Open the reports page at:

   http://localhost:8000/pages/reports.html

4. Click "Export PDF" to generate and download the report as PDF.

Note: If you deploy to production, ensure the `vendor` folder is present and webserver routing allows access to `/server/generate_report.php`.
