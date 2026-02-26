const PORT = Number(process.env.PORT) || 8080;

const server = Bun.serve({
  port: PORT,
  fetch(req) {
    const url = new URL(req.url);

    if (url.pathname === '/health' && req.method === 'GET') {
      return Response.json({ status: 'idle', uptime: process.uptime() });
    }

    return Response.json({ error: 'Not found' }, { status: 404 });
  },
});

console.log(`Sandbox server listening on port ${server.port}`);
