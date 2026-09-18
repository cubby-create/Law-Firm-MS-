const SUPABASE_URL = 'https://bbsperwjpgmyixpwzmog.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_MSzcgYV5-4kFVz-F21X2wg__N-z4ISI';

window.calAdvocSupabase = window.supabase && window.supabase.createClient
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

const supabaseClient = window.calAdvocSupabase;

function isTrialExpired(profile = null) {
  if (!profile || profile.account_type !== 'trial') {
    return false;
  }

  if (!profile.trial_expires_at) {
    return false;
  }

  const expiresAt = new Date(profile.trial_expires_at).getTime();
  return Number.isFinite(expiresAt) && Date.now() > expiresAt;
}

async function getCurrentUserProfile() {
  try {
    const { data: sessionData } = await supabaseClient.auth.getSession();
    const userId = sessionData?.session?.user?.id;

    if (!userId) {
      return { ok: false, error: 'User is not signed in.' };
    }

    const { data, error } = await supabaseClient
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      return { ok: false, error };
    }

    return { ok: true, data: data || null };
  } catch (error) {
    return { ok: false, error };
  }
}

async function saveFirmData(payload = {}) {
  try {
    if (!supabaseClient || !supabaseClient.auth) {
      return { ok: false, error: 'Supabase client is not available.' };
    }

    const { data: sessionData } = await supabaseClient.auth.getSession();
    const userId = sessionData?.session?.user?.id;

    if (!userId) {
      return { ok: false, error: 'User is not signed in.' };
    }

    const { data, error } = await supabaseClient.from('firm_data').insert([
      {
        user_id: userId,
        data: payload,
        created_at: new Date().toISOString(),
      },
    ]);

    if (error) {
      return { ok: false, error };
    }

    return { ok: true, data };
  } catch (error) {
    return { ok: false, error };
  }
}

async function saveProfile(profile = {}) {
  try {
    if (!supabaseClient || !supabaseClient.auth) {
      return { ok: false, error: 'Supabase client is not available.' };
    }

    const { data: sessionData } = await supabaseClient.auth.getSession();
    const userId = sessionData?.session?.user?.id;

    if (!userId) {
      return { ok: false, error: 'User is not signed in.' };
    }

    const payload = {
      id: userId,
      full_name: profile.full_name || '',
      firm_name: profile.firm_name || '',
      email: profile.email || '',
      account_type: profile.account_type || 'trial',
      trial_expires_at: profile.trial_expires_at || null,
      avatar_url: profile.avatar_url || null,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabaseClient.from('profiles').upsert(payload, { onConflict: 'id' });

    if (error) {
      return { ok: false, error };
    }

    return { ok: true, data };
  } catch (error) {
    return { ok: false, error };
  }
}
