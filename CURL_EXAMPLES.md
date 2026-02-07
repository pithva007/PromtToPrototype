# Safe-Scan Lite - Sample cURL Requests

## Health Check
curl http://localhost:3001/health

## Decode QR Code (Success Case)
# First, you'll need a QR code image. You can generate one at: https://www.qr-code-generator.com/
# Replace /path/to/qr-code.png with your actual file path

curl -X POST http://localhost:3001/api/qr/decode \
  -F "file=@/path/to/qr-code.png"

## Expected Response (URL)
# {
#   "success": true,
#   "decodedText": "https://example.com",
#   "isUrl": true,
#   "normalizedUrl": "https://example.com",
#   "error": null
# }

## Expected Response (Text)
# {
#   "success": true,
#   "decodedText": "Hello World",
#   "isUrl": false,
#   "normalizedUrl": null,
#   "error": null
# }

## Test Invalid File Type
curl -X POST http://localhost:3001/api/qr/decode \
  -F "file=@/path/to/document.txt"

## Expected Response
# {
#   "success": false,
#   "decodedText": null,
#   "isUrl": false,
#   "normalizedUrl": null,
#   "error": {
#     "code": "INVALID_FILE_TYPE",
#     "message": "Invalid file type. Only PNG, JPG, and WebP are allowed."
#   }
# }

## Test No File Uploaded
curl -X POST http://localhost:3001/api/qr/decode

## Expected Response
# {
#   "success": false,
#   "decodedText": null,
#   "isUrl": false,
#   "normalizedUrl": null,
#   "error": {
#     "code": "NO_FILE_UPLOADED",
#     "message": "No file uploaded"
#   }
# }

## Test Image Without QR Code
# Upload a regular photo without a QR code
curl -X POST http://localhost:3001/api/qr/decode \
  -F "file=@/path/to/regular-photo.jpg"

## Expected Response
# {
#   "success": false,
#   "decodedText": null,
#   "isUrl": false,
#   "normalizedUrl": null,
#   "error": {
#     "code": "QR_NOT_FOUND",
#     "message": "No QR code found in image"
#   }
# }
