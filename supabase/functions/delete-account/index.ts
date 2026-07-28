// Deletes the calling user for real: stored documents and avatar, then the
// auth user. Contract rows go with the FK cascade.
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

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

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Remove every stored object under this user's folder, page by page.
    // Purge failures are logged but never block the deletion itself: Apple
    // requires in-app account deletion to actually work, and any orphaned
    // objects sit in private buckets no client role can reach.
    const purgeFolder = async (bucket: string) => {
      for (;;) {
        const { data: files, error: listError } = await admin.storage
          .from(bucket)
          .list(user.id, { limit: 100 });
        if (listError) {
          console.error('storage purge list failed', bucket, user.id, listError);
          break;
        }
        if (!files?.length) break;

        const paths = files.map((f) => `${user.id}/${f.name}`);
        const { error: removeError } = await admin.storage.from(bucket).remove(paths);
        if (removeError) {
          console.error('storage purge remove failed', bucket, user.id, removeError);
          break;
        }
        if (files.length < 100) break;
      }
    };
    await purgeFolder('documents');
    await purgeFolder('avatars');

    const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
    if (deleteError) {
      // Log the real reason; don't hand internals to the caller.
      console.error('deleteUser failed', user.id, deleteError);
      return Response.json({ error: 'Account deletion failed' }, { status: 500, headers: corsHeaders });
    }

    return Response.json({ success: true }, { headers: corsHeaders });
  } catch (error) {
    console.error('delete-account error', error);
    return Response.json({ error: 'Internal error' }, { status: 500, headers: corsHeaders });
  }
});
