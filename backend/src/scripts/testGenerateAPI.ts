import http from 'http';

function testApi() {
  const data = JSON.stringify({
    prompt: "Create a GTA V gaming quiz with 10 questions, set 10 minutes timer, anti-cheat, add score marks, and 4 options with exact correct answers"
  });

  const options = {
    hostname: '127.0.0.1',
    port: 5050,
    path: '/api/ai/generate',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(data)
    }
  };

  const req = http.request(options, (res) => {
    console.log(`STATUS: ${res.statusCode}`);
    let body = '';
    res.setEncoding('utf8');
    res.on('data', (chunk) => body += chunk);
    res.on('end', () => {
      console.log('BODY:', body.substring(0, 1500));
    });
  });

  req.on('error', (e) => {
    console.error(`problem with request: ${e.message}`);
  });

  req.write(data);
  req.end();
}

testApi();
