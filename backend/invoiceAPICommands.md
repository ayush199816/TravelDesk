# Invoice Generation API Commands

## Prerequisites
- Backend server running on http://localhost:5000
- Valid JWT token (get from login)
- Existing quote in the system

## Step 1: Get Your JWT Token
```bash
# Login to get token
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "your-email@example.com", "password": "your-password"}'
```

Copy the `token` value from the response.

## Step 2: Get Available Quotes
```bash
# Replace YOUR_TOKEN_HERE with your actual JWT token
curl -X GET http://localhost:5000/api/quotes \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

Copy the `_id` of any quote you want to convert.

## Step 3: Mark Quote as Converted
```bash
# Replace QUOTE_ID and YOUR_TOKEN
curl -X POST http://localhost:5000/api/quotes/QUOTE_ID/convert \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{}'
```

## Step 4: Create Invoice
```bash
# Replace QUOTE_ID and YOUR_TOKEN
curl -X POST http://localhost:5000/api/invoices \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "quoteId": "QUOTE_ID",
    "totalCycles": 4,
    "firstCycleAmount": 20000,
    "notes": "Test invoice generation",
    "terms": "Payment due within 30 days"
  }'
```

## Step 5: Get Invoice Details
```bash
# Replace INVOICE_ID and YOUR_TOKEN
curl -X GET http://localhost:5000/api/invoices/INVOICE_ID \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## Step 6: Download Invoice PDF
```bash
# Replace INVOICE_ID and YOUR_TOKEN
curl -X GET http://localhost:5000/api/invoices/INVOICE_ID/pdf \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  --output invoice.pdf
```

## Step 7: Mark Payment Cycle as Paid
```bash
# Replace INVOICE_ID, CYCLE_NUMBER, and YOUR_TOKEN
curl -X POST http://localhost:5000/api/invoices/INVOICE_ID/pay-cycle \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "cycleNumber": 1,
    "utrNumber": "UTR123456789"
  }'
```

## Step 8: Verify UTR Number
```bash
# Replace INVOICE_ID, CYCLE_NUMBER, and YOUR_TOKEN
curl -X PUT http://localhost:5000/api/invoices/INVOICE_ID/verify-utr \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "cycleNumber": 1,
    "utrVerified": true
  }'
```

## Quick Start Example

1. **First, get a quote ID from Step 2**
2. **Then run Step 3 to convert it**
3. **Then run Step 4 to create invoice**
4. **Then run Step 6 to download PDF**

## Payment Cycle Calculation Example

If you have:
- Total Amount: ₹66,584
- First Cycle: ₹20,000
- Total Cycles: 4

The system will calculate:
- Remaining Amount: ₹66,584 - ₹20,000 = ₹46,584
- Cycle Amount: ₹46,584 ÷ (4-1) = ₹15,528 per cycle

Payment Schedule:
- Cycle 1: ₹20,000 (first payment)
- Cycle 2: ₹15,528
- Cycle 3: ₹15,528
- Cycle 4: ₹15,528

## Testing Tips

1. **Start with a small quote** to test the flow
2. **Check each step's response** for success/error messages
3. **Use browser dev tools** to inspect API responses
4. **Verify invoice calculations** match your expectations
5. **Test PDF download** by opening the generated file
