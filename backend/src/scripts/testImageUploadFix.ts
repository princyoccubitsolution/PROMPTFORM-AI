import http from 'http';

function testImageUpload() {
  const boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW';
  
  // 1x1 mock PNG image
  const mockPngBuffer = Buffer.from([
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
    0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4,
    0x89, 0x00, 0x00, 0x00, 0x0A, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00,
    0x05, 0x00, 0x01, 0x0D, 0x0A, 0x2D, 0xB4, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE,
    0x42, 0x60, 0x82
  ]);

  const promptText = 'Extract fields and generate a structured form (Form type: auto. Option layout: horizontal)';

  let body = '';
  body += `--${boundary}\r\n`;
  body += `Content-Disposition: form-data; name="prompt"\r\n\r\n${promptText}\r\n`;
  body += `--${boundary}\r\n`;
  body += `Content-Disposition: form-data; name="file"; filename="patient_dental_intake.png"\r\n`;
  body += `Content-Type: image/png\r\n\r\n`;

  const headerBuffer = Buffer.from(body, 'utf-8');
  const footerBuffer = Buffer.from(`\r\n--${boundary}--\r\n`, 'utf-8');
  const payloadBuffer = Buffer.concat([headerBuffer, mockPngBuffer, footerBuffer]);

  const options = {
    hostname: '127.0.0.1',
    port: 5050,
    path: '/api/ai/generate',
    method: 'POST',
    headers: {
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
      'Content-Length': payloadBuffer.length
    }
  };

  const req = http.request(options, (res) => {
    console.log(`STATUS: ${res.statusCode}`);
    let responseText = '';
    res.setEncoding('utf8');
    res.on('data', (chunk) => responseText += chunk);
    res.on('end', () => {
      try {
        const json = JSON.parse(responseText);
        const form = json.form || json;
        console.log('FORM TITLE:', form.title);
        console.log('QUESTIONS COUNT:', form.questions?.length);
        console.log('QUESTION LABELS:', form.questions?.map((q: any) => q.label));
        
        const isDataStructures = form.questions?.some((q: any) => 
          q.label?.toLowerCase().includes('singly linked list') || 
          q.label?.toLowerCase().includes('data structure')
        );

        if (isDataStructures) {
          console.error('\n❌ FAIL: Form still generated static Data Structures 10-Question quiz!');
        } else {
          console.log('\n✅ SUCCESS: Form generated custom dynamic questions matching image/prompt!');
        }
      } catch (e: any) {
        console.log('RAW RESPONSE:', responseText.substring(0, 500));
      }
    });
  });

  req.on('error', (e) => {
    console.error(`Request error: ${e.message}`);
  });

  req.write(payloadBuffer);
  req.end();
}

testImageUpload();
