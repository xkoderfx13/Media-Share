param(
  [string]$name = "مختبر",
  [string]$message = "https://youtu.be/siAXZDt-lIs",
  [string]$amount = "5"
)
$body = @{name=$name;message=$message;amount=$amount;formatted_amount="`$$amount"} | ConvertTo-Json
try {
  $r = Invoke-RestMethod -Uri "http://127.0.0.1:10010/donation" -Method Post -Body $body -ContentType "application/json"
  Write-Host "✅ Test donation sent! Status: $($r.status)"
} catch {
  Write-Host "❌ Error: $($_.Exception.Message)"
}
