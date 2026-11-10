fetch('http://localhost:3000/api/internships', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    title: 'Web Developer Intern',
    company: 'Google',
    location: 'Remote',
    stipend: '10000',
    type: 'Remote'
  })
}).then(r => r.json()).then(d => console.log('Ho gaya!', d));