(function () {
  const SUPABASE_PROJECT_URL = 'https://cuuzsbhpjmjbbnghtiny.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN1dXpzYmhwam1qYmJuZ2h0aW55Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwMTIzNzIsImV4cCI6MjA5MzU4ODM3Mn0.PyPn6Dy85vXhzQWwASI8btWJJHoe65XTjn8nygTbiMw';

  async function rpc(functionName, params) {
    const response = await fetch(SUPABASE_PROJECT_URL + '/rest/v1/rpc/' + functionName, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: 'Bearer ' + SUPABASE_ANON_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(params || {})
    });

    const text = await response.text();
    let data = null;

    try {
      data = text ? JSON.parse(text) : null;
    } catch (error) {
      data = text;
    }

    if (!response.ok) {
      const message = data && data.message ? data.message : 'Error Supabase RPC';
      const err = new Error(message);
      err.status = response.status;
      err.data = data;
      throw err;
    }

    return data;
  }

  window.SazzuSupabase = {
    projectUrl: SUPABASE_PROJECT_URL,
    rpc
  };
})();
