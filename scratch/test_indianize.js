const http = require('http');

async function test() {
  // 1. Test feedback endpoint (public)
  const feedbackRes = await fetch('http://localhost:3000/api/feedback').then(r => r.json());
  console.log('Feedback Count:', feedbackRes.reviews ? feedbackRes.reviews.length : 0);
  console.log('Feedback Sample:', feedbackRes.reviews ? feedbackRes.reviews.slice(0, 3).map(r => ({ name: r.name, role: r.role, title: r.title })) : []);

  // 2. Test landlord login
  const loginRes = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'landlord@rentroll.com', password: 'Password123!' })
  }).then(r => r.json());

  console.log('Landlord Login Success:', loginRes.success);
  console.log('Landlord User:', loginRes.user ? loginRes.user.name : null);

  const token = loginRes.token;

  // 3. Test landlord properties
  const propRes = await fetch('http://localhost:3000/api/properties', {
    headers: { 'Authorization': `Bearer ${token}` }
  }).then(r => r.json());

  console.log('Properties:', propRes.data.map(p => ({ name: p.name, city: p.city, rent: p.monthly_rent_total })));

  // 4. Test tenant login
  const tenantLoginRes = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'tenant@rentroll.com', password: 'Password123!' })
  }).then(r => r.json());

  console.log('Tenant Login Success:', tenantLoginRes.success);
  console.log('Tenant User:', tenantLoginRes.user ? tenantLoginRes.user.name : null);

  // 5. Test tenant stats overview
  const tenantStats = await fetch('http://localhost:3000/api/dashboard/stats', {
    headers: { 'Authorization': `Bearer ${tenantLoginRes.token}` }
  }).then(r => r.json());

  console.log('Tenant Stats Overview:', {
    role: tenantStats.data.role,
    monthlyRent: tenantStats.data.monthlyRent,
    unit: tenantStats.data.activeLease?.unitName,
    property: tenantStats.data.activeLease?.propertyName,
    address: tenantStats.data.activeLease?.address
  });
}

test().catch(console.error);
