// Reads a photographed receipt and returns structured warranty fields.
// Requires the caller to be signed in so the Anthropic key can't be abused
// by anonymous requests, and validates the payload before spending tokens.
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Image types the Claude API accepts; anything else is rejected up front.
const ALLOWED_MEDIA_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

// 5MB image, base64-encoded (~4/3 overhead), with a little slack.
const MAX_BASE64_LENGTH = 7_200_000;

// Per-user monthly abuse ceiling. The free-tier limit of 3 is enforced on the
// client (which knows the RevenueCat entitlement); this only backstops runaway
// cost from a client that ignores it.
const SCAN_CEILING = 50;

const EXTRACTION_SCHEMA = {
  type: 'object',
  properties: {
    product_name: { type: 'string' },
    brand: { type: 'string' },
    purchase_date: { type: 'string', description: 'Date in YYYY-MM-DD format' },
    purchase_price: { type: 'number' },
    store: { type: 'string' },
    serial_number: { type: 'string' },
    warranty_duration_months: {
      type: 'number',
      description: 'Warranty length in months. Guess a typical value for the product type if the receipt does not state one.',
    },
    category: {
      type: 'string',
      enum: ['electronics', 'appliances', 'furniture', 'automotive', 'clothing', 'tools', 'sports', 'jewelry', 'service', 'other'],
      description:
        "Use 'service' when the photo is a paid invoice or work order for a service/repair (e.g. an HVAC or appliance repair bill) rather than a receipt for a purchased product.",
    },
    warranty_type: {
      type: 'string',
      enum: ['manufacturer', 'extended', 'store'],
      description:
        'Only when evident: extended or store only if the receipt shows a purchased protection plan; otherwise manufacturer.',
    },
  },
  required: ['product_name'],
  additionalProperties: false,
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405, headers: corsHeaders });
  }

  // Set once a quota slot has been consumed, so the catch can give it back.
  let refund: (() => Promise<void>) | null = null;

  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
    }

    // Validate the payload BEFORE touching the quota so malformed requests
    // never consume a slot.
    const { image, media_type } = await req.json();
    if (typeof image !== 'string' || typeof media_type !== 'string') {
      return Response.json({ error: 'Missing image or media_type' }, { status: 400, headers: corsHeaders });
    }
    if (!ALLOWED_MEDIA_TYPES.includes(media_type)) {
      return Response.json({ error: 'Unsupported image type' }, { status: 400, headers: corsHeaders });
    }
    if (image.length > MAX_BASE64_LENGTH) {
      return Response.json({ error: 'Image too large' }, { status: 413, headers: corsHeaders });
    }
    if (!/^[A-Za-z0-9+/=]+$/.test(image)) {
      return Response.json({ error: 'Invalid image encoding' }, { status: 400, headers: corsHeaders });
    }

    // Service-role client owns the scan-usage counter (clients can't write it).
    const service = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    const period = new Date().toISOString().slice(0, 7); // YYYY-MM

    // Atomic check-and-increment (see 20260719050000_atomic_scan_counter.sql).
    // Fail CLOSED on counter errors: this counter is the cost cap, so a broken
    // counter must block spend, not allow it unmetered.
    const { data: allowed, error: consumeError } = await service.rpc('try_consume_scan', {
      p_user_id: user.id,
      p_period: period,
      p_ceiling: SCAN_CEILING,
    });
    if (consumeError) {
      console.error('scan counter unavailable', consumeError);
      return Response.json({ error: 'Try again shortly' }, { status: 503, headers: corsHeaders });
    }
    if (allowed !== true) {
      return Response.json({ error: 'Monthly scan limit reached' }, { status: 429, headers: corsHeaders });
    }
    // From here on the slot is spent; refund it on any failed extraction so
    // bad photos never burn quota (the client's free-tier gate reads this
    // same counter). Best effort.
    refund = () =>
      service.rpc('refund_scan', { p_user_id: user.id, p_period: period }).then(
        () => {},
        (e) => console.error('scan refund failed', e)
      );

    const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': Deno.env.get('ANTHROPIC_API_KEY')!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-5',
        max_tokens: 1024,
        thinking: { type: 'disabled' },
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type, data: image } },
            {
              type: 'text',
              text: "Extract the warranty-relevant details from this photo. It is usually a receipt or warranty card for a purchased product, but it may instead be a paid invoice or work order for a service or repair (e.g. an HVAC, appliance, or auto repair bill) that includes its own warranty on the work, often stated as something like \"30 day warranty on labor\" or \"90 day guarantee on parts and labor.\" If it is a service invoice, set category to 'service', put a short description of the work done in product_name (e.g. \"AC Repair\"), and put the name of the company that performed the service in store. Only fill in fields you can actually read; leave the rest out. Read the store or service-provider name and the transaction date carefully; when several dates appear (printed date, return-by date, delivery date, service-completion date), prefer the purchase or transaction date.",
            },
          ],
        }],
        output_config: {
          format: { type: 'json_schema', schema: EXTRACTION_SCHEMA },
        },
      }),
    });

    if (!anthropicResponse.ok) {
      // Don't leak upstream error bodies to the client.
      console.error('Anthropic request failed', anthropicResponse.status, await anthropicResponse.text());
      await refund();
      return Response.json({ error: 'Extraction request failed' }, { status: 502, headers: corsHeaders });
    }

    const message = await anthropicResponse.json();
    if (message.stop_reason === 'refusal') {
      await refund();
      return Response.json({ error: "Couldn't read this receipt" }, { status: 422, headers: corsHeaders });
    }

    const textBlock = message.content?.find((b: { type: string }) => b.type === 'text');
    const extracted = textBlock ? JSON.parse(textBlock.text) : null;
    if (!extracted) {
      await refund();
      return Response.json({ error: "Couldn't read this receipt" }, { status: 422, headers: corsHeaders });
    }

    return Response.json({ extracted }, { headers: corsHeaders });
  } catch (error) {
    console.error('extract-receipt error', error);
    if (refund) await refund();
    return Response.json({ error: 'Internal error' }, { status: 500, headers: corsHeaders });
  }
});
