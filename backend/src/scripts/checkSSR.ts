async function testSSR() {
  try {
    const res = await fetch('http://localhost:4501/');
    console.log('Status:', res.status);
    const text = await res.text();
    console.log('HTML preview (first 200 chars):', text.substring(0, 200));
  } catch (e: any) {
    console.error('Fetch error:', e.message);
  }
}
testSSR();
