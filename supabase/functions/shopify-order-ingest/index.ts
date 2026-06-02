Deno.serve(async (req) => {
  if (req.method === "GET") {
    return new Response(
      JSON.stringify({
        status: "ok",
        function: "shopify-order-ingest",
        message: "Protocol Data webhook endpoint ready"
      }),
      {
        headers: {
          "Content-Type": "application/json"
        }
      }
    );
  }

  return new Response(
    JSON.stringify({
      status: "pending",
      message: "POST ingest logic will be added after deploy without JWT is confirmed."
    }),
    {
      headers: {
        "Content-Type": "application/json"
      }
    }
  );
});
